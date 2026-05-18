"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  parseGameEventType,
  parseGamePhase,
  parseOptionalCountryId,
  parseOptionalRegionId,
  toIsoString,
  toOptionalIsoString,
} from "@/lib/api/mappers";
import type { ConnectionStatus } from "@/lib/store/gameStore";
import type { GameEventDTO, GamePatchDTO, PublicRealtimePatch, RoundPatchDTO } from "@/lib/api/types";
import { getSupabaseBrowserClient } from "@/lib/db/supabaseBrowser";
import type { CountryId } from "@/rules-engine/types";

type DatabaseRow = Record<string, unknown>;

export type PublicRealtimeHandlers = {
  onPatch?: (patch: PublicRealtimePatch) => void;
  onEvent?: (event: GameEventDTO) => void;
  onConnectionStatus?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
};

export type RealtimeSubscription = {
  channelName: string;
  unsubscribe: () => Promise<void>;
};

export function subscribeToGamePublic(gameId: string, handlers: PublicRealtimeHandlers = {}): RealtimeSubscription {
  let channel: RealtimeChannel;

  try {
    const supabase = getSupabaseBrowserClient();
    const channelName = `game-public:${gameId}`;
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Round", filter: `gameId=eq.${gameId}` },
        (payload: RealtimePostgresChangesPayload<DatabaseRow>) => {
          const roundPatch = rowToRoundPatch(payload.new);
          if (!roundPatch) {
            return;
          }

          handlers.onPatch?.({
            gameId,
            round: roundPatch,
            serverVersion: roundPatch.serverVersion,
            updatedAt: roundPatch.updatedAt,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Game", filter: `id=eq.${gameId}` },
        (payload: RealtimePostgresChangesPayload<DatabaseRow>) => {
          const row = payload.new;
          const id = readString(row, "id");
          const phase = readString(row, "phase");
          const serverVersion = readNumber(row, "serverVersion");
          const updatedAt = readDateString(row, "updatedAt");

          if (!id || !phase) {
            return;
          }

          const gamePatch: GamePatchDTO = {
            id,
            phase: parseGamePhase(phase),
          };

          if (serverVersion !== null) {
            gamePatch.serverVersion = serverVersion;
          }

          if (updatedAt) {
            gamePatch.updatedAt = updatedAt;
          }

          handlers.onPatch?.({
            gameId,
            game: gamePatch,
            serverVersion: serverVersion ?? undefined,
            updatedAt: updatedAt ?? undefined,
          });
        },
      )
      .subscribe((status: string) => {
        handlers.onConnectionStatus?.(toConnectionStatus(status));
      });

    handlers.onConnectionStatus?.("connecting");
    return {
      channelName,
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
        handlers.onConnectionStatus?.("disconnected");
      },
    };
  } catch (error: unknown) {
    handlers.onConnectionStatus?.("error");
    handlers.onError?.(error instanceof Error ? error.message : "Realtime subscription failed.");
    return createNoopSubscription(`game-public:${gameId}:unavailable`);
  }
}

export function subscribeToEvents(gameId: string, handlers: PublicRealtimeHandlers = {}): RealtimeSubscription {
  let channel: RealtimeChannel;

  try {
    const supabase = getSupabaseBrowserClient();
    const channelName = `game-events:${gameId}`;
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "GameEvent", filter: `gameId=eq.${gameId}` },
        (payload: RealtimePostgresChangesPayload<DatabaseRow>) => {
          const event = rowToGameEvent(payload.new);
          if (!event || event.visibility !== "public") {
            return;
          }

          handlers.onEvent?.(event);
          handlers.onPatch?.({
            gameId,
            events: [event],
            serverVersion: event.serverVersion,
            updatedAt: event.createdAt,
          });
        },
      )
      .subscribe((status: string) => {
        handlers.onConnectionStatus?.(toConnectionStatus(status));
      });

    handlers.onConnectionStatus?.("connecting");
    return {
      channelName,
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
        handlers.onConnectionStatus?.("disconnected");
      },
    };
  } catch (error: unknown) {
    handlers.onConnectionStatus?.("error");
    handlers.onError?.(error instanceof Error ? error.message : "Realtime event subscription failed.");
    return createNoopSubscription(`game-events:${gameId}:unavailable`);
  }
}

