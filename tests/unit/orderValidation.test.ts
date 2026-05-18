import { describe, expect, it } from "vitest";
import {
  countCountableOrders,
  orderInputSchema,
  submitOrdersPayloadSchema,
  validateOrdersLightweight,
  type ValidationOrder,
} from "@/lib/validation/orderValidation";
import type { CountryId, RegionId, UnitType } from "@/rules-engine/types";

function order(overrides: Partial<ValidationOrder> = {}): ValidationOrder {
  return {
    id: "order-1",
    countryId: "china",
    actionType: "move",
    status: "draft",
    originRegionId: "china_western_frontier",
    targetRegionId: "central_asia",
    unitType: "army",
    unitCount: 1,
    countsTowardLimit: true,
    payload: {},
    ...overrides,
  };
}

function unit(countryId: CountryId, regionId: RegionId, unitType: UnitType, count = 1) {
  return {
    countryId,
    regionId,
    unitType,
    count,
    status: "active",
  };
}

describe("lightweight order validation", () => {
  it("accepts a basic owned-origin order", () => {
    const result = validateOrdersLightweight([order()], {
      countryId: "china",
      unitStacks: [unit("china", "china_western_frontier", "army", 2)],
      controls: [{ regionId: "china_western_frontier", countryId: "china" }],
    });

    expect(result.ok).toBe(true);
    expect(result.countableOrderCount).toBe(1);
  });

  it("rejects origins not controlled by the player", () => {
    const result = validateOrdersLightweight([order()], {
      countryId: "china",
      unitStacks: [unit("china", "china_western_frontier", "army", 2)],
      controls: [{ regionId: "china_western_frontier", countryId: "india" }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("origin_not_controlled");
  });

  it("enforces the eight countable order limit while excluding amphibious children", () => {
    const parents = Array.from({ length: 8 }, (_, index) =>
      order({
        id: `parent-${index}`,
        targetRegionId: index % 2 === 0 ? "central_asia" : "india_northern_border",
      }),
    );
    const child = order({
      id: "child-1",
      parentOrderId: "parent-amphibious",
      compoundRole: "naval_carrier",
      unitType: "navy",
      countsTowardLimit: false,
    });
    const overflow = order({ id: "overflow" });
    const result = validateOrdersLightweight([...parents, child, overflow], {
      countryId: "china",
      unitStacks: [
        unit("china", "china_western_frontier", "army", 9),
        unit("china", "china_western_frontier", "navy", 1),
      ],
      controls: [{ regionId: "china_western_frontier", countryId: "china" }],
    });

    expect(countCountableOrders([...parents, child])).toBe(8);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("too_many_countable_orders");
  });

  it("rejects malformed payloads before route handling", () => {
    const parsedOrder = orderInputSchema.safeParse({
      actionType: "move",
      originRegionId: "not_a_region",
      targetRegionId: "central_asia",
      unitType: "army",
      unitCount: 1,
    });
    const parsedSubmit = submitOrdersPayloadSchema.safeParse({
      gameId: "game-1",
      countryId: "china",
      playerToken: "token-token",
      clientMutationId: "mutation-1",
      orders: [],
    });

    expect(parsedOrder.success).toBe(false);
    expect(parsedSubmit.success).toBe(false);
  });

  it("requires player token and a known country in order auth payloads", () => {
    const parsed = submitOrdersPayloadSchema.safeParse({
      gameId: "game-1",
      countryId: "not-a-country",
      playerToken: "",
      clientMutationId: "mutation-1",
      orders: [order()],
    });

    expect(parsed.success).toBe(false);
  });

  it("requires support orders to reference a concrete intent", () => {
    const result = validateOrdersLightweight(
      [
        order({
          id: "support-1",
          actionType: "support_attack",
          targetRegionId: "central_asia",
        }),
      ],
      {
        countryId: "china",
        unitStacks: [unit("china", "china_western_frontier", "army", 2)],
        controls: [{ regionId: "china_western_frontier", countryId: "china" }],
      },
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("support_intent_required");
  });

  it("validates request_asylum target shape", () => {
    const result = validateOrdersLightweight(
      [
        order({
          id: "asylum-1",
          actionType: "request_asylum",
          originRegionId: null,
          targetRegionId: null,
          targetCountryId: "usa",
          unitType: null,
          unitCount: null,
        }),
      ],
      {
        countryId: "china",
        unitStacks: [],
      },
    );

    expect(result.ok).toBe(true);
  });
});
