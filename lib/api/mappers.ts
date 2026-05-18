import type {
  CountryDTO,
  CountryNavalAccessDTO,
  GameDTO,
  GameEventDTO,
  RegionControlDTO,
  RegionDTO,
  RegionEdgeDTO,
  RoundDTO,
  UnitStackDTO,
} from "@/lib/api/types";
import { isCountryId, isRegionId } from "@/rules-engine/domainIds";
import type {
  CountryId,
  GameEventType,
  GamePhase,
  NavalAccessType,
  RegionEdgeType,
  RegionId,
  RegionKind,
  UnitType,
} from "@/rules-engine/types";

const GAME_PHASES = new Set<string>([
  "setup",
  "deployment",
  "order_submission",
  "admin_review",
  "adjudication_preview",
  "adjudication_committed",
  "published",
  "effect_selection",
  "paused",
  "completed",
]);

const REGION_KINDS = new Set<string>(["land", "coastal_land", "resource_land", "buffer_land", "sea_zone", "strait"]);
const REGION_EDGE_TYPES = new Set<string>(["land", "special_land_bridge"]);
const UNIT_TYPES = new Set<string>(["army", "navy"]);
const NAVAL_ACCESS_TYPES = new Set<string>(["global", "coastal", "home_port", "standard", "nearby_only", "review_needed"]);
const GAME_EVENT_TYPES = new Set<string>([
  "round_started",
  "phase_changed",
  "order_submitted",
  "order_invalidated",
  "battle_started",
  "naval_battle_resolved",
  "land_battle_resolved",
  "amphibious_stage_resolved",
  "unit_destroyed",
  "region_control_changed",
  "status_effect_created",
  "status_effect_resolved",
  "unit_adjustment_created",
  "hegemon_declared",
  "ruling_applied",
  "battle_report_published",
  "snapshot_created",
  "rollback_applied",
]);

export type GameRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  phase: string;
  currentRoundNumber: number;
  serverVersion: number;
  updatedAt: Date | string;
};

export type RoundRow = {
  id: string;
  gameId: string;
  number: number;
  phase: string;
  deadlineAt: Date | string | null;
  serverVersion: number;
  updatedAt: Date | string;
};

export type CountryRow = {
  id: string;
  displayName: string;
  englishName: string;
  tier: number;
  color: string | null;
  specialPowerKey: string | null;
  isLandlocked: boolean;
};

export type RegionRow = {
  id: string;
  displayName: string;
  englishName: string;
  kind: string;
  isResource: boolean;
  isHomeland: boolean;
  homelandCountryId: string | null;
  svgX: number;
  svgY: number;
  svgLabelX: number | null;
  svgLabelY: number | null;
  sortOrder: number;
};

export type RegionEdgeRow = {
  id: string;
  fromRegionId: string;
  toRegionId: string;
  edgeType: string;
  isBidirectional: boolean;
  note: string | null;
};

export type RegionControlRow = {
  id: string;
  gameId: string;
  roundId: string;
  regionId: string;
  countryId: string | null;
  controlType: string;
  serverVersion: number;
  updatedAt: Date | string;
};

export type UnitStackRow = {
  id: string;
  gameId: string;
  roundId: string;
  countryId: string;
  regionId: string;
  unitType: string;
  count: number;
  status: string;
  isExiled: boolean;
  serverVersion: number;
  updatedAt: Date | string;
};

export type CountryNavalAccessRow = {
  id: string;
  countryId: string;
  regionId: string;
  accessType: string;
  note: string | null;
  isReviewNeeded: boolean;
};

export type GameEventRow = {
  id: string;
  gameId: string;
  roundId: string | null;
  sequence: number;
  type: string;
  visibility: string;
  countryId: string | null;
  regionId: string | null;
  title: string | null;
  message: string | null;
  payload: unknown;
  serverVersion: number;
  occurredAt: Date | string;
  createdAt: Date | string;
};