export function subscribeToCountryPrivate(
  _gameId: string,
  _countryId: CountryId,
  handlers: Pick<PublicRealtimeHandlers, "onConnectionStatus" | "onError"> = {},
): RealtimeSubscription {
  handlers.onConnectionStatus?.("disconnected");
  handlers.onError?.("Private country realtime is stubbed until Phase 8 RLS hardening.");
  return createNoopSubscription("country-private-stub");
}

export function subscribeToAdmin(
  _gameId: string,
  handlers: Pick<PublicRealtimeHandlers, "onConnectionStatus" | "onError"> = {},
): RealtimeSubscription {
  handlers.onConnectionStatus?.("disconnected");
  handlers.onError?.("Admin realtime is stubbed until Phase 8 RLS hardening.");
  return createNoopSubscription("admin-private-stub");
}

function createNoopSubscription(channelName: string): RealtimeSubscription {
  return {
    channelName,
    unsubscribe: async () => {
      return;
    },
  };
}

function toConnectionStatus(status: string): ConnectionStatus {
  if (status === "SUBSCRIBED") {
    return "connected";
  }

  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    return "error";
  }

  if (status === "CLOSED") {
    return "disconnected";
  }

  return "connecting";
}

function rowToRoundPatch(row: DatabaseRow): RoundPatchDTO | null {
  const id = readString(row, "id");
  const gameId = readString(row, "gameId");
  const number = readNumber(row, "number");
  const phase = readString(row, "phase");
  const deadlineAt = readNullableDateString(row, "deadlineAt");
  const serverVersion = readNumber(row, "serverVersion");
  const updatedAt = readDateString(row, "updatedAt");

  if (!id || !gameId) {
    return null;
  }

  const patch: RoundPatchDTO = {
    id,
    gameId,
  };

  if (number !== null) {
    patch.number = number;
  }

  if (phase) {
    patch.phase = parseGamePhase(phase);
  }

  if (deadlineAt !== undefined) {
    patch.deadlineAt = deadlineAt;
  }

  if (serverVersion !== null) {
    patch.serverVersion = serverVersion;
  }

  if (updatedAt) {
    patch.updatedAt = updatedAt;
  }

  return patch;
}

function rowToGameEvent(row: DatabaseRow): GameEventDTO | null {
  const id = readString(row, "id");
  const gameId = readString(row, "gameId");
  const sequence = readNumber(row, "sequence");
  const type = readString(row, "type");
  const visibility = readString(row, "visibility");
  const serverVersion = readNumber(row, "serverVersion");
  const occurredAt = readDateString(row, "occurredAt");
  const createdAt = readDateString(row, "createdAt");

  if (
    !id ||
    !gameId ||
    sequence === null ||
    !type ||
    !visibility ||
    serverVersion === null ||
    !occurredAt ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    gameId,
    roundId: readString(row, "roundId"),
    sequence,
    type: parseGameEventType(type),
    visibility,
    countryId: parseNullableCountryId(row, "countryId"),
    regionId: parseNullableRegionId(row, "regionId"),
    title: readString(row, "title"),
    message: readString(row, "message"),
    payload: row.payload ?? null,
    serverVersion,
    occurredAt,
    createdAt,
  };
}

function parseNullableCountryId(row: DatabaseRow, key: string) {
  const value = readString(row, key);
  return value ? parseOptionalCountryId(value) : null;
}

function parseNullableRegionId(row: DatabaseRow, key: string) {
  const value = readString(row, key);
  return value ? parseOptionalRegionId(value) : null;
}

function readString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function readNumber(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function readDateString(row: DatabaseRow, key: string) {
  const value = row[key];

  if (value instanceof Date) {
    return toIsoString(value);
  }

  return typeof value === "string" ? value : null;
}

function readNullableDateString(row: DatabaseRow, key: string) {
  if (row[key] === null) {
    return null;
  }

  const value = readDateString(row, key);
  return value === null ? undefined : toOptionalIsoString(value);
}
