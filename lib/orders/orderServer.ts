import "server-only";

import type { Game, Order, Prisma, Round } from "@prisma/client";
import {
  mapOrder,
  parseOptionalCompoundRole,
  parseOptionalCountryId,
  parseOptionalOrderActionType,
  parseOptionalRegionId,
  parseOptionalUnitType,
  parseOrderActionType,
  parseOrderStatus,
  parseRegionId,
  parseUnitType,
} from "@/lib/api/mappers";
import type { OrderDTO } from "@/lib/api/types";
import { createAmphibiousChildInputs } from "@/lib/orders/orderPlanning";
import type { OrderPayload, OrderMutationInput, ValidationOrder } from "@/lib/validation/orderValidation";
import {
  MAX_COUNTABLE_ORDERS,
  countCountableOrders,
  validateOrdersLightweight,
} from "@/lib/validation/orderValidation";
import type { CountryId, OrderStatus } from "@/rules-engine/types";

export type CurrentGameRound = {
  game: Game;
  round: Round;
  maxCountableOrders: number;
};

export type CreateOrdersOptions = {
  gameId: string;
  roundId: string;
  countryId: CountryId;
  submittedByPlayerId: string;
  status: OrderStatus;
  clientMutationId?: string;
};

export async function getCurrentGameRound(tx: Prisma.TransactionClient, gameId: string): Promise<CurrentGameRound | null> {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    include: { ruleset: true },
  });

  if (!game) {
    return null;
  }

  const round = await tx.round.findUnique({
    where: {
      gameId_number: {
        gameId: game.id,
        number: game.currentRoundNumber,
      },
    },
  });

  if (!round) {
    return null;
  }

  return {
    game,
    round,
    maxCountableOrders: getMaxCountableOrders(game.ruleset.config),
  };
}

export async function validateOrderInputsForRound(
  tx: Prisma.TransactionClient,
  options: {
    gameId: string;
    roundId: string;
    countryId: CountryId;
    orders: readonly OrderMutationInput[];
    maxCountableOrders?: number;
    includeExistingOrders?: boolean;
    excludeOrderIds?: readonly string[];
  },
) {
  const [unitStacks, controls, existingOrders] = await Promise.all([
    tx.unitStack.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.roundId,
        countryId: options.countryId,
        status: "active",
      },
      select: {
        countryId: true,
        regionId: true,
        unitType: true,
        count: true,
        status: true,
      },
    }),
    tx.regionControl.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.roundId,
      },
      select: {
        regionId: true,
        countryId: true,
      },
    }),
    options.includeExistingOrders
      ? tx.order.findMany({
          where: {
            gameId: options.gameId,
            roundId: options.roundId,
            countryId: options.countryId,
            status: { notIn: ["cancelled", "resolved"] },
            id: options.excludeOrderIds?.length ? { notIn: [...options.excludeOrderIds] } : undefined,
          },
          select: validationOrderSelect,
        })
      : Promise.resolve([]),
  ]);

  const validationOrders = options.orders.map((order) => toValidationOrder(order, options.countryId));
  const existingValidationOrders = existingOrders.map((order) =>
    toValidationOrder(selectedOrderToMutationInput(order), options.countryId),
  );

  return validateOrdersLightweight(validationOrders, {
    countryId: options.countryId,
    unitStacks: unitStacks.map((stack) => ({
      countryId: options.countryId,
      regionId: parseRegionId(stack.regionId),
      unitType: parseUnitType(stack.unitType),
      count: stack.count,
      status: stack.status,
    })),
    controls: controls.map((control) => ({
      regionId: parseRegionId(control.regionId),
      countryId: parseOptionalCountryId(control.countryId),
    })),
    existingOrders: existingValidationOrders,
    maxCountableOrders: options.maxCountableOrders,
  });
}

export async function createOrdersForInputs(
  tx: Prisma.TransactionClient,
  inputs: readonly OrderMutationInput[],
  options: CreateOrdersOptions,
): Promise<OrderDTO[]> {
  const createdParentOrders: Order[] = [];

  for (const input of inputs) {
    if (input.parentOrderId) {
      continue;
    }

    if (input.actionType === "amphibious_attack") {
      const parent = await createOrderRow(tx, input, {
        ...options,
        countsTowardLimit: true,
        parentOrderId: null,
        compoundRole: null,
      });
      createdParentOrders.push(parent);

      const [navyChild, armyChild] = createAmphibiousChildInputs(input);
      await createOrderRow(tx, navyChild, {
        ...options,
        countsTowardLimit: false,
        parentOrderId: parent.id,
        compoundRole: "naval_carrier",
      });
      await createOrderRow(tx, armyChild, {
        ...options,
        countsTowardLimit: false,
        parentOrderId: parent.id,
        compoundRole: "land_payload",
      });
    } else {
      const created = await createOrderRow(tx, input, {
        ...options,
        countsTowardLimit: input.countsTowardLimit ?? true,
        parentOrderId: null,
        compoundRole: input.compoundRole ?? null,
      });
      createdParentOrders.push(created);
    }
  }

  return loadOrdersByIds(tx, createdParentOrders.map((order) => order.id));
}

