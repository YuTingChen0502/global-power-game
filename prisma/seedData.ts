import {
  COASTAL_REGION_IDS,
  RESOURCE_REGION_IDS,
  SEA_OR_STRAIT_REGION_IDS,
  SEA_REGION_IDS,
  STRAIT_REGION_IDS,
} from "../rules-engine/domainIds";
import type {
  CountryId,
  NavalAccessType,
  RegionEdgeType,
  RegionId,
  RegionKind,
  SpecialPowerKey,
} from "../rules-engine/types";

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type CountrySeed = {
  readonly id: CountryId;
  readonly displayName: string;
  readonly englishName: string;
  readonly tier: number;
  readonly initialArmy: number;
  readonly initialNavy: number;
  readonly color: string;
  readonly specialPowerKey: SpecialPowerKey | null;
  readonly isLandlocked: boolean;
  readonly metadata: JsonObject;
};

export type RegionSeed = {
  readonly id: RegionId;
  readonly displayName: string;
  readonly englishName: string;
  readonly kind: RegionKind;
  readonly isResource: boolean;
  readonly isHomeland: boolean;
  readonly homelandCountryId: CountryId | null;
  readonly svgX: number;
  readonly svgY: number;
  readonly svgLabelX: number;
  readonly svgLabelY: number;
  readonly sortOrder: number;
  readonly metadata: JsonObject;
};

export type RegionEdgeSeed = {
  readonly id: string;
  readonly fromRegionId: RegionId;
  readonly toRegionId: RegionId;
  readonly edgeType: RegionEdgeType;
  readonly isBidirectional: boolean;
  readonly note: string | null;
  readonly metadata: JsonObject;
};

export type CountryNavalAccessSeed = {
  readonly id: string;
  readonly countryId: CountryId;
  readonly regionId: RegionId;
  readonly accessType: NavalAccessType;
  readonly note: string | null;
  readonly isReviewNeeded: boolean;
};

export type DefaultRulesetConfig = {
  readonly maxCountableOrders: number;
  readonly hegemonThreshold: number;
  readonly resourceRegionIds: readonly RegionId[];
  readonly chipTiming: "same_round_pre_combat";
  readonly embargoTiming: "next_round_pending_selection";
  readonly doubleParalysis: {
    readonly configurable: true;
    readonly defaultBehavior: "defense_zero_then_direct_destruction_if_attacked";
  };
  readonly homelandCongestionFallback: {
    readonly enabledByDefault: false;
  };
  readonly specialBridgeBehavior: {
    readonly edgeType: "special_land_bridge";
    readonly legalForLandMovement: true;
    readonly notesRequired: true;
  };
  readonly supportCutRule: "admin_only";
  readonly amphibious: {
    readonly requiresStrictLandSuperiority: true;
    readonly oneVsOneLandingFails: true;
    readonly parentOrderCounts: true;
    readonly childOrdersCount: false;
  };
  readonly koreanPeninsulaResourceBonus: false;
};

const seedMetadata = {
  source: "phase_1_seed",
  rulesSource: "docs/RULES.md",
} as const satisfies JsonObject;

const RESOURCE_REGION_ID_SET: ReadonlySet<RegionId> = new Set(RESOURCE_REGION_IDS);
const SEA_REGION_ID_SET: ReadonlySet<RegionId> = new Set(SEA_REGION_IDS);
const STRAIT_REGION_ID_SET: ReadonlySet<RegionId> = new Set(STRAIT_REGION_IDS);

