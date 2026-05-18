import { create } from "zustand";
import type {
  CountryDTO,
  CountryNavalAccessDTO,
  GameDTO,
  GameEventDTO,
  OrderDTO,
  PublicGameStateDTO,
  PublicRealtimePatch,
  RegionControlDTO,
  RegionDTO,
  RegionEdgeDTO,
  RoundDTO,
  UnitStackDTO,
} from "@/lib/api/types";
import {
  createLocalDraftOrder,
  createQuickDefenseDrafts,
  orderDtoToDraft,
  type DraftOrder,
  type DraftOrderCreateInput,
} from "@/lib/orders/orderPlanning";
import { getPossibleTargets } from "@/rules-engine/getPossibleTargets";
import { isCountryId } from "@/rules-engine/domainIds";
import type { CountryId, RegionId } from "@/rules-engine/types";

export const PLAYER_IDENTITY_STORAGE_KEY = "global-power-game.playerIdentity.v1";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export type StoredPlayerIdentity = {
  gameId: string;
  countryId: CountryId;
  playerToken: string;
};

export type PendingMutation = {
  clientMutationId: string;
  mutationType: string;
  status: "pending" | "confirmed" | "rejected";
  optimisticServerVersion: number | null;
  createdAt: string;
};

export type OrderView = DraftOrder | OrderDTO;

export type PendingOrderMutation = {
  clientMutationId: string;
  status: "pending" | "rejected";
  previousDraftOrders: DraftOrder[];
  previousSubmittedOrders: OrderView[];
  optimisticOrders: DraftOrder[];
  createdAt: string;
};

export type GameStoreState = {
  game: GameDTO | null;
  round: RoundDTO | null;
  countries: CountryDTO[];
  regions: RegionDTO[];
  edges: RegionEdgeDTO[];
  controls: RegionControlDTO[];
  unitStacks: UnitStackDTO[];
  navalAccess: CountryNavalAccessDTO[];
  myCountryId: CountryId | null;
  playerToken: string | null;
  selectedOriginId: RegionId | null;
  selectedTargetId: RegionId | null;
  possibleTargetIds: RegionId[];
  draftOrders: DraftOrder[];
  submittedOrders: OrderView[];
  gameEvents: GameEventDTO[];
  connectionStatus: ConnectionStatus;
  pendingMutations: Record<string, PendingMutation>;
  pendingOrderMutations: Record<string, PendingOrderMutation>;
  serverVersion: number | null;
  updatedAt: string | null;
};

export type GameStoreActions = {
  hydrateInitialState: (state: PublicGameStateDTO, options?: { clientMutationId?: string }) => void;
  selectOrigin: (originRegionId: RegionId) => void;
  selectTarget: (targetRegionId: RegionId) => void;
  clearSelection: () => void;
  createDraftOrder: (input: DraftOrderCreateInput) => DraftOrder | null;
  updateDraftOrder: (orderId: string, patch: Partial<DraftOrder>) => void;
  deleteDraftOrder: (orderId: string) => void;
  duplicateLastRound: (orders: readonly OrderDTO[]) => void;
  quickDefense: () => void;
  submitOrdersOptimistic: (clientMutationId?: string) => string;
  reconcileSubmittedOrders: (clientMutationId: string, orders: readonly OrderDTO[]) => void;
  upsertSubmittedOrders: (orders: readonly OrderDTO[]) => void;
  rollbackOptimisticSubmit: (clientMutationId: string) => void;
  removeSubmittedOrder: (orderId: string) => void;
  applyRealtimePatch: (patch: PublicRealtimePatch) => void;
  setConnectionStatus: (connectionStatus: ConnectionStatus) => void;
  setPlayerIdentity: (identity: StoredPlayerIdentity) => void;
  clearPlayerIdentity: () => void;
  addPendingMutation: (mutation: Omit<PendingMutation, "status" | "createdAt">) => void;
  resolvePendingMutation: (clientMutationId: string) => void;
  rejectPendingMutation: (clientMutationId: string) => void;
  reset: () => void;
};

export type GameStore = GameStoreState & GameStoreActions;

