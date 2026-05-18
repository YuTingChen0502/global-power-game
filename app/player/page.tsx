"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameMap } from "@/components/map/GameMap";
import { EffectSelectionPanel } from "@/components/orders/EffectSelectionPanel";
import { OrderListPanel } from "@/components/orders/OrderListPanel";
import { PoliticalRequestPanel } from "@/components/orders/PoliticalRequestPanel";
import type { ApiResponse, PublicGameStateDTO } from "@/lib/api/types";
import { createReferencePublicState } from "@/lib/game/referenceState";
import { subscribeToEvents, subscribeToGamePublic } from "@/lib/realtime/subscribe";
import { readStoredPlayerIdentity, useGameStore } from "@/lib/store/gameStore";

export default function PlayerPage() {
  const game = useGameStore((state) => state.game);
  const round = useGameStore((state) => state.round);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const hydrateInitialState = useGameStore((state) => state.hydrateInitialState);
  const setPlayerIdentity = useGameStore((state) => state.setPlayerIdentity);
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const applyRealtimePatch = useGameStore((state) => state.applyRealtimePatch);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const identity = useMemo(() => readStoredPlayerIdentity(), []);

  useEffect(() => {
    if (!identity) {
      hydrateInitialState(createReferencePublicState());
      setConnectionStatus("idle");
      setLoadMessage(null);
      return;
    }

    const currentIdentity = identity;
    setPlayerIdentity(currentIdentity);
    const abortController = new AbortController();

    async function loadPublicState() {
      setConnectionStatus("connecting");

      try {
        const response = await fetch(`/api/games/${currentIdentity.gameId}/public-state`, {
          signal: abortController.signal,
          headers: {
            "x-country-id": currentIdentity.countryId,
            "x-player-token": currentIdentity.playerToken,
          },
        });
        const payload: unknown = await response.json();

        if (!isPublicStateResponse(payload) || !payload.ok || !payload.data) {
          setLoadMessage("Public game state is unavailable.");
          hydrateInitialState(createReferencePublicState());
          setConnectionStatus("error");
          return;
        }

        hydrateInitialState(payload.data);
        setConnectionStatus("connected");
        setLoadMessage(null);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadMessage("Public game state is unavailable.");
        hydrateInitialState(createReferencePublicState());
        setConnectionStatus("error");
      }
    }

    void loadPublicState();

    return () => {
      abortController.abort();
    };
  }, [hydrateInitialState, identity, setConnectionStatus, setPlayerIdentity]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    const gameSubscription = subscribeToGamePublic(identity.gameId, {
      onPatch: applyRealtimePatch,
      onConnectionStatus: setConnectionStatus,
    });
    const eventSubscription = subscribeToEvents(identity.gameId, {
      onPatch: applyRealtimePatch,
      onConnectionStatus: setConnectionStatus,
    });

    return () => {
      void gameSubscription.unsubscribe();
      void eventSubscription.unsubscribe();
    };
  }, [applyRealtimePatch, identity, setConnectionStatus]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-3 py-3">
        <header className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:flex sm:items-center sm:gap-4">
            <StatusPair label="Round" value={round ? String(round.number) : "-"} />
            <StatusPair label="Phase" value={round?.phase ?? game?.phase ?? "-"} />
            <StatusPair label="Deadline" value={formatDeadline(round?.deadlineAt ?? null)} />
          </div>
          <Badge variant={connectionStatus === "connected" ? "secondary" : "outline"} className="capitalize">
            {connectionStatus}
          </Badge>
        </header>

        {loadMessage ? <p className="px-1 text-sm text-amber-200">{loadMessage}</p> : null}

        <div className="min-h-[520px] flex-1">
          <GameMap />
        </div>

        <Tabs defaultValue="orders" className="pb-2">
          <TabsList className="grid h-auto w-full grid-cols-4">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
            <TabsTrigger value="diplomacy">Diplomacy</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-2 border-0 bg-transparent p-0 text-white">
            <OrderListPanel />
          </TabsContent>
          <TabsContent value="report" className="mt-2 rounded-md border border-white/10 bg-white/10 p-3 text-sm text-white">
            No report published.
          </TabsContent>
          <TabsContent value="effects" className="mt-2 border-0 bg-transparent p-0 text-white">
            <EffectSelectionPanel />
          </TabsContent>
          <TabsContent value="diplomacy" className="mt-2 border-0 bg-transparent p-0 text-white">
            <PoliticalRequestPanel />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function StatusPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] uppercase text-slate-300">{label}</span>
      <span className="block font-semibold leading-tight">{value}</span>
    </div>
  );
}

function formatDeadline(deadlineAt: string | null) {
  if (!deadlineAt) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(deadlineAt));
}

function isPublicStateResponse(value: unknown): value is ApiResponse<PublicGameStateDTO> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { ok?: unknown };
  return typeof candidate.ok === "boolean";
}