export const COUNTRY_SEEDS = [
  {
    id: "usa",
    displayName: "美國",
    englishName: "United States",
    tier: 1,
    initialArmy: 3,
    initialNavy: 4,
    color: "#2563eb",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "global naval reach" },
  },
  {
    id: "china",
    displayName: "中國",
    englishName: "China",
    tier: 1,
    initialArmy: 4,
    initialNavy: 2,
    color: "#dc2626",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "land expansion" },
  },
  {
    id: "russia",
    displayName: "俄羅斯",
    englishName: "Russia",
    tier: 2,
    initialArmy: 3,
    initialNavy: 1,
    color: "#7c3aed",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "buffer seeker" },
  },
  {
    id: "eu",
    displayName: "歐盟",
    englishName: "European Union",
    tier: 2,
    initialArmy: 2,
    initialNavy: 2,
    color: "#0891b2",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "collective security" },
  },
  {
    id: "india",
    displayName: "印度",
    englishName: "India",
    tier: 2,
    initialArmy: 2,
    initialNavy: 2,
    color: "#ea580c",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "non-aligned" },
  },
  {
    id: "japan",
    displayName: "日本",
    englishName: "Japan",
    tier: 2,
    initialArmy: 1,
    initialNavy: 3,
    color: "#db2777",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "maritime barrier" },
  },
  {
    id: "ukraine",
    displayName: "烏克蘭",
    englishName: "Ukraine",
    tier: 3,
    initialArmy: 2,
    initialNavy: 0,
    color: "#facc15",
    specialPowerKey: null,
    isLandlocked: true,
    metadata: { ...seedMetadata, note: "landlocked" },
  },
  {
    id: "taiwan",
    displayName: "台灣",
    englishName: "Taiwan",
    tier: 3,
    initialArmy: 1,
    initialNavy: 1,
    color: "#16a34a",
    specialPowerKey: "chip_disruption",
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "chip disruption" },
  },
  {
    id: "australia",
    displayName: "澳洲",
    englishName: "Australia",
    tier: 3,
    initialArmy: 1,
    initialNavy: 1,
    color: "#0f766e",
    specialPowerKey: null,
    isLandlocked: false,
    metadata: { ...seedMetadata, note: "logistics base" },
  },
] as const satisfies readonly CountrySeed[];

export const REGION_SEEDS = [
  region("china_eastern_coast", "中國東部沿海", "China Eastern Coast", "coastal_land", true, "china", 880, 310, 880, 284, 1),
  region(
    "china_western_frontier",
    "中國西部邊疆",
    "China Western Frontier",
    "land",
    true,
    "china",
    760,
    305,
    760,
    278,
    2,
  ),
  region(
    "china_northern_command",
    "中國北部戰區",
    "China Northern Command",
    "land",
    true,
    "china",
    830,
    215,
    830,
    188,
    3,
  ),
  region(
    "usa_indo_pacific_base",
    "美國印太基地",
    "US Indo-Pacific Base",
    "coastal_land",
    true,
    "usa",
    1015,
    430,
    1015,
    403,
    4,
  ),
  region(
    "usa_homeland_atlantic",
    "美國本土大西洋",
    "US Homeland Atlantic",
    "coastal_land",
    true,
    "usa",
    150,
    260,
    150,
    233,
    5,
  ),
  region("russia_europe", "俄羅斯歐洲", "Russia Europe", "coastal_land", true, "russia", 610, 170, 610, 143, 6),
  region(
    "russia_far_east",
    "俄羅斯遠東",
    "Russia Far East",
    "coastal_land",
    true,
    "russia",
    930,
    145,
    930,
    118,
    7,
  ),
  region(
    "india_northern_border",
    "印度北部邊境",
    "India Northern Border",
    "land",
    true,
    "india",
    705,
    365,
    705,
    338,
    8,
  ),
  region("india_peninsula", "印度半島", "India Peninsula", "coastal_land", true, "india", 720, 470, 720, 443, 9),
  region("eu_eastern_flank", "歐盟東翼", "EU Eastern Flank", "land", true, "eu", 500, 245, 500, 218, 10),
  region(
    "eu_western_seaboard",
    "歐盟西部海岸",
    "EU Western Seaboard",
    "coastal_land",
    true,
    "eu",
    420,
    230,
    420,
    203,
    11,
  ),
  region("japan", "日本", "Japan", "coastal_land", true, "japan", 990, 280, 990, 253, 12),
  region("taiwan", "台灣", "Taiwan", "coastal_land", true, "taiwan", 930, 360, 930, 333, 13),
  region("australia", "澳洲", "Australia", "coastal_land", true, "australia", 925, 570, 925, 543, 14),
  region("ukraine", "烏克蘭", "Ukraine", "land", true, "ukraine", 560, 245, 560, 218, 15),
  region("asean", "東協", "ASEAN", "resource_land", false, null, 855, 440, 855, 413, 16),
  region("central_asia", "中亞", "Central Asia", "resource_land", false, null, 670, 285, 670, 258, 17),
  region("middle_east", "中東", "Middle East", "resource_land", false, null, 590, 365, 590, 338, 18),
  region(
    "korean_peninsula",
    "朝鮮半島",
    "Korean Peninsula",
    "buffer_land",
    false,
    null,
    935,
    245,
    935,
    218,
    19,
  ),
  region("south_china_sea", "南海", "South China Sea", "sea_zone", false, null, 910, 425, 910, 398, 20),
  region("malacca_strait", "馬六甲海峽", "Malacca Strait", "strait", false, null, 815, 520, 815, 493, 21),
  region("hormuz_strait", "霍爾木茲海峽", "Hormuz Strait", "strait", false, null, 610, 445, 610, 418, 22),
  region("giuk_gap", "GIUK缺口", "GIUK Gap", "strait", false, null, 365, 125, 365, 98, 23),
] as const satisfies readonly RegionSeed[];