export const initialGameStoreState: GameStoreState = {
  game: null,
  round: null,
  countries: [],
  regions: [],
  edges: [],
  controls: [],
  unitStacks: [],
  navalAccess: [],
  myCountryId: null,
  playerToken: null,
  selectedOriginId: null,
  selectedTargetId: null,
  possibleTargetIds: [],
  draftOrders: [],
  submittedOrders: [],
  gameEvents: [],
  connectionStatus: "idle",
  pendingMutations: {},
  pendingOrderMutations: {},
  serverVersion: null,
  updatedAt: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameStoreState,
  hydrateInitialState: (state, options) =>
    set((current) => {
      const pendingMutations = options?.clientMutationId
        ? removePendingMutation(current.pendingMutations, options.clientMutationId)
        : current.pendingMutations;

      return {
        ...current,
        game: state.game,
        round: state.round,
        countries: state.countries,
        regions: state.regions,
        edges: state.edges,
        controls: state.controls,
        unitStacks: state.unitStacks,
        navalAccess: state.navalAccess,
        selectedOriginId: null,
        selectedTargetId: null,
        possibleTargetIds: [],
        draftOrders: [],
        submittedOrders: state.orders ?? [],
        gameEvents: state.events,
        pendingMutations,
        pendingOrderMutations: {},
        serverVersion: state.serverVersion,
        updatedAt: state.updatedAt,
      };
    }),
  selectOrigin: (originRegionId) =>
    set((state) => {
      const nextState = {
        ...state,
        selectedOriginId: originRegionId,
        selectedTargetId: null,
      };

      return {
        ...nextState,
        possibleTargetIds: computePossibleTargetIds(nextState, originRegionId),
      };
    }),
  selectTarget: (targetRegionId) =>
    set((state) => {
      if (!state.selectedOriginId) {
        const nextState = {
          ...state,
          selectedOriginId: targetRegionId,
          selectedTargetId: null,
        };

        return {
          ...nextState,
          possibleTargetIds: computePossibleTargetIds(nextState, targetRegionId),
        };
      }

      if (!state.possibleTargetIds.includes(targetRegionId)) {
        const nextState = {
          ...state,
          selectedOriginId: targetRegionId,
          selectedTargetId: null,
        };

        return {
          ...nextState,
          possibleTargetIds: computePossibleTargetIds(nextState, targetRegionId),
        };
      }

      const draftOrder = createDraftOrderFromMap(state, state.selectedOriginId, targetRegionId);

      return {
        ...state,
        selectedTargetId: targetRegionId,
        draftOrders: draftOrder ? [...state.draftOrders, draftOrder] : state.draftOrders,
      };
    }),
  clearSelection: () =>
    set({
      selectedOriginId: null,
      selectedTargetId: null,
      possibleTargetIds: [],
    }),
  createDraftOrder: (input) => {
    const draftOrder = createLocalDraftOrder(input);
    set((state) => ({
      draftOrders: [...state.draftOrders, draftOrder],
    }));
    return draftOrder;
  },
  updateDraftOrder: (orderId, patch) =>
    set((state) => ({
      draftOrders: state.draftOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...patch,
              id: order.id,
              countryId: order.countryId,
              updatedAt: new Date().toISOString(),
            }
          : order,
      ),
    })),
  deleteDraftOrder: (orderId) =>
    set((state) => ({
      draftOrders: state.draftOrders.filter((order) => order.id !== orderId),
    })),
  duplicateLastRound: (orders) =>
    set((state) => ({
      draftOrders: [...state.draftOrders, ...orders.map((order) => orderDtoToDraft(order))],
    })),
  quickDefense: () =>
    set((state) => {
      if (!state.myCountryId) {
        return state;
      }

      const existingNonQuickDefense = state.draftOrders.filter((order) => order.payload?.quickDefense !== true);
      const quickDefenseOrders = createQuickDefenseDrafts(state.myCountryId, state.unitStacks);

      return {
        draftOrders: [...existingNonQuickDefense, ...quickDefenseOrders],
      };
    }),
  submitOrdersOptimistic: (clientMutationId) => {
    const mutationId = clientMutationId ?? createClientMutationId();
    set((state) => {
      const now = new Date().toISOString();
      const optimisticOrders = state.draftOrders.map((order) => ({
        ...order,
        status: "submitted_pending" as const,
        updatedAt: now,
      }));

      return {
        draftOrders: [],
        submittedOrders: [...state.submittedOrders.filter((order) => order.status !== "submitted_pending"), ...optimisticOrders],
        pendingMutations: {
          ...state.pendingMutations,
          [mutationId]: {
            clientMutationId: mutationId,
            mutationType: "submit_orders",
            status: "pending",
            optimisticServerVersion: state.serverVersion === null ? null : state.serverVersion + 1,
            createdAt: now,
          },
        },
        pendingOrderMutations: {
          ...state.pendingOrderMutations,
          [mutationId]: {
            clientMutationId: mutationId,
            status: "pending",
            previousDraftOrders: state.draftOrders,
            previousSubmittedOrders: state.submittedOrders,
            optimisticOrders,
            createdAt: now,
          },
        },
      };
    });
    return mutationId;
  },
  reconcileSubmittedOrders: (clientMutationId, orders) =>
    set((state) => ({
      submittedOrders: [...orders],
      draftOrders: [],
      pendingMutations: removePendingMutation(state.pendingMutations, clientMutationId),
      pendingOrderMutations: removePendingOrderMutation(state.pendingOrderMutations, clientMutationId),
    })),
  upsertSubmittedOrders: (orders) =>
    set((state) => ({
      submittedOrders: mergeById(state.submittedOrders, [...orders]),
    })),
  rollbackOptimisticSubmit: (clientMutationId) =>
    set((state) => {
      const pendingOrderMutation = state.pendingOrderMutations[clientMutationId];

      if (!pendingOrderMutation) {
        return {
          pendingMutations: markPendingMutationRejected(state.pendingMutations, clientMutationId),
        };
      }

      return {
        draftOrders: pendingOrderMutation.previousDraftOrders,
        submittedOrders: pendingOrderMutation.previousSubmittedOrders,
        pendingMutations: markPendingMutationRejected(state.pendingMutations, clientMutationId),
        pendingOrderMutations: {
          ...state.pendingOrderMutations,
          [clientMutationId]: {
            ...pendingOrderMutation,
            status: "rejected",
          },
        },
      };
    }),
  removeSubmittedOrder: (orderId) =>
    set((state) => ({
      submittedOrders: state.submittedOrders.filter((order) => order.id !== orderId),
    })),
  applyRealtimePatch: (patch) =>
    set((state) => {
      if (!shouldApplyRealtimePatch(state, patch)) {
        return state;
      }

      const pendingMutations = patch.clientMutationId
        ? removePendingMutation(state.pendingMutations, patch.clientMutationId)
        : state.pendingMutations;
      const pendingOrderMutations = patch.clientMutationId
        ? removePendingOrderMutation(state.pendingOrderMutations, patch.clientMutationId)
        : state.pendingOrderMutations;

      const nextState = {
        ...state,
        game: state.game && patch.game ? { ...state.game, ...patch.game } : state.game,
        round: state.round && patch.round ? { ...state.round, ...patch.round } : state.round,
        controls: patch.controls ? mergeById(state.controls, patch.controls) : state.controls,
        unitStacks: patch.unitStacks ? mergeById(state.unitStacks, patch.unitStacks) : state.unitStacks,
        gameEvents: patch.events ? mergeEvents(state.gameEvents, patch.events) : state.gameEvents,
        pendingMutations,
        pendingOrderMutations,
        serverVersion: getPatchServerVersion(patch) ?? state.serverVersion,
        updatedAt: getPatchUpdatedAt(patch) ?? state.updatedAt,
      };

      return {
        ...nextState,
        possibleTargetIds: nextState.selectedOriginId
          ? computePossibleTargetIds(nextState, nextState.selectedOriginId)
          : nextState.possibleTargetIds,
      };
    }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setPlayerIdentity: (identity) => {
    writeStoredPlayerIdentity(identity);
    set({
      myCountryId: identity.countryId,
      playerToken: identity.playerToken,
    });
  },
  clearPlayerIdentity: () => {
    clearStoredPlayerIdentity();
    set({
      myCountryId: null,
      playerToken: null,
      selectedOriginId: null,
      selectedTargetId: null,
      possibleTargetIds: [],
      draftOrders: [],
      submittedOrders: [],
      pendingMutations: {},
      pendingOrderMutations: {},
    });
  },
  addPendingMutation: (mutation) =>
    set((state) => ({
      pendingMutations: {
        ...state.pendingMutations,
        [mutation.clientMutationId]: {
          ...mutation,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      },
    })),
  resolvePendingMutation: (clientMutationId) =>
    set((state) => ({
      pendingMutations: removePendingMutation(state.pendingMutations, clientMutationId),
      pendingOrderMutations: removePendingOrderMutation(state.pendingOrderMutations, clientMutationId),
    })),
  rejectPendingMutation: (clientMutationId) =>
    set((state) => ({
      pendingMutations: markPendingMutationRejected(state.pendingMutations, clientMutationId),
    })),
  reset: () => {
    const currentIdentity = readStoredPlayerIdentity();
    const currentState = get();
    set({
      ...initialGameStoreState,
      myCountryId: currentIdentity?.countryId ?? null,
      playerToken: currentIdentity?.playerToken ?? null,
      connectionStatus: currentState.connectionStatus,
    });
  },
}));

