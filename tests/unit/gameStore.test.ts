import { beforeEach, describe, expect, it } from "vitest";
import type { PublicGameStateDTO } from "@/lib/api/types";
import { createReferencePublicState } from "@/lib/game/referenceState";
import { initialGameStoreState, useGameStore } from "@/lib/store/gameStore";

function resetStore() {
  useGameStore.setState({
    ...initialGameStoreState,
    pendingMutations: {},
  });
}

function hydrateReferenceState(overrides: Partial<PublicGameStateDTO> = {}) {
  const referenceState = createReferencePublicState();
  const state: PublicGameStateDTO = {
    ...referenceState,
    ...overrides,
  };
  useGameStore.getState().hydrateInitialState(state);
  return state;
}

describe("game store hydration and selection", () => {
  beforeEach(() => {
    resetStore();
  });

  it("hydrates public state into the store", () => {
    const state = hydrateReferenceState();
    const store = useGameStore.getState();

    expect(store.game?.id).toBe(state.game.id);
    expect(store.round?.number).toBe(1);
    expect(store.regions).toHaveLength(23);
    expect(store.edges).toHaveLength(21);
    expect(store.unitStacks.length).toBeGreaterThan(0);
    expect(store.serverVersion).toBe(0);
  });

  it("selects an origin, computes possible targets, and records a draft order", () => {
    hydrateReferenceState();
    useGameStore.getState().setPlayerIdentity({
      gameId: "reference-game",
      countryId: "china",
      playerToken: "test-token",
    });

    useGameStore.getState().selectOrigin("china_western_frontier");
    expect(useGameStore.getState().selectedOriginId).toBe("china_western_frontier");
    expect(useGameStore.getState().possibleTargetIds).toContain("central_asia");
    expect(useGameStore.getState().possibleTargetIds).toContain("india_northern_border");
    expect(useGameStore.getState().possibleTargetIds).not.toContain("asean");

    useGameStore.getState().selectTarget("central_asia");
    expect(useGameStore.getState().selectedTargetId).toBe("central_asia");
    expect(useGameStore.getState().draftOrders).toMatchObject([
      {
        status: "draft",
        countryId: "china",
        actionType: "move",
        originRegionId: "china_western_frontier",
        targetRegionId: "central_asia",
        unitType: "army",
      },
    ]);
  });
});

describe("game store reconciliation precedence", () => {
  beforeEach(() => {
    resetStore();
  });

  it("lets a server-confirmed API response win over optimistic state", () => {
    const referenceState = createReferencePublicState();
    const apiState: PublicGameStateDTO = {
      ...referenceState,
      round: {
        ...referenceState.round,
        phase: "admin_review",
        serverVersion: 2,
        updatedAt: "2026-05-18T00:02:00.000Z",
      },
      serverVersion: 2,
      updatedAt: "2026-05-18T00:02:00.000Z",
    };

    hydrateReferenceState({
      serverVersion: 1,
      updatedAt: "2026-05-18T00:01:00.000Z",
    });
    useGameStore.getState().addPendingMutation({
      clientMutationId: "mutation-1",
      mutationType: "phase_test",
      optimisticServerVersion: 2,
    });
    useGameStore.setState((state) => ({
      round: state.round ? { ...state.round, phase: "paused" } : null,
    }));

    useGameStore.getState().hydrateInitialState(apiState, { clientMutationId: "mutation-1" });

    expect(useGameStore.getState().round?.phase).toBe("admin_review");
    expect(useGameStore.getState().pendingMutations["mutation-1"]).toBeUndefined();
  });

  it("lets a newer realtime patch win over older optimistic state", () => {
    const referenceState = createReferencePublicState();
    hydrateReferenceState({
      round: {
        ...referenceState.round,
        phase: "order_submission",
        serverVersion: 2,
        updatedAt: "2026-05-18T00:02:00.000Z",
      },
      serverVersion: 2,
      updatedAt: "2026-05-18T00:02:00.000Z",
    });
    useGameStore.getState().addPendingMutation({
      clientMutationId: "mutation-2",
      mutationType: "phase_test",
      optimisticServerVersion: 3,
    });
    useGameStore.setState((state) => ({
      round: state.round ? { ...state.round, phase: "paused" } : null,
    }));

    useGameStore.getState().applyRealtimePatch({
      gameId: "reference-game",
      round: {
        id: "reference-round-1",
        gameId: "reference-game",
        phase: "admin_review",
        serverVersion: 3,
        updatedAt: "2026-05-18T00:03:00.000Z",
      },
      clientMutationId: "mutation-2",
    });

    expect(useGameStore.getState().round?.phase).toBe("admin_review");
    expect(useGameStore.getState().pendingMutations["mutation-2"]).toBeUndefined();
  });

  it("does not let a stale realtime patch overwrite newer server state", () => {
    const referenceState = createReferencePublicState();
    hydrateReferenceState({
      round: {
        ...referenceState.round,
        phase: "admin_review",
        serverVersion: 5,
        updatedAt: "2026-05-18T00:05:00.000Z",
      },
      serverVersion: 5,
      updatedAt: "2026-05-18T00:05:00.000Z",
    });

    useGameStore.getState().applyRealtimePatch({
      gameId: "reference-game",
      round: {
        id: "reference-round-1",
        gameId: "reference-game",
        phase: "order_submission",
        serverVersion: 4,
        updatedAt: "2026-05-18T00:04:00.000Z",
      },
    });

    expect(useGameStore.getState().round?.phase).toBe("admin_review");
  });

  it("tracks and rejects pending mutations by clientMutationId", () => {
    hydrateReferenceState();
    useGameStore.getState().addPendingMutation({
      clientMutationId: "mutation-3",
      mutationType: "draft_placeholder",
      optimisticServerVersion: null,
    });

    expect(useGameStore.getState().pendingMutations["mutation-3"]?.status).toBe("pending");

    useGameStore.getState().rejectPendingMutation("mutation-3");
    expect(useGameStore.getState().pendingMutations["mutation-3"]?.status).toBe("rejected");

    useGameStore.getState().resolvePendingMutation("mutation-3");
    expect(useGameStore.getState().pendingMutations["mutation-3"]).toBeUndefined();
  });

  it("rolls back optimistic order submission on failure", () => {
    hydrateReferenceState();
    useGameStore.getState().setPlayerIdentity({
      gameId: "reference-game",
      countryId: "china",
      playerToken: "test-token",
    });
    useGameStore.getState().selectOrigin("china_western_frontier");
    useGameStore.getState().selectTarget("central_asia");

    const originalDraftOrders = useGameStore.getState().draftOrders;
    const clientMutationId = useGameStore.getState().submitOrdersOptimistic("mutation-orders-1");

    expect(clientMutationId).toBe("mutation-orders-1");
    expect(useGameStore.getState().draftOrders).toEqual([]);
    expect(useGameStore.getState().submittedOrders[0]?.status).toBe("submitted_pending");

    useGameStore.getState().rollbackOptimisticSubmit(clientMutationId);

    expect(useGameStore.getState().draftOrders).toEqual(originalDraftOrders);
    expect(useGameStore.getState().submittedOrders).toEqual([]);
    expect(useGameStore.getState().pendingMutations[clientMutationId]?.status).toBe("rejected");
  });
});