const normalLandPairs = [
  ["china_eastern_coast", "china_western_frontier"],
  ["china_eastern_coast", "china_northern_command"],
  ["china_western_frontier", "china_northern_command"],
  ["china_eastern_coast", "korean_peninsula"],
  ["korean_peninsula", "china_northern_command"],
  ["china_northern_command", "russia_far_east"],
  ["china_western_frontier", "central_asia"],
  ["central_asia", "russia_europe"],
  ["china_western_frontier", "india_northern_border"],
  ["india_northern_border", "central_asia"],
  ["india_northern_border", "india_peninsula"],
  ["china_eastern_coast", "asean"],
  ["korean_peninsula", "russia_far_east"],
  ["russia_europe", "ukraine"],
  ["ukraine", "eu_eastern_flank"],
  ["eu_eastern_flank", "eu_western_seaboard"],
  ["russia_europe", "eu_eastern_flank"],
] as const satisfies readonly (readonly [RegionId, RegionId])[];

const specialLandBridgePairs = [
  ["india_northern_border", "asean", "經緬甸"],
  ["eu_eastern_flank", "middle_east", "經土耳其"],
  ["ukraine", "middle_east", "經土耳其陸橋"],
  ["central_asia", "middle_east", "經伊朗"],
] as const satisfies readonly (readonly [RegionId, RegionId, string])[];

export const LAND_EDGE_SEEDS = [
  ...normalLandPairs.map(([fromRegionId, toRegionId]) => edge(fromRegionId, toRegionId, "land", null)),
  ...specialLandBridgePairs.map(([fromRegionId, toRegionId, note]) =>
    edge(fromRegionId, toRegionId, "special_land_bridge", note),
  ),
] as const satisfies readonly RegionEdgeSeed[];

export const COUNTRY_NAVAL_ACCESS_SEEDS = [
  ...SEA_OR_STRAIT_REGION_IDS.map((regionId) => navalAccess("usa", regionId, "global", null)),
  ...COASTAL_REGION_IDS.map((regionId) => navalAccess("usa", regionId, "coastal", null)),
  navalAccess("russia", "giuk_gap", "standard", null),
  navalAccess("russia", "south_china_sea", "standard", null),
  navalAccess("russia", "russia_europe", "home_port", null),
  navalAccess("russia", "russia_far_east", "home_port", null),
  navalAccess("russia", "eu_western_seaboard", "nearby_only", "nearby_only: European theater coastal access"),
  navalAccess("russia", "japan", "nearby_only", "nearby_only: Far East coastal access"),
  navalAccess("russia", "china_eastern_coast", "nearby_only", "nearby_only: adjacent coastal theater"),
  navalAccess("china", "south_china_sea", "standard", null),
  navalAccess("china", "malacca_strait", "standard", null),
  navalAccess("china", "hormuz_strait", "standard", null),
  navalAccess("china", "china_eastern_coast", "home_port", null),
  navalAccess("japan", "south_china_sea", "standard", null),
  navalAccess("japan", "malacca_strait", "standard", null),
  navalAccess("japan", "japan", "home_port", null),
  navalAccess("japan", "usa_indo_pacific_base", "standard", null),
  navalAccess("australia", "south_china_sea", "standard", null),
  navalAccess("australia", "malacca_strait", "standard", null),
  navalAccess("australia", "hormuz_strait", "standard", null),
  navalAccess("australia", "australia", "home_port", null),
  navalAccess("india", "malacca_strait", "review_needed", "REVIEW_NEEDED: India eastern naval access edge cases"),
  navalAccess("india", "hormuz_strait", "review_needed", "REVIEW_NEEDED: India western naval access edge cases"),
  navalAccess("india", "india_peninsula", "review_needed", "REVIEW_NEEDED: home-port access is explicit; movement edge cases remain"),
  navalAccess("eu", "giuk_gap", "standard", null),
  navalAccess("eu", "eu_western_seaboard", "home_port", null),
  navalAccess("eu", "russia_europe", "nearby_only", "nearby_only; REVIEW_NEEDED: EU northern theater access"),
  navalAccess("taiwan", "south_china_sea", "nearby_only", "nearby_only; REVIEW_NEEDED: Taiwan nearby waters"),
  navalAccess("taiwan", "taiwan", "home_port", "nearby_only; REVIEW_NEEDED: Taiwan home coastal access"),
] as const satisfies readonly CountryNavalAccessSeed[];