export async function cancelEditableOrdersForCountry(
  tx: Prisma.TransactionClient,
  options: {
    gameId: string;
    roundId: string;
    countryId: CountryId;
  },
) {
  const editableOrders = await tx.order.findMany({
    where: {
      gameId: options.gameId,
      roundId: options.roundId,
      countryId: options.countryId,
      status: { in: ["draft", "submitted", "submitted_pending", "invalid"] },
    },
    select: { id: true },
  });
  const editableIds = editableOrders.map((order) => order.id);

  if (editableIds.length === 0) {
    return;
  }

  await tx.order.updateMany({
    where: {
      OR: [{ id: { in: editableIds } }, { parentOrderId: { in: editableIds } }],
    },
    data: {
      status: "cancelled",
    },
  });
}

export async function loadCurrentCountryOrders(
  tx: Prisma.TransactionClient,
  options: {
    gameId: string;
    roundId: string;
    countryId: CountryId;
  },
) {
  const orders = await tx.order.findMany({
    where: {
      gameId: options.gameId,
      roundId: options.roundId,
      countryId: options.countryId,
      parentOrderId: null,
      status: { not: "cancelled" },
    },
    include: orderIncludeChildren,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return orders.map(mapOrder);
}

export async function loadOrdersByIds(tx: Prisma.TransactionClient, orderIds: readonly string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const orders = await tx.order.findMany({
    where: { id: { in: [...orderIds] } },
    include: orderIncludeChildren,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const indexById = new Map(orderIds.map((id, index) => [id, index]));
  return orders
    .map(mapOrder)
    .sort((left, right) => (indexById.get(left.id) ?? 0) - (indexById.get(right.id) ?? 0));
}

export async function duplicatePreviousRoundOrders(
  tx: Prisma.TransactionClient,
  options: {
    gameId: string;
    currentRoundId: string;
    sourceRoundId: string;
    countryId: CountryId;
    submittedByPlayerId: string;
    clientMutationId?: string;
    maxCountableOrders: number;
  },
) {
  const [currentOrders, sourceParents, unitStacks, controls] = await Promise.all([
    tx.order.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.currentRoundId,
        countryId: options.countryId,
        status: { notIn: ["cancelled", "resolved"] },
      },
      select: validationOrderSelect,
    }),
    tx.order.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.sourceRoundId,
        countryId: options.countryId,
        parentOrderId: null,
        status: { in: ["submitted", "valid"] },
      },
      include: orderIncludeChildren,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    tx.unitStack.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.currentRoundId,
        countryId: options.countryId,
        status: "active",
      },
      select: {
        countryId: true,
        regionId: true,
        unitType: true,
        count: true,
        status: true,
      },
    }),
    tx.regionControl.findMany({
      where: {
        gameId: options.gameId,
        roundId: options.currentRoundId,
      },
      select: {
        regionId: true,
        countryId: true,
      },
    }),
  ]);

  const duplicateInputs = sourceParents.map(orderToMutationInput);
  const validation = validateOrdersLightweight(
    duplicateInputs.map((order) => toValidationOrder(order, options.countryId)),
    {
      countryId: options.countryId,
      unitStacks: unitStacks.map((stack) => ({
        countryId: options.countryId,
        regionId: parseRegionId(stack.regionId),
        unitType: parseUnitType(stack.unitType),
        count: stack.count,
        status: stack.status,
      })),
      controls: controls.map((control) => ({
        regionId: parseRegionId(control.regionId),
        countryId: parseOptionalCountryId(control.countryId),
      })),
      existingOrders: currentOrders.map((order) =>
        toValidationOrder(selectedOrderToMutationInput(order), options.countryId),
      ),
      maxCountableOrders: options.maxCountableOrders,
    },
  );

  if (!validation.ok) {
    return {
      ok: false as const,
      issues: validation.issues,
      orders: [],
    };
  }

  const createdIds: string[] = [];
  for (const sourceParent of sourceParents) {
    const parent = await createOrderRow(tx, orderToMutationInput(sourceParent), {
      gameId: options.gameId,
      roundId: options.currentRoundId,
      countryId: options.countryId,
      submittedByPlayerId: options.submittedByPlayerId,
      status: "draft",
      clientMutationId: options.clientMutationId,
      countsTowardLimit: sourceParent.countsTowardLimit,
      parentOrderId: null,
      compoundRole: sourceParent.compoundRole,
    });
    createdIds.push(parent.id);

    for (const sourceChild of sourceParent.childOrders) {
      await createOrderRow(tx, orderToMutationInput(sourceChild), {
        gameId: options.gameId,
        roundId: options.currentRoundId,
        countryId: options.countryId,
        submittedByPlayerId: options.submittedByPlayerId,
        status: "draft",
        clientMutationId: options.clientMutationId,
        countsTowardLimit: false,
        parentOrderId: parent.id,
        compoundRole: sourceChild.compoundRole,
      });
    }
  }

  return {
    ok: true as const,
    issues: [],
    orders: await loadOrdersByIds(tx, createdIds),
  };
}