export function readStoredPlayerIdentity(): StoredPlayerIdentity | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(PLAYER_IDENTITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isStoredPlayerIdentity(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredPlayerIdentity(identity: StoredPlayerIdentity) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    return;
  }
}

function clearStoredPlayerIdentity() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(PLAYER_IDENTITY_STORAGE_KEY);
  } catch {
    return;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" ||
      typeof storage.removeItem !== "function"
    ) {
      return null;
    }

    return storage;
  } catch {
    return null;
  }
}

function isStoredPlayerIdentity(value: unknown): value is StoredPlayerIdentity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeIdentity = value as {
    gameId?: unknown;
    countryId?: unknown;
    playerToken?: unknown;
  };

  return (
    typeof maybeIdentity.gameId === "string" &&
    typeof maybeIdentity.countryId === "string" &&
    isCountryId(maybeIdentity.countryId) &&
    typeof maybeIdentity.playerToken === "string" &&
    maybeIdentity.playerToken.length > 0
  );
}

function computePossibleTargetIds(state: GameStoreState, originRegionId: RegionId) {
  const stacks = state.unitStacks.filter((stack) => {
    const countryMatches = state.myCountryId ? stack.countryId === state.myCountryId : true;
    return stack.regionId === originRegionId && stack.status === "active" && stack.count > 0 && countryMatches;
  });
  const targetIds = new Set<RegionId>();

  for (const stack of stacks) {
    const result = getPossibleTargets({
      countryId: stack.countryId,
      originRegionId,
      unitType: stack.unitType,
      edges: state.edges,
      navalAccess: state.navalAccess,
    });

    for (const targetId of result.targetRegionIds) {
      targetIds.add(targetId);
    }
  }

  return [...targetIds].sort();
}