export const DEFAULT_RULESET_KEY = "default";

export const DEFAULT_RULESET_CONFIG = {
  maxCountableOrders: 8,
  hegemonThreshold: 8,
  resourceRegionIds: RESOURCE_REGION_IDS,
  chipTiming: "same_round_pre_combat",
  embargoTiming: "next_round_pending_selection",
  doubleParalysis: {
    configurable: true,
    defaultBehavior: "defense_zero_then_direct_destruction_if_attacked",
  },
  homelandCongestionFallback: {
    enabledByDefault: false,
  },
  specialBridgeBehavior: {
    edgeType: "special_land_bridge",
    legalForLandMovement: true,
    notesRequired: true,
  },
  supportCutRule: "admin_only",
  amphibious: {
    requiresStrictLandSuperiority: true,
    oneVsOneLandingFails: true,
    parentOrderCounts: true,
    childOrdersCount: false,
  },
  koreanPeninsulaResourceBonus: false,
} as const satisfies DefaultRulesetConfig;

export const DEFAULT_RULESET_SEED = {
  key: DEFAULT_RULESET_KEY,
  name: "Default classroom ruleset",
  version: 1,
  status: "active",
  config: DEFAULT_RULESET_CONFIG,
} as const;

function region(
  id: RegionId,
  displayName: string,
  englishName: string,
  kind: RegionKind,
  isHomeland: boolean,
  homelandCountryId: CountryId | null,
  svgX: number,
  svgY: number,
  svgLabelX: number,
  svgLabelY: number,
  sortOrder: number,
): RegionSeed {
  return {
    id,
    displayName,
    englishName,
    kind,
    isResource: RESOURCE_REGION_ID_SET.has(id),
    isHomeland,
    homelandCountryId,
    svgX,
    svgY,
    svgLabelX,
    svgLabelY,
    sortOrder,
    metadata: {
      ...seedMetadata,
      mapProjection: "phase_1_placeholder_svg",
      seaRegion: SEA_REGION_ID_SET.has(id),
      straitRegion: STRAIT_REGION_ID_SET.has(id),
    },
  };
}

function edge(
  fromRegionId: RegionId,
  toRegionId: RegionId,
  edgeType: RegionEdgeType,
  note: string | null,
): RegionEdgeSeed {
  return {
    id: `${fromRegionId}__${toRegionId}__${edgeType}`,
    fromRegionId,
    toRegionId,
    edgeType,
    isBidirectional: true,
    note,
    metadata: seedMetadata,
  };
}

function navalAccess(
  countryId: CountryId,
  regionId: RegionId,
  accessType: NavalAccessType,
  note: string | null,
): CountryNavalAccessSeed {
  return {
    id: `${countryId}__${regionId}`,
    countryId,
    regionId,
    accessType,
    note,
    isReviewNeeded: accessType === "review_needed" || Boolean(note?.includes("REVIEW_NEEDED")),
  };
}
