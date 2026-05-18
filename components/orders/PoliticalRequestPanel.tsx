"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { SelectField } from "@/components/orders/OrderFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiResponse, PoliticalRespondResponseDTO } from "@/lib/api/types";
import { type OrderView, useGameStore } from "@/lib/store/gameStore";
import type { CountryId } from "@/rules-engine/types";

export function PoliticalRequestPanel() {
  const game = useGameStore((state) => state.game);
  const myCountryId = useGameStore((state) => state.myCountryId);
  const playerToken = useGameStore((state) => state.playerToken);
  const countries = useGameStore((state) => state.countries);
  const submittedOrders = useGameStore((state) => state.submittedOrders);
  const createDraftOrder = useGameStore((state) => state.createDraftOrder);
  const upsertSubmittedOrders = useGameStore((state) => state.upsertSubmittedOrders);
  const [hostCountryId, setHostCountryId] = useState<CountryId | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const incomingRequests = submittedOrders.filter(
    (order) =>
      order.actionType === "request_asylum" &&
      order.targetCountryId === myCountryId &&
      !order.pairedOrderId &&
      (order.status === "submitted" || order.status === "valid"),
  );
  const outgoingRequests = submittedOrders.filter(
    (order) => order.actionType === "request_asylum" && order.countryId === myCountryId,
  );
  const hostOptions = countries
    .filter((country) => country.id !== myCountryId)
    .map((country) => ({ value: country.id, label: country.englishName }));

  function handleCreateRequest() {
    if (!myCountryId || !hostCountryId) {
      return;
    }

    createDraftOrder({
      countryId: myCountryId,
      actionType: "request_asylum",
      targetCountryId: hostCountryId,
      unitType: null,
      unitCount: null,
      countsTowardLimit: true,
    });
    setMessage("Asylum request added to drafts.");
  }

  async function respond(requestOrder: OrderView, response: "approve" | "reject") {
    if (!game || !myCountryId || !playerToken) {
      return;
    }

    const clientMutationId = createClientMutationId();

    try {
      const httpResponse = await fetch("/api/political/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          countryId: myCountryId,
          playerToken,
          clientMutationId,
          requestOrderId: requestOrder.id,
          response,
        }),
      });
      const payload: unknown = await httpResponse.json();

      if (!isApiResponse<PoliticalRespondResponseDTO>(payload) || !payload.ok || !payload.data) {
        setMessage("Response failed.");
        return;
      }

      upsertSubmittedOrders([payload.data.request, payload.data.response]);
      setMessage(response === "approve" ? "Request approved." : "Request rejected.");
    } catch {
      setMessage("Response failed.");
    }
  }

  return (
    <section className="grid gap-3 rounded-md border border-white/10 bg-white/10 p-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Diplomacy</h2>
        <Badge variant="outline" className="border-white/30 text-slate-100">
          {incomingRequests.length} pending
        </Badge>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <SelectField value={hostCountryId} options={hostOptions} onChange={(value) => setHostCountryId(value as CountryId | "")} />
        <Button type="button" variant="secondary" onClick={handleCreateRequest} disabled={!hostCountryId || !myCountryId}>
          Request
        </Button>
      </div>

      {message ? <p className="rounded-md bg-slate-950/70 px-3 py-2 text-sm text-slate-200">{message}</p> : null}

      <div className="grid gap-2">
        {incomingRequests.map((request) => (
          <div key={request.id} className="rounded-md border border-white/10 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{countryLabel(request.countryId, countries)} asylum</p>
                <p className="text-xs text-slate-300">Round request</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="icon" variant="secondary" aria-label="Approve asylum" onClick={() => respond(request, "approve")}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" aria-label="Reject asylum" onClick={() => respond(request, "reject")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {incomingRequests.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center text-sm text-slate-300">
            No incoming requests
          </div>
        ) : null}
      </div>

      {outgoingRequests.length > 0 ? (
        <div className="grid gap-2">
          <h3 className="text-xs font-semibold uppercase text-slate-300">Outgoing</h3>
          {outgoingRequests.map((request) => (
            <div key={request.id} className="rounded-md bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
              {countryLabel(request.targetCountryId, countries)} / {request.pairedOrderId ? "answered" : "pending"}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function countryLabel(countryId: string | null | undefined, countries: readonly { id: string; englishName: string }[]) {
  if (!countryId) {
    return "-";
  }

  return countries.find((country) => country.id === countryId)?.englishName ?? countryId;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return Boolean(value && typeof value === "object" && "ok" in value);
}

function createClientMutationId() {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  return `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