function createDraftOrderFromMap(
  state: GameStoreState,
  originRegionId: RegionId,
  targetRegionId: RegionId,
): DraftOrder | null {
  const stack = state.unitStacks.find((unitStack) => {
    const countryMatches = state.myCountryId ? unitStack.countryId === state.myCountryId : true;
    return unitStack.regionId === originRegionId && unitStack.status === "active" && unitStack.count > 0 && countryMatches;
  });

  if (!stack) {
    return null;
  }

  return createLocalDraftOrder({
    countryId: stack.countryId,
    originRegionId,
    targetRegionId,
    unitType: stack.unitType,
    unitCount: 1,
    actionType: "move",
  });
}

function shouldApplyRealtimePatch(state: GameStoreState, patch: PublicRealtimePatch) {
  const patchServerVersion = getPatchServerVersion(patch);
  const patchUpdatedAt = getPatchUpdatedAt(patch);

  if (patchServerVersion !== null && state.serverVersion !== null && patchServerVersion < state.serverVersion) {
    return false;
  }

  if (patchUpdatedAt && state.updatedAt && Date.parse(patchUpdatedAt) < Date.parse(state.updatedAt)) {
    return false;
  }

  return Boolean(
    patch.game ||
      patch.round ||
      patch.controls?.length ||
      patch.unitStacks?.length ||
      patch.events?.length ||
      patchServerVersion !== null ||
      patchUpdatedAt,
  );
}

function getPatchServerVersion(patch: PublicRealtimePatch) {
  return patch.serverVersion ?? patch.round?.serverVersion ?? patch.game?.serverVersion ?? null;
}

function getPatchUpdatedAt(patch: PublicRealtimePatch) {
  return patch.updatedAt ?? patch.round?.updatedAt ?? patch.game?.updatedAt ?? null;
}

function removePendingMutation(pendingMutations: Record<string, PendingMutation>, clientMutationId: string) {
  const nextPendingMutations = { ...pendingMutations };
  delete nextPendingMutations[clientMutationId];
  return nextPendingMutations;
}

function markPendingMutationRejected(pendingMutations: Record<string, PendingMutation>, clientMutationId: string) {
  const existingMutation = pendingMutations[clientMutationId];

  return {
    ...pendingMutations,
    [clientMutationId]: {
      clientMutationId,
      mutationType: existingMutation?.mutationType ?? "unknown",
      optimisticServerVersion: existingMutation?.optimisticServerVersion ?? null,
      status: "rejected" as const,
      createdAt: existingMutation?.createdAt ?? new Date().toISOString(),
    },
  };
}

function removePendingOrderMutation(
  pendingOrderMutations: Record<string, PendingOrderMutation>,
  clientMutationId: string,
) {
  const nextPendingOrderMutations = { ...pendingOrderMutations };
  delete nextPendingOrderMutations[clientMutationId];
  return nextPendingOrderMutations;
}

function mergeById<T extends { id: string }>(currentItems: T[], incomingItems: T[]) {
  const itemsById = new Map<string, T>();

  for (const item of currentItems) {
    itemsById.set(item.id, item);
  }

  for (const item of incomingItems) {
    itemsById.set(item.id, item);
  }

  return [...itemsById.values()];
}

function mergeEvents(currentEvents: GameEventDTO[], incomingEvents: GameEventDTO[]) {
  return mergeById(currentEvents, incomingEvents).sort((left, right) => {
    if (left.roundId !== right.roundId) {
      return (left.roundId ?? "").localeCompare(right.roundId ?? "");
    }

    return left.sequence - right.sequence;
  });
}

function createClientMutationId() {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  return `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCurrentGameStoreState() {
  return useGameStore.getState();
}
