import { create } from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export type GameStoreState = {
  gameId: string | null;
  roundNumber: number | null;
  countryId: string | null;
  connectionStatus: ConnectionStatus;
  pendingMutationIds: readonly string[];
};

export type GameStoreActions = {
  setConnectionStatus: (connectionStatus: ConnectionStatus) => void;
  reset: () => void;
  hydrateInitialState: () => never;
  submitDraftOrders: () => never;
  reconcileServerState: () => never;
};

export type GameStore = GameStoreState & GameStoreActions;

const initialState: GameStoreState = {
  gameId: null,
  roundNumber: null,
  countryId: null,
  connectionStatus: "idle",
  pendingMutationIds: [],
};

function notImplemented(): never {
  throw new Error("not implemented");
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  reset: () => set({ ...initialState, pendingMutationIds: [] }),
  hydrateInitialState: notImplemented,
  submitDraftOrders: notImplemented,
  reconcileServerState: notImplemented,
}));
