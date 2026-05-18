"use client";

import { Copy, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { OrderCard } from "@/components/orders/OrderCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ApiResponse,
  DeleteOrderResponseDTO,
  DuplicateLastRoundResponseDTO,
  SubmitOrdersResponseDTO,
} from "@/lib/api/types";
import type { DraftOrder } from "@/lib/orders/orderPlanning";
import { type OrderView, useGameStore } from "@/lib/store/gameStore";
import type { OrderMutationInput } from "@/lib/validation/orderValidation";

export function OrderListPanel() {
  const game = useGameStore((state) => state.game);
  const myCountryId = useGameStore((state) => state.myCountryId);
  const playerToken = useGameStore((state) => state.playerToken);
  const draftOrders = useGameStore((state) => state.draftOrders);
  const submittedOrders = useGameStore((state) => state.submittedOrders);
  const pendingOrderMutations = useGameStore((state) => state.pendingOrderMutations);
  const updateDraftOrder = useGameStore((state) => state.updateDraftOrder);
  const deleteDraftOrder = useGameStore((state) => state.deleteDraftOrder);
  const duplicateLastRound = useGameStore((state) => state.duplicateLastRound);
  const quickDefense = useGameStore((state) => state.quickDefense);
  const submitOrdersOptimistic = useGameStore((state) => state.submitOrdersOptimistic);
  const reconcileSubmittedOrders = useGameStore((state) => state.reconcileSubmittedOrders);
  const rollbackOptimisticSubmit = useGameStore((state) => state.rollbackOptimisticSubmit);
  const removeSubmittedOrder = useGameStore((state) => state.removeSubmittedOrder);
  const [message, setMessage] = useState<string | null>(null);
  const parentDraftOrders = draftOrders.filter((order) => !order.parentOrderId);
  const parentSubmittedOrders = submittedOrders.filter((order) => !order.parentOrderId);
  const countableDraftCount = parentDraftOrders.filter((order) => order.countsTowardLimit).length;
  const hasPendingSubmit = Object.values(pendingOrderMutations).some((mutation) => mutation.status === "pending");
  const canMutate = Boolean(game && myCountryId && playerToken);

  async function handleSubmit() {
    if (!game || !myCountryId || !playerToken || parentDraftOrders.length === 0) {
      return;
    }

    const clientMutationId = submitOrdersOptimistic();

    try {
      const response = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          countryId: myCountryId,
          playerToken,
          clientMutationId,
          orders: parentDraftOrders.map(toOrderInput),
        }),
      });
      const payload: unknown = await response.json();

      if (!isApiResponse<SubmitOrdersResponseDTO>(payload) || !payload.ok || !payload.data) {
        rollbackOptimisticSubmit(clientMutationId);
        setMessage("Submit failed.");
        return;
      }

      reconcileSubmittedOrders(clientMutationId, payload.data.orders);
      setMessage("Orders submitted.");
    } catch {
      rollbackOptimisticSubmit(clientMutationId);
      setMessage("Submit failed.");
    }
  }

  async function handleDuplicateLastRound() {
    if (!game || !myCountryId || !playerToken) {
      return;
    }

    const clientMutationId = createClientMutationId();
    setMessage(null);

    try {
      const response = await fetch("/api/orders/duplicate-last-round", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          countryId: myCountryId,
          playerToken,
          clientMutationId,
        }),
      });
      const payload: unknown = await response.json();

      if (!isApiResponse<DuplicateLastRoundResponseDTO>(payload) || !payload.ok || !payload.data) {
        setMessage("Duplicate failed.");
        return;
      }

      duplicateLastRound(payload.data.orders);
      setMessage(payload.data.duplicatedCount > 0 ? "Previous orders copied." : "No previous submitted orders.");
    } catch {
      setMessage("Duplicate failed.");
    }
  }

  async function handleDelete(order: OrderView) {
    if (order.id.startsWith("draft-") || order.status === "draft") {
      deleteDraftOrder(order.id);
      return;
    }

    if (!game || !myCountryId || !playerToken) {
      return;
    }

    const clientMutationId = createClientMutationId();
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          countryId: myCountryId,
          playerToken,
          clientMutationId,
        }),
      });
      const payload: unknown = await response.json();

      if (!isApiResponse<DeleteOrderResponseDTO>(payload) || !payload.ok) {
        setMessage("Delete failed.");
        return;
      }

      removeSubmittedOrder(order.id);
      setMessage("Order cancelled.");
    } catch {
      setMessage("Delete failed.");
    }
  }

  return (
    <section className="grid gap-3 rounded-md border border-white/10 bg-white/10 p-3 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Orders</h2>
          <p className="text-xs text-slate-300">{countableDraftCount}/8 draft count</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={handleDuplicateLastRound} disabled={!canMutate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={quickDefense} disabled={!myCountryId}>
            <ShieldCheck className="h-4 w-4" />
            Defend
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={!canMutate || draftOrders.length === 0 || hasPendingSubmit}>
            {hasPendingSubmit ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit
          </Button>
        </div>
      </div>

      {message ? <p className="rounded-md bg-slate-950/70 px-3 py-2 text-sm text-slate-200">{message}</p> : null}

      <div className="grid gap-2">
        {parentDraftOrders.length > 0 ? (
          parentDraftOrders.map((order) => (
            <OrderCard key={order.id} order={order} onDraftChange={updateDraftOrder} onDelete={handleDelete} />
          ))
        ) : (
          <EmptyState label="No draft orders" />
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-slate-300">Submitted</h3>
          <Badge variant="outline" className="border-white/30 text-slate-100">
            {parentSubmittedOrders.length}
          </Badge>
        </div>
        {parentSubmittedOrders.length > 0 ? (
          parentSubmittedOrders.map((order) => <OrderCard key={order.id} order={order} onDelete={handleDelete} />)
        ) : (
          <EmptyState label="Nothing submitted" />
        )}
      </div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center text-sm text-slate-300">{label}</div>;
}

function toOrderInput(order: DraftOrder): OrderMutationInput {
  return {
    id: order.id,
    actionType: order.actionType,
    status: order.status,
    originRegionId: order.originRegionId,
    targetRegionId: order.targetRegionId,
    targetCountryId: order.targetCountryId,
    targetUnitStackId: order.targetUnitStackId,
    unitType: order.unitType,
    unitCount: order.unitCount,
    countsTowardLimit: order.countsTowardLimit,
    parentOrderId: order.parentOrderId,
    compoundRole: order.compoundRole,
    supportOrderId: order.supportOrderId,
    supportCountryId: order.supportCountryId,
    supportActionType: order.supportActionType,
    supportTargetRegionId: order.supportTargetRegionId,
    pairedOrderId: order.pairedOrderId,
    payload: order.payload,
  };
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
