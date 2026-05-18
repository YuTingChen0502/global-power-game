import { describe, expect, it } from "vitest";
import type { OrderDTO, UnitStackDTO } from "@/lib/api/types";
import {
  createAmphibiousChildInputs,
  createQuickDefenseDrafts,
  planDuplicateLastRoundOrders,
} from "@/lib/orders/orderPlanning";
import { countCountableOrders } from "@/lib/validation/orderValidation";

function stack(overrides: Partial<UnitStackDTO>): UnitStackDTO {
  return {
    id: "stack-1",
    gameId: "game-1",
    roundId: "round-1",
    countryId: "china",
    regionId: "china_eastern_coast",
    unitType: "army",
    count: 1,
    status: "active",
    isExiled: false,
    serverVersion: 1,
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

function order(overrides: Partial<OrderDTO> = {}): OrderDTO {
  return {
    id: "order-1",
    gameId: "game-1",
    roundId: "round-1",
    countryId: "china",
    submittedByPlayerId: "player-1",
    actionType: "attack",
    status: "submitted",
    originRegionId: "china_eastern_coast",
    targetRegionId: "asean",
    targetCountryId: null,
    targetUnitStackId: null,
    unitType: "army",
    unitCount: 1,
    countsTowardLimit: true,
    parentOrderId: null,
    compoundRole: null,
    supportOrderId: null,
    supportCountryId: null,
    supportActionType: null,
    supportTargetRegionId: null,
    pairedOrderId: null,
    clientMutationId: null,
    payload: {},
    validationSummary: null,
    adminNote: null,
    submittedAt: "2026-05-18T00:00:00.000Z",
    resolvedAt: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    childOrders: [],
    ...overrides,
  };
}

describe("order planning helpers", () => {
  it("creates quick defense drafts as explicit non-counting defend orders", () => {
    const drafts = createQuickDefenseDrafts("china", [
      stack({ id: "army", unitType: "army", count: 2 }),
      stack({ id: "navy", unitType: "navy", count: 1 }),
      stack({ id: "other", countryId: "usa", unitType: "army", count: 3 }),
    ]);

    expect(drafts).toHaveLength(2);
    expect(drafts.every((draft) => draft.actionType === "defend")).toBe(true);
    expect(drafts.every((draft) => draft.countsTowardLimit === false)).toBe(true);
    expect(countCountableOrders(drafts)).toBe(0);
  });

  it("builds amphibious children that do not count toward the order limit", () => {
    const [navyChild, armyChild] = createAmphibiousChildInputs({
      id: "client-parent",
      actionType: "amphibious_attack",
      originRegionId: "china_eastern_coast",
      targetRegionId: "asean",
      unitType: "army",
      unitCount: 1,
      countsTowardLimit: true,
      payload: {
        navalOriginRegionId: "china_eastern_coast",
        armyOriginRegionId: "china_eastern_coast",
        landingTargetRegionId: "asean",
      },
    });

    expect(navyChild.compoundRole).toBe("naval_carrier");
    expect(armyChild.compoundRole).toBe("land_payload");
    expect(navyChild.countsTowardLimit).toBe(false);
    expect(armyChild.countsTowardLimit).toBe(false);
  });

  it("duplicates submitted parents with child orders linked to the new parent", () => {
    const sourceParent = order({
      id: "source-parent",
      actionType: "amphibious_attack",
      childOrders: [
        order({
          id: "source-navy-child",
          parentOrderId: "source-parent",
          compoundRole: "naval_carrier",
          unitType: "navy",
          countsTowardLimit: false,
          childOrders: [],
        }),
        order({
          id: "source-army-child",
          parentOrderId: "source-parent",
          compoundRole: "land_payload",
          unitType: "army",
          countsTowardLimit: false,
          childOrders: [],
        }),
      ],
    });
    const ignoredResolved = order({ id: "resolved-parent", status: "resolved" });
    const plan = planDuplicateLastRoundOrders([sourceParent, ignoredResolved], "china");

    expect(plan.duplicatedCount).toBe(1);
    expect(plan.orders).toHaveLength(3);
    const parent = plan.orders.find((draft) => !draft.parentOrderId);
    const children = plan.orders.filter((draft) => draft.parentOrderId);

    expect(parent?.actionType).toBe("amphibious_attack");
    expect(children).toHaveLength(2);
    expect(children.every((child) => child.parentOrderId === parent?.id)).toBe(true);
    expect(countCountableOrders(plan.orders)).toBe(1);
  });
});
