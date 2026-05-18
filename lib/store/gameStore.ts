import { create } from "zustand";
import type {
  CountryDTO,
  CountryNavalAccessDTO,
  GameDTO,
  GameEventDTO,
  PublicGameStateDTO,
  PublicRealtimePatch,
  RegionControlDTO,
  RegionDTO,
  RegionEdgeDTO,
  RoundDTO,
  UnitStackDTO,
} from "@/lib/api/types";
import { getPossibleTargets } from "@/rules-engine/getPossibleTargets";
import { isCountryId } from "@/rules-engine/domainIds";
import type { CountryId, RegionId, UnitType } from "@/rules-engine/types";

export const PLAYER_IDENTITY_STORAGE_KEY = "global-power-game.playerIdentity.v1";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export type StoredPlayerIdentity = {
  gameId: string;
  countryId: CountryId;
  playerToken: string;
};

export type DraftOrderPlaceholder = {
  id: string;
  status: "placeholder";
  countryId: CountryId;
  originRegionId: RegionId;
  targetRegionId: RegionId;
  unitType: UnitType;
  createdAt: string;
};

export type PendingMutation = {
  clientMutationId: string;
  mutationType: string;
  status: "pending" | "confirmed" | "rejected";
  optimisticServerVersion: number | null;
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
  draftOrders: DraftOrderPlaceholder[];
  gameEvents: GameEventDTO[];
  connectionStatus: ConnectionStatus;
  pendingMutations: Record<string, PendingMutation>;
  serverVersion: number | null;
  updatedAt: string | null;
};

export type GameStoreActions = {
  hydrateInitialState: (state: PublicGameStateDTO, options?: { clientMutationId?: string }) => void;
  selectOrigin: (originRegionId: RegionId) => void;
  selectTarget: (targetRegionId: RegionId) => void;
  clearSelection: () => void;
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
  gameEvents: [],
  connectionStatus: "idle",
  pendingMutations: {},
  serverVersion: null,
  updatedAt: null,
};

export const useGameStore = create<GameStore>((set) => ({
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
        gameEvents: state.events,
        pendingMutations,
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
        draftOrders: [],
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
          draftOrders: [],
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
          draftOrders: [],
        };

        return {
          ...nextState,
          possibleTargetIds: computePossibleTargetIds(nextState, targetRegionId),
        };
      }

      const draftOrder = createDraftOrderPlaceholder(state, state.selectedOriginId, targetRegionId);

      return {
        ...state,
        selectedTargetId: targetRegionId,
        draftOrders: draftOrder ? [draftOrder] : [],
      };
    }),
  clearSelection: () =>
    set({
      selectedOriginId: null,
      selectedTargetId: null,
      possibleTargetIds: [],
      draftOrders: [],
    }),
  applyRealtimePatch: (patch) =>
    set((state) => {
      if (!shouldApplyRealtimePatch(state, patch)) {
        return state;
      }

      const pendingMutations = patch.clientMutationId
        ? removePendingMutation(state.pendingMutations, patch.clientMutationId)
        : state.pendingMutations;

      const nextState = {
        ...state,
        game: state.game && patch.game ? { ...state.game, ...patch.game } : state.game,
        round: state.round && patch.round ? { ...state.round, ...patch.round } : state.round,
        controls: patch.controls ? mergeById(state.controls, patch.controls) : state.controls,
        unitStacks: patch.unitStacks ? mergeById(state.unitStacks, patch.unitStacks) : state.unitStacks,
        gameEvents: patch.events ? mergeEvents(state.gameEvents, patch.events) : state.gameEvents,
        pendingMutations,
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
      pendingMutations: {},
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
    })),
  rejectPendingMutation: (clientMutationId) =>
    set((state) => {
      const existingMutation = state.pendingMutations[clientMutationId];

      return {
        pendingMutations: {
          ...state.pendingMutations,
          [clientMutationId]: {
            clientMutationId,
            mutationType: existingMutation?.mutationType ?? "unknown",
            optimisticServerVersion: existingMutation?.optimisticServerVersion ?? null,
            status: "rejected",
            createdAt: existingMutation?.createdAt ?? new Date().toISOString(),
          },
        },
      };
    }),
  reset: () => {
    const currentIdentity = readStoredPlayerIdentity();
    set({
      ...initialGameStoreState,
      myCountryId: currentIdentity?.countryId ?? null,
      playerToken: currentIdentity?.playerToken ?? null,
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

function createDraftOrderPlaceholder(
  state: GameStoreState,
  originRegionId: RegionId,
  targetRegionId: RegionId,
): DraftOrderPlaceholder | null {
  const stack = state.unitStacks.find((unitStack) => {
    const countryMatches = state.myCountryId ? unitStack.countryId === state.myCountryId : true;
    return unitStack.regionId === originRegionId && unitStack.status === "active" && unitStack.count > 0 && countryMatches;
  });

  if (!stack) {
    return null;
  }

  return {
    id: `placeholder-${originRegionId}-${targetRegionId}`,
    status: "placeholder",
    countryId: stack.countryId,
    originRegionId,
    targetRegionId,
    unitType: stack.unitType,
    createdAt: new Date().toISOString(),
  };
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

export function getCurrentGameStoreState() {
  return useGameStore.getState();
}