export async function writeClientMutation(
  tx: Prisma.TransactionClient,
  input: {
    clientMutationId: string | undefined;
    gameId: string;
    roundId: string | null;
    playerId: string;
    countryId: CountryId;
    mutationType: string;
    status: "pending" | "completed" | "rejected";
    requestPayload?: Prisma.InputJsonValue;
    responsePayload?: Prisma.InputJsonValue;
    errorCode?: string;
    errorMessage?: string;
    serverVersion?: number;
  },
) {
  if (!input.clientMutationId) {
    return;
  }

  await tx.clientMutation.upsert({
    where: { clientMutationId: input.clientMutationId },
    create: {
      clientMutationId: input.clientMutationId,
      gameId: input.gameId,
      roundId: input.roundId,
      playerId: input.playerId,
      countryId: input.countryId,
      mutationType: input.mutationType,
      status: input.status,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      serverVersion: input.serverVersion,
      completedAt: input.status === "pending" ? null : new Date(),
    },
    update: {
      status: input.status,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      serverVersion: input.serverVersion,
      completedAt: input.status === "pending" ? null : new Date(),
    },
  });
}

export function activeCountableOrderCount(orders: readonly ValidationOrder[]) {
  return countCountableOrders(orders);
}

function createOrderRow(
  tx: Prisma.TransactionClient,
  input: OrderMutationInput,
  options: CreateOrdersOptions & {
    countsTowardLimit: boolean;
    parentOrderId: string | null;
    compoundRole: string | null;
  },
) {
  return tx.order
    .create({
      data: {
        gameId: options.gameId,
        roundId: options.roundId,
        countryId: options.countryId,
        submittedByPlayerId: options.submittedByPlayerId,
        actionType: input.actionType,
        status: options.status,
        originRegionId: input.originRegionId ?? null,
        targetRegionId: input.targetRegionId ?? null,
        targetCountryId: input.targetCountryId ?? null,
        targetUnitStackId: input.targetUnitStackId ?? null,
        unitType: input.unitType ?? null,
        unitCount: input.unitCount ?? null,
        countsTowardLimit: options.countsTowardLimit,
        parentOrderId: options.parentOrderId,
        compoundRole: options.compoundRole,
        supportOrderId: input.supportOrderId ?? null,
        supportCountryId: input.supportCountryId ?? null,
        supportActionType: input.supportActionType ?? null,
        supportTargetRegionId: input.supportTargetRegionId ?? null,
        pairedOrderId: input.pairedOrderId ?? null,
        clientMutationId: options.clientMutationId ?? null,
        payload: toJsonInput(input.payload ?? {}),
        validationSummary: toJsonInput({ phase: "phase_3_lightweight" }),
        submittedAt: options.status === "submitted" ? new Date() : null,
      },
    })
    .then(async (order) => {
      await writeOrderVersion(tx, order, "created");
      return order;
    });
}

export async function writeOrderVersion(tx: Prisma.TransactionClient, order: Order, changeReason: string) {
  const aggregate = await tx.orderVersion.aggregate({
    where: { orderId: order.id },
    _max: { version: true },
  });
  const nextVersion = (aggregate._max.version ?? 0) + 1;

  await tx.orderVersion.create({
    data: {
      orderId: order.id,
      version: nextVersion,
      editedByType: "player",
      editedById: order.submittedByPlayerId,
      status: order.status,
      payload: orderToVersionPayload(order),
      changeReason,
    },
  });
}