export function toIsoString(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

export function toOptionalIsoString(value: Date | string | null) {
  return value === null ? null : toIsoString(value);
}

export function parseCountryId(value: string): CountryId {
  if (!isCountryId(value)) {
    throw new Error(`Unknown country id: ${value}`);
  }

  return value;
}

export function parseOptionalCountryId(value: string | null): CountryId | null {
  return value === null ? null : parseCountryId(value);
}

export function parseRegionId(value: string): RegionId {
  if (!isRegionId(value)) {
    throw new Error(`Unknown region id: ${value}`);
  }

  return value;
}

export function parseOptionalRegionId(value: string | null): RegionId | null {
  return value === null ? null : parseRegionId(value);
}

export function parseGamePhase(value: string): GamePhase {
  if (!GAME_PHASES.has(value)) {
    throw new Error(`Unknown game phase: ${value}`);
  }

  return value as GamePhase;
}

export function parseRegionKind(value: string): RegionKind {
  if (!REGION_KINDS.has(value)) {
    throw new Error(`Unknown region kind: ${value}`);
  }

  return value as RegionKind;
}

export function parseRegionEdgeType(value: string): RegionEdgeType {
  if (!REGION_EDGE_TYPES.has(value)) {
    throw new Error(`Unknown region edge type: ${value}`);
  }

  return value as RegionEdgeType;
}

export function parseUnitType(value: string): UnitType {
  if (!UNIT_TYPES.has(value)) {
    throw new Error(`Unknown unit type: ${value}`);
  }

  return value as UnitType;
}

export function parseNavalAccessType(value: string): NavalAccessType {
  if (!NAVAL_ACCESS_TYPES.has(value)) {
    throw new Error(`Unknown naval access type: ${value}`);
  }

  return value as NavalAccessType;
}

export function parseGameEventType(value: string): GameEventType {
  if (!GAME_EVENT_TYPES.has(value)) {
    throw new Error(`Unknown game event type: ${value}`);
  }

  return value as GameEventType;
}

export function mapGame(row: GameRow): GameDTO {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    phase: parseGamePhase(row.phase),
    currentRoundNumber: row.currentRoundNumber,
    serverVersion: row.serverVersion,
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapRound(row: RoundRow): RoundDTO {
  return {
    id: row.id,
    gameId: row.gameId,
    number: row.number,
    phase: parseGamePhase(row.phase),
    deadlineAt: toOptionalIsoString(row.deadlineAt),
    serverVersion: row.serverVersion,
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapCountry(row: CountryRow): CountryDTO {
  return {
    id: parseCountryId(row.id),
    displayName: row.displayName,
    englishName: row.englishName,
    tier: row.tier,
    color: row.color,
    specialPowerKey: row.specialPowerKey,
    isLandlocked: row.isLandlocked,
  };
}

export function mapRegion(row: RegionRow): RegionDTO {
  return {
    id: parseRegionId(row.id),
    displayName: row.displayName,
    englishName: row.englishName,
    kind: parseRegionKind(row.kind),
    isResource: row.isResource,
    isHomeland: row.isHomeland,
    homelandCountryId: parseOptionalCountryId(row.homelandCountryId),
    svgX: row.svgX,
    svgY: row.svgY,
    svgLabelX: row.svgLabelX,
    svgLabelY: row.svgLabelY,
    sortOrder: row.sortOrder,
  };
}

export function mapRegionEdge(row: RegionEdgeRow): RegionEdgeDTO {
  return {
    id: row.id,
    fromRegionId: parseRegionId(row.fromRegionId),
    toRegionId: parseRegionId(row.toRegionId),
    edgeType: parseRegionEdgeType(row.edgeType),
    isBidirectional: row.isBidirectional,
    note: row.note,
  };
}

export function mapRegionControl(row: RegionControlRow): RegionControlDTO {
  return {
    id: row.id,
    gameId: row.gameId,
    roundId: row.roundId,
    regionId: parseRegionId(row.regionId),
    countryId: parseOptionalCountryId(row.countryId),
    controlType: row.controlType,
    serverVersion: row.serverVersion,
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapUnitStack(row: UnitStackRow): UnitStackDTO {
  return {
    id: row.id,
    gameId: row.gameId,
    roundId: row.roundId,
    countryId: parseCountryId(row.countryId),
    regionId: parseRegionId(row.regionId),
    unitType: parseUnitType(row.unitType),
    count: row.count,
    status: row.status,
    isExiled: row.isExiled,
    serverVersion: row.serverVersion,
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapCountryNavalAccess(row: CountryNavalAccessRow): CountryNavalAccessDTO {
  return {
    id: row.id,
    countryId: parseCountryId(row.countryId),
    regionId: parseRegionId(row.regionId),
    accessType: parseNavalAccessType(row.accessType),
    note: row.note,
    isReviewNeeded: row.isReviewNeeded,
  };
}

export function mapGameEvent(row: GameEventRow): GameEventDTO {
  return {
    id: row.id,
    gameId: row.gameId,
    roundId: row.roundId,
    sequence: row.sequence,
    type: parseGameEventType(row.type),
    visibility: row.visibility,
    countryId: parseOptionalCountryId(row.countryId),
    regionId: parseOptionalRegionId(row.regionId),
    title: row.title,
    message: row.message,
    payload: row.payload,
    serverVersion: row.serverVersion,
    occurredAt: toIsoString(row.occurredAt),
    createdAt: toIsoString(row.createdAt),
  };
}
