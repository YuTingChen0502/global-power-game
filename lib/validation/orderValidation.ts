import { z } from "zod";
import { COUNTRY_IDS, REGION_IDS } from "@/rules-engine/domainIds";
import type { CompoundRole, CountryId, OrderActionType, OrderStatus, RegionId, UnitType } from "@/rules-engine/types";

export const MAX_COUNTABLE_ORDERS = 8;

export const orderActionTypeSchema = z.enum([
  "move",
  "attack",
  "defend",
  "support_attack",
  "support_defend",
  "amphibious_attack",
  "chip_disrupt",
  "declare_embargo",
  "request_asylum",
  "approve_asylum",
  "reject_asylum",
  "revoke_asylum",
  "effect_selection",
] satisfies [OrderActionType, ...OrderActionType[]]);

export const orderStatusSchema = z.enum([
  "draft",
  "submitted",
  "submitted_pending",
  "valid",
  "invalid",
  "resolved",
  "cancelled",
] satisfies [OrderStatus, ...OrderStatus[]]);

export const countryIdSchema = z.enum(COUNTRY_IDS);
export const regionIdSchema = z.enum(REGION_IDS);
export const unitTypeSchema = z.enum(["army", "navy"] satisfies [UnitType, ...UnitType[]]);
export const compoundRoleSchema = z.enum([
  "parent",
  "naval_carrier",
  "land_payload",
] satisfies [CompoundRole, ...CompoundRole[]]);

const payloadValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]);
export const orderPayloadSchema = z.record(payloadValueSchema);

export const orderInputSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  actionType: orderActionTypeSchema,
  status: orderStatusSchema.optional(),
  originRegionId: regionIdSchema.nullable().optional(),
  targetRegionId: regionIdSchema.nullable().optional(),
  targetCountryId: countryIdSchema.nullable().optional(),
  targetUnitStackId: z.string().trim().min(1).max(128).nullable().optional(),
  unitType: unitTypeSchema.nullable().optional(),
  unitCount: z.number().int().min(1).max(99).nullable().optional(),
  countsTowardLimit: z.boolean().optional(),
  parentOrderId: z.string().trim().min(1).max(128).nullable().optional(),
  compoundRole: compoundRoleSchema.nullable().optional(),
  supportOrderId: z.string().trim().min(1).max(128).nullable().optional(),
  supportCountryId: countryIdSchema.nullable().optional(),
  supportActionType: orderActionTypeSchema.nullable().optional(),
  supportTargetRegionId: regionIdSchema.nullable().optional(),
  pairedOrderId: z.string().trim().min(1).max(128).nullable().optional(),
  payload: orderPayloadSchema.optional(),
});

export const playerOrderAuthSchema = z.object({
  gameId: z.string().trim().min(1),
  countryId: countryIdSchema,
  playerToken: z.string().trim().min(8),
  clientMutationId: z.string().trim().min(1).max(128).optional(),
});

export const draftOrderPayloadSchema = playerOrderAuthSchema.extend({
  order: orderInputSchema,
});

export const submitOrdersPayloadSchema = playerOrderAuthSchema.extend({
  clientMutationId: z.string().trim().min(1).max(128),
  orders: z.array(orderInputSchema).min(1).max(24),
});

export const duplicateLastRoundPayloadSchema = playerOrderAuthSchema.extend({
  clientMutationId: z.string().trim().min(1).max(128).optional(),
  sourceRoundNumber: z.number().int().min(1).optional(),
});

export const deleteOrderPayloadSchema = playerOrderAuthSchema.extend({
  clientMutationId: z.string().trim().min(1).max(128).optional(),
});

export const politicalRespondPayloadSchema = playerOrderAuthSchema.extend({
  clientMutationId: z.string().trim().min(1).max(128).optional(),
  requestOrderId: z.string().trim().min(1),
  response: z.enum(["approve", "reject"]),
  note: z.string().trim().max(400).optional(),
});

