"use client";

import { Shield, ShipWheel, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderEditor } from "@/components/orders/OrderEditor";
import type { DraftOrder } from "@/lib/orders/orderPlanning";
import { type OrderView, useGameStore } from "@/lib/store/gameStore";
import type { RegionId } from "@/rules-engine/types";
import { cn } from "@/lib/utils";

type OrderCardProps = {
  order: OrderView;
  onDraftChange?: (orderId: string, patch: Partial<DraftOrder>) => void;
  onDelete?: (order: OrderView) => void;
};

export function OrderCard({ order, onDraftChange, onDelete }: OrderCardProps) {
  const regions = useGameStore((state) => state.regions);
  const countries = useGameStore((state) => state.countries);
  const isDraft = isDraftOrder(order);
  const isAmphibious = order.actionType === "amphibious_attack";
  const title = `${formatAction(order.actionType)}${order.unitType ? ` / ${order.unitType}` : ""}`;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-md border-white/10 bg-slate-900/90 text-white shadow-none",
        order.status === "submitted_pending" ? "border-amber-300/50" : "",
        order.status === "invalid" ? "border-red-400/60" : "",
      )}
    >
      <CardHeader className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base tracking-normal">
              {isAmphibious ? <ShipWheel className="h-4 w-4 text-cyan-200" /> : <Shield className="h-4 w-4" />}
              <span className="truncate">{title}</span>
            </CardTitle>
            <p className="mt-1 text-xs text-slate-300">
              {order.originRegionId ? regionLabel(order.originRegionId, regions) : countryLabel(order.targetCountryId, countries)}
              {order.targetRegionId ? ` -> ${regionLabel(order.targetRegionId, regions)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={badgeVariant(order.status)} className="capitalize">
              {order.status.replace("_", " ")}
            </Badge>
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Delete order"
                aria-label="Delete order"
                onClick={() => onDelete(order)}
                className="h-9 w-9 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/30 text-slate-100">
            {order.countsTowardLimit ? "counts" : "no count"}
          </Badge>
          {isAmphibious ? (
            <Badge variant="outline" className="border-cyan-300/50 text-cyan-100">
              {childCount(order)} linked rows
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isDraft && onDraftChange ? (
          <OrderEditor order={order} onChange={(patch) => onDraftChange(order.id, patch)} />
        ) : (
          <ReadOnlyOrderDetails order={order} />
        )}
      </CardContent>
    </Card>
  );
}

function ReadOnlyOrderDetails({ order }: { order: OrderView }) {
  const countries = useGameStore((state) => state.countries);
  const regions = useGameStore((state) => state.regions);

  return (
    <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
      <div>
        <dt className="font-medium text-slate-400">Target country</dt>
        <dd>{countryLabel(order.targetCountryId, countries)}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-400">Count</dt>
        <dd>{order.unitCount ?? "-"}</dd>
      </div>
      {order.supportTargetRegionId ? (
        <div className="col-span-2">
          <dt className="font-medium text-slate-400">Support intent</dt>
          <dd>
            {order.supportActionType ?? "-"} at {regionLabel(order.supportTargetRegionId, regions)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function isDraftOrder(order: OrderView): order is DraftOrder {
  return order.id.startsWith("draft-") || order.status === "draft";
}

function childCount(order: OrderView) {
  if ("childOrders" in order) {
    return Math.max(1, order.childOrders.length + 1);
  }

  return 3;
}

function regionLabel(regionId: RegionId, regions: readonly { id: RegionId; englishName: string }[]) {
  return regions.find((region) => region.id === regionId)?.englishName ?? regionId;
}

function countryLabel(countryId: string | null | undefined, countries: readonly { id: string; englishName: string }[]) {
  if (!countryId) {
    return "-";
  }

  return countries.find((country) => country.id === countryId)?.englishName ?? countryId;
}

function formatAction(actionType: string) {
  return actionType
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "invalid") {
    return "destructive";
  }

  if (status === "submitted_pending") {
    return "outline";
  }

  return status === "draft" ? "secondary" : "default";
}