function orderToMutationInput(order: Order & { childOrders?: Order[] }): OrderMutationInput {
  return {
    id: order.id,
    actionType: parseOrderActionType(order.actionType),
    status: "draft",
    originRegionId: parseOptionalRegionId(order.originRegionId),
    targetRegionId: parseOptionalRegionId(order.targetRegionId),
    targetCountryId: parseOptionalCountryId(order.targetCountryId),
    targetUnitStackId: order.targetUnitStackId,
    unitType: parseOptionalUnitType(order.unitType),
    unitCount: order.unitCount,
    countsTowardLimit: order.countsTowardLimit,
    parentOrderId: order.parentOrderId,
    compoundRole: parseOptionalCompoundRole(order.compoundRole),
    supportOrderId: order.supportOrderId,
    supportCountryId: parseOptionalCountryId(order.supportCountryId),
    supportActionType: parseOptionalOrderActionType(order.supportActionType),
    supportTargetRegionId: parseOptionalRegionId(order.supportTargetRegionId),
    pairedOrderId: order.pairedOrderId,
    payload: normalizePrismaPayload(order.payload),
  };
}

function selectedOrderToMutationInput(
  order: Prisma.OrderGetPayload<{ select: typeof validationOrderSelect }>,
): OrderMutationInput {
  return {
    id: order.id,
    actionType: parseOrderActionType(order.actionType),
    status: parseOrderStatus(order.status),
    originRegionId: parseOptionalRegionId(order.originRegionId),
    targetRegionId: parseOptionalRegionId(order.targetRegionId),
    targetCountryId: parseOptionalCountryId(order.targetCountryId),
    targetUnitStackId: order.targetUnitStackId,
    unitType: parseOptionalUnitType(order.unitType),
    unitCount: order.unitCount,
    countsTowardLimit: order.countsTowardLimit,
    parentOrderId: order.parentOrderId,
    compoundRole: parseOptionalCompoundRole(order.compoundRole),
    supportOrderId: order.supportOrderId,
    supportCountryId: parseOptionalCountryId(order.supportCountryId),
    supportActionType: parseOptionalOrderActionType(order.supportActionType),
    supportTargetRegionId: parseOptionalRegionId(order.supportTargetRegionId),
    pairedOrderId: order.pairedOrderId,
    payload: normalizePrismaPayload(order.payload),
  };
}

function toValidationOrder(order: OrderMutationInput, countryId: CountryId): ValidationOrder {
  return {
    ...order,
    countryId,
  };
}

function getMaxCountableOrders(config: Prisma.JsonValue): number {
  if (config && typeof config === "object" && !Array.isArray(config) && "maxCountableOrders" in config) {
    const value = config.maxCountableOrders;
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : MAX_COUNTABLE_ORDERS;
  }

  return MAX_COUNTABLE_ORDERS;
}

function normalizePrismaPayload(payload: Prisma.JsonValue | null): OrderPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const result: OrderPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      isStringArray(value)
    ) {
      result[key] = value;
    }
  }

  return result;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toJsonInput(value: OrderPayload | Prisma.InputJsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function orderToVersionPayload(order: Order): Prisma.InputJsonValue {
  return {
    id: order.id,
    actionType: order.actionType,
    status: order.status,
    originRegionId: order.originRegionId,
    targetRegionId: order.targetRegionId,
    targetCountryId: order.targetCountryId,
    unitType: order.unitType,
    unitCount: order.unitCount,
    countsTowardLimit: order.countsTowardLimit,
    parentOrderId: order.parentOrderId,
    compoundRole: order.compoundRole,
    supportOrderId: order.supportOrderId,
    supportCountryId: order.supportCountryId,
    supportActionType: order.supportActionType,
    supportTargetRegionId: order.supportTargetRegionId,
    pairedOrderId: order.pairedOrderId,
    clientMutationId: order.clientMutationId,
  };
}

const validationOrderSelect = {
  id: true,
  actionType: true,
  status: true,
  originRegionId: true,
  targetRegionId: true,
  targetCountryId: true,
  targetUnitStackId: true,
  unitType: true,
  unitCount: true,
  countsTowardLimit: true,
  parentOrderId: true,
  compoundRole: true,
  supportOrderId: true,
  supportCountryId: true,
  supportActionType: true,
  supportTargetRegionId: true,
  pairedOrderId: true,
  payload: true,
} satisfies Prisma.OrderSelect;

const orderIncludeChildren = {
  childOrders: {
    orderBy: [{ compoundRole: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.OrderInclude;