export type OrderPayloadValue = z.infer<typeof payloadValueSchema>;
export type OrderPayload = z.infer<typeof orderPayloadSchema>;
export type OrderMutationInput = z.infer<typeof orderInputSchema>;
export type PlayerOrderAuthPayload = z.infer<typeof playerOrderAuthSchema>;
export type DraftOrderPayload = z.infer<typeof draftOrderPayloadSchema>;
export type SubmitOrdersPayload = z.infer<typeof submitOrdersPayloadSchema>;
export type DuplicateLastRoundPayload = z.infer<typeof duplicateLastRoundPayloadSchema>;
export type DeleteOrderPayload = z.infer<typeof deleteOrderPayloadSchema>;
export type PoliticalRespondPayload = z.infer<typeof politicalRespondPayloadSchema>;

export type ValidationOrder = OrderMutationInput & {
  countryId: CountryId;
};

export type ValidationUnitStack = {
  countryId: CountryId;
  regionId: RegionId;
  unitType: UnitType;
  count: number;
  status: string;
};

export type ValidationRegionControl = {
  regionId: RegionId;
  countryId: CountryId | null;
};

export type OrderValidationContext = {
  countryId: CountryId;
  unitStacks: readonly ValidationUnitStack[];
  controls?: readonly ValidationRegionControl[];
  existingOrders?: readonly ValidationOrder[];
  maxCountableOrders?: number;
};

export type OrderValidationIssue = {
  code: string;
  message: string;
  orderId?: string;
};

export type OrderValidationResult = {
  ok: boolean;
  issues: OrderValidationIssue[];
  countableOrderCount: number;
  maxCountableOrders: number;
};

const MILITARY_ACTION_TYPES: ReadonlySet<OrderActionType> = new Set([
  "move",
  "attack",
  "defend",
  "support_attack",
  "support_defend",
  "amphibious_attack",
]);

export function validateOrdersLightweight(
  orders: readonly ValidationOrder[],
  context: OrderValidationContext,
): OrderValidationResult {
  const maxCountableOrders = context.maxCountableOrders ?? MAX_COUNTABLE_ORDERS;
  const allOrders = [...(context.existingOrders ?? []), ...orders];
  const issues: OrderValidationIssue[] = [];
  const countableOrderCount = countCountableOrders(allOrders);

  if (countableOrderCount > maxCountableOrders) {
    issues.push({
      code: "too_many_countable_orders",
      message: `A country may submit at most ${maxCountableOrders} countable orders this round.`,
    });
  }

  for (const order of orders) {
    issues.push(...validateOrder(order, context));
  }

  return {
    ok: issues.length === 0,
    issues,
    countableOrderCount,
    maxCountableOrders,
  };
}

export function countCountableOrders(orders: readonly Pick<ValidationOrder, "countsTowardLimit" | "compoundRole" | "parentOrderId" | "status">[]) {
  return orders.filter(isCountableOrder).length;
}

export function isCountableOrder(
  order: Pick<ValidationOrder, "countsTowardLimit" | "compoundRole" | "parentOrderId" | "status">,
) {
  if (order.status === "cancelled" || order.status === "resolved") {
    return false;
  }

  if (order.parentOrderId || order.compoundRole === "naval_carrier" || order.compoundRole === "land_payload") {
    return false;
  }

  return order.countsTowardLimit ?? true;
}

