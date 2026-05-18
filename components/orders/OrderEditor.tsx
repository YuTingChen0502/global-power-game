"use client";

import { AmphibiousOrderEditor } from "@/components/orders/AmphibiousOrderEditor";
import { LabelRow, SelectField } from "@/components/orders/OrderFields";
import { Textarea } from "@/components/ui/textarea";
import { normalizePayload, type DraftOrder } from "@/lib/orders/orderPlanning";
import { useGameStore } from "@/lib/store/gameStore";
import type { CountryId, OrderActionType, RegionId, UnitType } from "@/rules-engine/types";

type OrderEditorProps = {
  order: DraftOrder;
  onChange: (patch: Partial<DraftOrder>) => void;
};

const ACTION_OPTIONS: readonly { value: OrderActionType; label: string }[] = [
  { value: "move", label: "Move" },
  { value: "attack", label: "Attack" },
  { value: "defend", label: "Defend" },
  { value: "support_attack", label: "Support attack" },
  { value: "support_defend", label: "Support defend" },
  { value: "amphibious_attack", label: "Amphibious attack" },
  { value: "chip_disrupt", label: "Chip disrupt" },
  { value: "declare_embargo", label: "Declare embargo" },
  { value: "request_asylum", label: "Request asylum" },
];

const SUPPORT_ACTION_OPTIONS: readonly { value: OrderActionType; label: string }[] = [
  { value: "attack", label: "Attack" },
  { value: "defend", label: "Defend" },
  { value: "amphibious_attack", label: "Amphibious" },
];

export function OrderEditor({ order, onChange }: OrderEditorProps) {
  const regions = useGameStore((state) => state.regions);
  const countries = useGameStore((state) => state.countries);
  const payload = normalizePayload(order.payload);
  const regionOptions = regions.map((region) => ({ value: region.id, label: region.englishName }));
  const countryOptions = countries.map((country) => ({ value: country.id, label: country.englishName }));
  const usesMilitaryFields = !["request_asylum"].includes(order.actionType);
  const usesSupportFields = order.actionType === "support_attack" || order.actionType === "support_defend";

  function setPayloadNote(note: string) {
    onChange({
      payload: {
        ...payload,
        note,
      },
    });
  }

  return (
    <div className="grid gap-3">
      <LabelRow label="Action">
        <SelectField
          value={order.actionType}
          options={ACTION_OPTIONS}
          onChange={(value) => {
            const actionType = value as OrderActionType;
            onChange({
              actionType,
              unitType: actionType === "request_asylum" ? null : order.unitType ?? "army",
              unitCount: actionType === "request_asylum" ? null : order.unitCount ?? 1,
              targetRegionId: actionType === "defend" ? order.originRegionId : order.targetRegionId,
              countsTowardLimit: order.countsTowardLimit ?? true,
            });
          }}
        />
      </LabelRow>

      {usesMilitaryFields ? (
        <div className="grid grid-cols-2 gap-2">
          <LabelRow label="Origin">
            <SelectField
              value={order.originRegionId ?? ""}
              options={regionOptions}
              onChange={(value) => onChange({ originRegionId: emptyToNullRegion(value) })}
            />
          </LabelRow>
          <LabelRow label="Target">
            <SelectField
              value={order.targetRegionId ?? ""}
              options={regionOptions}
              onChange={(value) => onChange({ targetRegionId: emptyToNullRegion(value) })}
            />
          </LabelRow>
          <LabelRow label="Unit">
            <SelectField
              value={order.unitType ?? ""}
              options={[
                { value: "army", label: "Army" },
                { value: "navy", label: "Navy" },
              ]}
              onChange={(value) => onChange({ unitType: emptyToNullUnit(value) })}
            />
          </LabelRow>
          <LabelRow label="Count">
            <input
              type="number"
              min={1}
              max={99}
              value={order.unitCount ?? 1}
              onChange={(event) => onChange({ unitCount: Math.max(1, Number(event.target.value)) })}
              className="h-10 w-full rounded-md border border-white/15 bg-slate-950 px-2 text-sm text-white outline-none focus:border-cyan-300"
            />
          </LabelRow>
        </div>
      ) : null}

      {order.actionType === "request_asylum" ? (
        <LabelRow label="Host">
          <SelectField
            value={order.targetCountryId ?? ""}
            options={countryOptions}
            onChange={(value) => onChange({ targetCountryId: emptyToNullCountry(value) })}
          />
        </LabelRow>
      ) : null}

      {usesSupportFields ? (
        <div className="grid grid-cols-1 gap-2 rounded-md border border-white/10 bg-slate-950/60 p-2">
          <LabelRow label="Support country">
            <SelectField
              value={order.supportCountryId ?? ""}
              options={countryOptions}
              onChange={(value) => onChange({ supportCountryId: emptyToNullCountry(value) })}
            />
          </LabelRow>
          <div className="grid grid-cols-2 gap-2">
            <LabelRow label="Intent">
              <SelectField
                value={order.supportActionType ?? ""}
                options={SUPPORT_ACTION_OPTIONS}
                onChange={(value) => onChange({ supportActionType: value ? (value as OrderActionType) : null })}
              />
            </LabelRow>
            <LabelRow label="Intent target">
              <SelectField
                value={order.supportTargetRegionId ?? ""}
                options={regionOptions}
                onChange={(value) => onChange({ supportTargetRegionId: emptyToNullRegion(value) })}
              />
            </LabelRow>
          </div>
        </div>
      ) : null}

      {order.actionType === "amphibious_attack" ? <AmphibiousOrderEditor order={order} onChange={onChange} /> : null}

      <LabelRow label="Note">
        <Textarea
          value={typeof payload.note === "string" ? payload.note : ""}
          onChange={(event) => setPayloadNote(event.target.value)}
          className="min-h-16 border-white/15 bg-slate-950 text-white"
        />
      </LabelRow>
    </div>
  );
}

function emptyToNullRegion(value: string): RegionId | null {
  return value ? (value as RegionId) : null;
}

function emptyToNullCountry(value: string): CountryId | null {
  return value ? (value as CountryId) : null;
}

function emptyToNullUnit(value: string): UnitType | null {
  return value ? (value as UnitType) : null;
}
