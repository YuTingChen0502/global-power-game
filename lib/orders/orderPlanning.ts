import type { OrderDTO, UnitStackDTO } from "@/lib/api/types";
import type { OrderMutationInput, OrderPayload, ValidationOrder } from "@/lib/validation/orderValidation";
import { getPayloadRegionId } from "@/lib/validation/orderValidation";
import type { CountryId, OrderActionType, RegionId, UnitType } from "@/rules-engine/types";

export type DraftOrder = OrderMutationInput & {
  id: string;
  countryId: CountryId;
  status: "draft" | "submitted_pending" | "invalid";
  createdAt: string;
  updatedAt: string;
  validationIssues?: string[];
};

export type DraftOrderCreateInput = {
  countryId: CountryId;
  originRegionId?: RegionId | null;
  targetRegionId?: RegionId | null;
  targetCountryId?: CountryId | null;
  unitType?: UnitType | null;
  unitCount?: number | null;
  actionType?: OrderActionType;
  countsTowardLimit?: boolean;
  payload?: OrderPayload;
  supportOrderId?: string | null;
  supportCountryId?: CountryId | null;
  supportActionType?: OrderActionType | null;
  supportTargetRegionId?: RegionId | null;
  pairedOrderId?: string | null;
};

export type DuplicatePlan = {
  orders: DraftOrder[];
  duplicatedCount: number;
};

export function createLocalDraftOrder(input: DraftOrderCreateInput, now = new Date()): DraftOrder {
  const timestamp = now.toISOString();

  return {
    id: createLocalOrderId(),
    countryId: input.countryId,
    actionType: input.actionType ?? "move",
    status: "draft",
    originRegionId: input.originRegionId ?? null,
    targetRegionId: input.targetRegionId ?? null,
    targetCountryId: input.targetCountryId ?? null,
    targetUnitStackId: null,
    unitType: input.unitType ?? null,
    unitCount: input.unitCount ?? 1,
    countsTowardLimit: input.countsTowardLimit ?? true,
    parentOrderId: null,
    compoundRole: null,
    supportOrderId: input.supportOrderId ?? null,
    supportCountryId: input.supportCountryId ?? null,
    supportActionType: input.supportActionType ?? null,
    supportTargetRegionId: input.supportTargetRegionId ?? null,
    pairedOrderId: input.pairedOrderId ?? null,
    payload: input.payload ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function draftOrderToValidationOrder(order: DraftOrder): ValidationOrder {
  return {
    ...order,
    countryId: order.countryId,
  };
}

export function orderDtoToDraft(order: OrderDTO, now = new Date()): DraftOrder {
  const timestamp = now.toISOString();

  return {
    id: order.id,
    countryId: order.countryId,
    actionType: order.actionType,
    status: order.status === "submitted_pending" ? "submitted_pending" : "draft",
    originRegionId: order.originRegionId,
    targetRegionId: order.targetRegionId,
    targetCountryId: order.targetCountryId,
    targetUnitStackId: order.targetUnitStackId,
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
    payload: normalizePayload(order.payload),
    createdAt: order.createdAt || timestamp,
    updatedAt: order.updatedAt || timestamp,
  };
}

export function createQuickDefenseDrafts(
  countryId: CountryId,
  unitStacks: readonly Pick<UnitStackDTO, "countryId" | "regionId" | "unitType" | "count" | "status">[],
  now = new Date(),
): DraftOrder[] {
  return unitStacks
    .filter((stack) => stack.countryId === countryId && stack.status === "active" && stack.count > 0)
    .map((stack) =>
      createLocalDraftOrder(
        {
          countryId,
          actionType: "defend",
          originRegionId: stack.regionId,
          targetRegionId: stack.regionId,
          unitType: stack.unitType,
          unitCount: stack.count,
          countsTowardLimit: false,
          payload: { quickDefense: true },
        },
        now,
      ),
    );
}

export function createAmphibiousChildInputs(parent: OrderMutationInput): [OrderMutationInput, OrderMutationInput] {
  const payload = parent.payload ?? {};
  const armyOriginRegionId = getPayloadRegionId(payload, "armyOriginRegionId") ?? parent.originRegionId ?? null;
  const navalOriginRegionId = getPayloadRegionId(payload, "navalOriginRegionId") ?? parent.originRegionId ?? null;
  const landingTargetRegionId = getPayloadRegionId(payload, "landingTargetRegionId") ?? parent.targetRegionId ?? null;
  const navalTargetRegionId = getPayloadRegionId(payload, "navalTargetRegionId") ?? parent.targetRegionId ?? null;

  return [
    {
      actionType: "amphibious_attack",
      status: parent.status,
      originRegionId: navalOriginRegionId,
      targetRegionId: navalTargetRegionId,
      targetCountryId: parent.targetCountryId,
      unitType: "navy",
      unitCount: 1,
      countsTowardLimit: false,
      compoundRole: "naval_carrier",
      payload: {
        generatedBy: "phase_3_amphibious",
        parentClientOrderId: parent.id ?? "",
      },
    },
    {
      actionType: "amphibious_attack",
      status: parent.status,
      originRegionId: armyOriginRegionId,
      targetRegionId: landingTargetRegionId,
      targetCountryId: parent.targetCountryId,
      unitType: "army",
      unitCount: 1,
      countsTowardLimit: false,
      compoundRole: "land_payload",
      payload: {
        generatedBy: "phase_3_amphibious",
        parentClientOrderId: parent.id ?? "",
      },
    },
  ];
}

export function planDuplicateLastRoundOrders(
  orders: readonly OrderDTO[],
  countryId: CountryId,
  now = new Date(),
): DuplicatePlan {
  const childrenByParentId = new Map<string, OrderDTO[]>();
  for (const order of orders) {
    if (order.parentOrderId) {
      childrenByParentId.set(order.parentOrderId, [...(childrenByParentId.get(order.parentOrderId) ?? []), order]);
    } else if (order.childOrders.length > 0) {
      childrenByParentId.set(order.id, order.childOrders);
    }
  }

  const duplicatedParents = orders
    .filter(
      (order) =>
        order.countryId === countryId &&
        !order.parentOrderId &&
        (order.status === "submitted" || order.status === "valid"),
    )
    .map((order) => {
      const draft = orderDtoToDraft(order, now);
      return {
        sourceOrderId: order.id,
        draft: {
          ...draft,
          id: createLocalOrderId(),
          status: "draft" as const,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      };
    });

  const drafts: DraftOrder[] = [];
  for (const { sourceOrderId, draft: parentDraft } of duplicatedParents) {
    drafts.push(parentDraft);
    const sourceChildren = childrenByParentId.get(sourceOrderId) ?? [];
    for (const child of sourceChildren) {
      const childDraft = orderDtoToDraft(child, now);
      drafts.push({
        ...childDraft,
        id: createLocalOrderId(),
        parentOrderId: parentDraft.id,
        status: "draft",
        countsTowardLimit: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  return {
    orders: drafts,
    duplicatedCount: duplicatedParents.length,
  };
}

export function normalizePayload(payload: unknown): OrderPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const normalized: OrderPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      isStringArray(value)
    ) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function createLocalOrderId() {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return `draft-${cryptoObject.randomUUID()}`;
  }

  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