export function getPayloadRegionId(payload: OrderPayload | undefined, key: string): RegionId | null {
  const value = payload?.[key];
  if (typeof value !== "string") {
    return null;
  }

  const parsed = regionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function getPayloadString(payload: OrderPayload | undefined, key: string): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function validateOrder(order: ValidationOrder, context: OrderValidationContext): OrderValidationIssue[] {
  const issues: OrderValidationIssue[] = [];

  if (order.countryId !== context.countryId) {
    issues.push(issue("country_mismatch", "Order country does not match the authenticated player country.", order));
  }

  if (MILITARY_ACTION_TYPES.has(order.actionType)) {
    issues.push(...validateMilitaryOrder(order, context));
  }

  if (order.actionType === "support_attack" || order.actionType === "support_defend") {
    issues.push(...validateSupportIntent(order));
  }

  if (order.actionType === "amphibious_attack") {
    issues.push(...validateAmphibiousIntent(order, context));
  }

  if (order.actionType === "request_asylum") {
    issues.push(...validateAsylumRequest(order, context));
  }

  if (order.actionType === "approve_asylum" || order.actionType === "reject_asylum") {
    if (!order.pairedOrderId && !getPayloadString(order.payload, "requestOrderId")) {
      issues.push(issue("political_response_missing_request", "Asylum response must reference a request order.", order));
    }
  }

  return issues;
}

function validateMilitaryOrder(order: ValidationOrder, context: OrderValidationContext): OrderValidationIssue[] {
  const issues: OrderValidationIssue[] = [];

  if (!order.originRegionId) {
    issues.push(issue("origin_required", "Military orders require an origin region.", order));
  }

  if (!order.unitType) {
    issues.push(issue("unit_type_required", "Military orders require a unit type.", order));
  }

  if (!order.unitCount || order.unitCount < 1) {
    issues.push(issue("unit_count_required", "Military orders require at least one unit.", order));
  }

  if (!order.originRegionId || !order.unitType || !order.unitCount) {
    return issues;
  }

  if (order.compoundRole === "naval_carrier" || order.compoundRole === "land_payload") {
    return issues;
  }

  const controlledOrigin = context.controls?.find((control) => control.regionId === order.originRegionId);
  if (controlledOrigin && controlledOrigin.countryId !== context.countryId) {
    issues.push(issue("origin_not_controlled", "Order origin is not currently controlled by this country.", order));
  }

  const availableCount = context.unitStacks
    .filter(
      (stack) =>
        stack.countryId === context.countryId &&
        stack.regionId === order.originRegionId &&
        stack.unitType === order.unitType &&
        stack.status === "active",
    )
    .reduce((sum, stack) => sum + stack.count, 0);

  if (availableCount < order.unitCount) {
    issues.push(issue("insufficient_units", "Order uses more units than are available at its origin.", order));
  }

  return issues;
}

function validateSupportIntent(order: ValidationOrder): OrderValidationIssue[] {
  if (order.supportOrderId) {
    return [];
  }

  if (!order.supportCountryId || !order.supportActionType || !order.supportTargetRegionId) {
    return [issue("support_intent_required", "Support orders must reference a concrete attack or defense intent.", order)];
  }

  if (order.actionType === "support_attack" && !["attack", "amphibious_attack"].includes(order.supportActionType)) {
    return [issue("support_attack_intent_mismatch", "Support attack must point at an attack intent.", order)];
  }

  if (order.actionType === "support_defend" && order.supportActionType !== "defend") {
    return [issue("support_defense_intent_mismatch", "Support defense must point at a defense intent.", order)];
  }

  return [];
}

function validateAmphibiousIntent(order: ValidationOrder, context: OrderValidationContext): OrderValidationIssue[] {
  const issues: OrderValidationIssue[] = [];
  const armyOriginRegionId = getPayloadRegionId(order.payload, "armyOriginRegionId") ?? order.originRegionId ?? null;
  const navalOriginRegionId = getPayloadRegionId(order.payload, "navalOriginRegionId") ?? order.originRegionId ?? null;

  if (!armyOriginRegionId || !navalOriginRegionId || !order.targetRegionId) {
    issues.push(issue("amphibious_payload_required", "Amphibious orders require army origin, navy origin, and landing target.", order));
    return issues;
  }

  if (!hasActiveStack(context, armyOriginRegionId, "army")) {
    issues.push(issue("amphibious_army_missing", "Amphibious payload needs an available army.", order));
  }

  if (!hasActiveStack(context, navalOriginRegionId, "navy")) {
    issues.push(issue("amphibious_navy_missing", "Amphibious payload needs an available navy.", order));
  }

  return issues;
}

function validateAsylumRequest(order: ValidationOrder, context: OrderValidationContext): OrderValidationIssue[] {
  const issues: OrderValidationIssue[] = [];

  if (!order.targetCountryId) {
    issues.push(issue("asylum_target_required", "Asylum request must target a host country.", order));
  } else if (order.targetCountryId === context.countryId) {
    issues.push(issue("asylum_self_target", "Asylum request must target another country.", order));
  }

  return issues;
}

function hasActiveStack(context: OrderValidationContext, regionId: RegionId, unitType: UnitType) {
  return context.unitStacks.some(
    (stack) =>
      stack.countryId === context.countryId &&
      stack.regionId === regionId &&
      stack.unitType === unitType &&
      stack.status === "active" &&
      stack.count > 0,
  );
}

function issue(code: string, message: string, order: Pick<ValidationOrder, "id">): OrderValidationIssue {
  return {
    code,
    message,
    orderId: order.id,
  };
}
