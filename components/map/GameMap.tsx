"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/lib/store/gameStore";
import type { CountryDTO, RegionDTO, UnitStackDTO } from "@/lib/api/types";
import type { CountryId, RegionId } from "@/rules-engine/types";
import { cn } from "@/lib/utils";

const MAP_WIDTH = 1120;
const MAP_HEIGHT = 680;

export function GameMap() {
  const countries = useGameStore((state) => state.countries);
  const regions = useGameStore((state) => state.regions);
  const edges = useGameStore((state) => state.edges);
  const controls = useGameStore((state) => state.controls);
  const unitStacks = useGameStore((state) => state.unitStacks);
  const draftOrders = useGameStore((state) => state.draftOrders);
  const selectedOriginId = useGameStore((state) => state.selectedOriginId);
  const selectedTargetId = useGameStore((state) => state.selectedTargetId);
  const possibleTargetIds = useGameStore((state) => state.possibleTargetIds);
  const selectOrigin = useGameStore((state) => state.selectOrigin);
  const selectTarget = useGameStore((state) => state.selectTarget);
  const clearSelection = useGameStore((state) => state.clearSelection);

  const countriesById = new Map<CountryId, CountryDTO>(countries.map((country) => [country.id, country]));
  const regionsById = new Map<RegionId, RegionDTO>(regions.map((region) => [region.id, region]));
  const controlsByRegionId = new Map<RegionId, CountryId | null>(
    controls.map((control) => [control.regionId, control.countryId]),
  );
  const stacksByRegionId = groupUnitStacksByRegion(unitStacks);
  const selectedRegion = selectedTargetId
    ? regionsById.get(selectedTargetId)
    : selectedOriginId
      ? regionsById.get(selectedOriginId)
      : null;
  const selectedStacks = selectedRegion ? stacksByRegionId.get(selectedRegion.id) ?? [] : [];
  const selectedController = selectedRegion ? controlsByRegionId.get(selectedRegion.id) ?? null : null;

  function handleRegionClick(regionId: RegionId) {
    if (selectedOriginId && possibleTargetIds.includes(regionId)) {
      selectTarget(regionId);
      return;
    }

    selectOrigin(regionId);
  }

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-md border bg-slate-950 text-white">
      <TransformWrapper
        centerOnInit
        initialScale={0.78}
        minScale={0.5}
        maxScale={4}
        wheel={{ step: 0.08 }}
        doubleClick={{ disabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute left-3 top-3 z-20 flex gap-2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => zoomIn()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => zoomOut()}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="Reset map"
                aria-label="Reset map"
                onClick={() => resetTransform()}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/90 text-slate-950">
                possible targets
              </Badge>
              {selectedOriginId ? (
                <Button type="button" variant="secondary" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              ) : null}
            </div>

            <TransformComponent wrapperClass="h-full min-h-[520px] w-full" contentClass="h-full w-full">
              <svg
                aria-label="Global Power Game map"
                role="img"
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="h-full min-h-[520px] w-full touch-none bg-[#102132]"
              >
                <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#102132" />
                <defs>
                  <marker id="draft-order-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#facc15" />
                  </marker>
                </defs>
                <path d="M0 520 C180 480 250 585 390 535 S690 470 800 560 1010 650 1120 600 V680 H0 Z" fill="#17384b" />
                <path d="M0 140 C210 85 350 145 520 95 S780 45 1120 95 V0 H0 Z" fill="#0b1b2a" opacity="0.7" />

                {edges.map((edge) => {
                  const fromRegion = regionsById.get(edge.fromRegionId);
                  const toRegion = regionsById.get(edge.toRegionId);

                  if (!fromRegion || !toRegion) {
                    return null;
                  }

                  return (
                    <line
                      key={edge.id}
                      x1={fromRegion.svgX}
                      y1={fromRegion.svgY}
                      x2={toRegion.svgX}
                      y2={toRegion.svgY}
                      stroke={edge.edgeType === "special_land_bridge" ? "#f59e0b" : "#8fb4c8"}
                      strokeWidth={edge.edgeType === "special_land_bridge" ? 4 : 2}
                      strokeDasharray={edge.edgeType === "special_land_bridge" ? "10 8" : undefined}
                      opacity={edge.edgeType === "special_land_bridge" ? 0.82 : 0.46}
                    />
                  );
                })}

                {draftOrders.map((order) => {
                  if (!order.originRegionId || !order.targetRegionId || order.parentOrderId) {
                    return null;
                  }

                  const originRegion = regionsById.get(order.originRegionId);
                  const targetRegion = regionsById.get(order.targetRegionId);

                  if (!originRegion || !targetRegion) {
                    return null;
                  }

                  return (
                    <line
                      key={order.id}
                      x1={originRegion.svgX}
                      y1={originRegion.svgY}
                      x2={targetRegion.svgX}
                      y2={targetRegion.svgY}
                      stroke="#facc15"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={order.status === "submitted_pending" ? "8 8" : "14 8"}
                      markerEnd="url(#draft-order-arrow)"
                      opacity={0.88}
                    />
                  );
                })}

                {regions.map((region) => {
                  const controllerId = controlsByRegionId.get(region.id) ?? null;
                  const controller = controllerId ? countriesById.get(controllerId) ?? null : null;
                  const stacks = stacksByRegionId.get(region.id) ?? [];
                  const isPossibleTarget = possibleTargetIds.includes(region.id);
                  const isOrigin = selectedOriginId === region.id;
                  const isTarget = selectedTargetId === region.id;
                  const fill = getRegionFill(region, controller);

                  return (
                    <g key={region.id} onClick={() => handleRegionClick(region.id)} className="cursor-pointer">
                      <circle
                        cx={region.svgX}
                        cy={region.svgY}
                        r={getRegionRadius(region)}
                        fill={fill}
                        stroke={isTarget ? "#ffffff" : isOrigin ? "#facc15" : isPossibleTarget ? "#22c55e" : "#dbeafe"}
                        strokeWidth={isTarget ? 7 : isOrigin ? 6 : isPossibleTarget ? 5 : 2}
                        strokeDasharray={isPossibleTarget && !isTarget ? "8 6" : undefined}
                        opacity={isPossibleTarget || isOrigin || isTarget ? 1 : 0.92}
                      />
                      <text
                        x={region.svgLabelX ?? region.svgX}
                        y={region.svgLabelY ?? region.svgY - 24}
                        textAnchor="middle"
                        className="pointer-events-none select-none fill-white text-[18px] font-semibold"
                      >
                        {region.englishName}
                      </text>
                      <text
                        x={region.svgX}
                        y={region.svgY + 6}
                        textAnchor="middle"
                        className="pointer-events-none select-none fill-slate-950 text-[15px] font-bold"
                      >
                        {controller?.id.toUpperCase() ?? "OPEN"}
                      </text>
                      <UnitChips region={region} stacks={stacks} countriesById={countriesById} />
                    </g>
                  );
                })}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-semibold">{selectedRegion?.englishName ?? "No region selected"}</p>
            <p className="text-xs text-slate-300">
              {selectedController ? countriesById.get(selectedController)?.englishName ?? selectedController : "Neutral"}
              {selectedOriginId ? ` - ${possibleTargetIds.length} possible targets` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedStacks.length > 0 ? (
              selectedStacks.map((stack) => (
                <Badge key={stack.id} variant="secondary" className="bg-white text-slate-950">
                  {stack.countryId.toUpperCase()} {stack.unitType} x{stack.count}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-white/40 text-white">
                No units
              </Badge>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function groupUnitStacksByRegion(unitStacks: UnitStackDTO[]) {
  const map = new Map<RegionId, UnitStackDTO[]>();

  for (const stack of unitStacks) {
    const existingStacks = map.get(stack.regionId) ?? [];
    map.set(stack.regionId, [...existingStacks, stack]);
  }

  return map;
}

function getRegionFill(region: RegionDTO, controller: CountryDTO | null) {
  if (controller?.color) {
    return controller.color;
  }

  if (region.kind === "sea_zone" || region.kind === "strait") {
    return "#256f92";
  }

  if (region.isResource) {
    return "#7a8f38";
  }

  return "#64748b";
}

function getRegionRadius(region: RegionDTO) {
  if (region.kind === "sea_zone" || region.kind === "strait") {
    return 38;
  }

  if (region.isResource) {
    return 42;
  }

  return 36;
}

function UnitChips({
  region,
  stacks,
  countriesById,
}: {
  region: RegionDTO;
  stacks: UnitStackDTO[];
  countriesById: Map<CountryId, CountryDTO>;
}) {
  return (
    <g>
      {stacks.map((stack, index) => {
        const country = countriesById.get(stack.countryId);
        const x = region.svgX - 30 + index * 30;
        const y = region.svgY + 34;

        return (
          <g key={stack.id}>
            <rect x={x} y={y} width="56" height="24" rx="5" fill="#f8fafc" stroke={country?.color ?? "#0f172a"} />
            <text
              x={x + 28}
              y={y + 17}
              textAnchor="middle"
              className={cn("pointer-events-none select-none fill-slate-950 text-[13px] font-bold")}
            >
              {stack.unitType === "army" ? "A" : "N"} {stack.count}
            </text>
          </g>
        );
      })}
    </g>
  );
}
