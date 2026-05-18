"use client";

import { LabelRow, SelectField } from "@/components/orders/OrderFields";
import type { DraftOrder } from "@/lib/orders/orderPlanning";
import { useGameStore } from "@/lib/store/gameStore";
import { normalizePayload } from "@/lib/orders/orderPlanning";
import type { RegionId } from "@/rules-engine/types";

type AmphibiousOrderEditorProps = {
  order: DraftOrder;
  onChange: (patch: Partial<DraftOrder>) => void;
};

export function AmphibiousOrderEditor({ order, onChange }: AmphibiousOrderEditorProps) {
  const regions = useGameStore((state) => state.regions);
  const unitStacks = useGameStore((state) => state.unitStacks);
  const myCountryId = useGameStore((state) => state.myCountryId);
  const regionOptions = regions.map((region) => ({ value: region.id, label: region.englishName }));
  const armyOriginOptions = unitStacks
    .filter((stack) => stack.countryId === myCountryId && stack.unitType === "army" && stack.status === "active")
    .map((stack) => ({
      value: stack.regionId,
      label: `${regionLabel(stack.regionId, regions)} A${stack.count}`,
    }));
  const navalOriginOptions = unitStacks
    .filter((stack) => stack.countryId === myCountryId && stack.unitType === "navy" && stack.status === "active")
    .map((stack) => ({
      value: stack.regionId,
      label: `${regionLabel(stack.regionId, regions)} N${stack.count}`,
    }));
  const payload = normalizePayload(order.payload);

  function updatePayload(key: string, value: string) {
    onChange({
      payload: {
        ...payload,
        [key]: value,
      },
    });
  }

  return (
    <div className="grid gap-2 rounded-md border border-cyan-300/20 bg-cyan-950/30 p-2">
      <LabelRow label="Army">
        <SelectField
          value={(payload.armyOriginRegionId as RegionId | undefined) ?? order.originRegionId ?? ""}
          options={armyOriginOptions}
          onChange={(value) => updatePayload("armyOriginRegionId", value)}
        />
      </LabelRow>
      <LabelRow label="Navy">
        <SelectField
          value={(payload.navalOriginRegionId as RegionId | undefined) ?? order.originRegionId ?? ""}
          options={navalOriginOptions}
          onChange={(value) => updatePayload("navalOriginRegionId", value)}
        />
      </LabelRow>
      <LabelRow label="Landing">
        <SelectField
          value={(payload.landingTargetRegionId as RegionId | undefined) ?? order.targetRegionId ?? ""}
          options={regionOptions}
          onChange={(value) => {
            updatePayload("landingTargetRegionId", value);
            onChange({ targetRegionId: value as RegionId });
          }}
        />
      </LabelRow>
    </div>
  );
}

function regionLabel(regionId: RegionId, regions: readonly { id: RegionId; englishName: string }[]) {
  return regions.find((region) => region.id === regionId)?.englishName ?? regionId;
}
