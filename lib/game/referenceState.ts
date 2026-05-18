import type {
  CountryDTO,
  CountryNavalAccessDTO,
  PublicGameStateDTO,
  RegionControlDTO,
  RegionDTO,
  RegionEdgeDTO,
  UnitStackDTO,
} from "@/lib/api/types";
import {
  COUNTRY_NAVAL_ACCESS_SEEDS,
  COUNTRY_SEEDS,
  LAND_EDGE_SEEDS,
  REGION_SEEDS,
} from "@/prisma/seedData";
import type { CountryId, RegionId, UnitType } from "@/rules-engine/types";

const REFERENCE_UPDATED_AT = "2026-05-18T00:00:00.000Z";
const REFERENCE_GAME_ID = "reference-game";
const REFERENCE_ROUND_ID = "reference-round-1";

type ReferenceUnitStackSeed = {
  countryId: CountryId;
  regionId: RegionId;
  unitType: UnitType;
  count: number;
};

const REFERENCE_UNIT_STACKS: readonly ReferenceUnitStackSeed[] = [
  { countryId: "usa", regionId: "usa_homeland_atlantic", unitType: "army", count: 3 },
  { countryId: "usa", regionId: "usa_indo_pacific_base", unitType: "navy", count: 4 },
  { countryId: "china", regionId: "china_western_frontier", unitType: "army", count: 2 },
  { countryId: "china", regionId: "china_eastern_coast", unitType: "army", count: 2 },
  { countryId: "china", regionId: "china_eastern_coast", unitType: "navy", count: 2 },
  { countryId: "russia", regionId: "russia_europe", unitType: "army", count: 2 },
  { countryId: "russia", regionId: "russia_far_east", unitType: "army", count: 1 },
  { countryId: "russia", regionId: "russia_europe", unitType: "navy", count: 1 },
  { countryId: "eu", regionId: "eu_eastern_flank", unitType: "army", count: 2 },
  { countryId: "eu", regionId: "eu_western_seaboard", unitType: "navy", count: 2 },
  { countryId: "india", regionId: "india_northern_border", unitType: "army", count: 2 },
  { countryId: "india", regionId: "india_peninsula", unitType: "navy", count: 2 },
  { countryId: "japan", regionId: "japan", unitType: "army", count: 1 },
  { countryId: "japan", regionId: "japan", unitType: "navy", count: 3 },
  { countryId: "ukraine", regionId: "ukraine", unitType: "army", count: 2 },
  { countryId: "taiwan", regionId: "taiwan", unitType: "army", count: 1 },
  { countryId: "taiwan", regionId: "taiwan", unitType: "navy", count: 1 },
  { countryId: "australia", regionId: "australia", unitType: "army", count: 1 },
  { countryId: "australia", regionId: "australia", unitType: "navy", count: 1 },
];

export function createReferencePublicState(): PublicGameStateDTO {
  const countries: CountryDTO[] = COUNTRY_SEEDS.map((country) => ({
    id: country.id,
    displayName: country.displayName,
    englishName: country.englishName,
    tier: country.tier,
    color: country.color,
    specialPowerKey: country.specialPowerKey,
    isLandlocked: country.isLandlocked,
  }));
  const regions: RegionDTO[] = REGION_SEEDS.map((region) => ({
    id: region.id,
    displayName: region.displayName,
    englishName: region.englishName,
    kind: region.kind,
    isResource: region.isResource,
    isHomeland: region.isHomeland,
    homelandCountryId: region.homelandCountryId,
    svgX: region.svgX,
    svgY: region.svgY,
    svgLabelX: region.svgLabelX,
    svgLabelY: region.svgLabelY,
    sortOrder: region.sortOrder,
  }));
  const edges: RegionEdgeDTO[] = LAND_EDGE_SEEDS.map((edge) => ({
    id: edge.id,
    fromRegionId: edge.fromRegionId,
    toRegionId: edge.toRegionId,
    edgeType: edge.edgeType,
    isBidirectional: edge.isBidirectional,
    note: edge.note,
  }));
  const controls: RegionControlDTO[] = regions.map((region) => ({
    id: `reference-control-${region.id}`,
    gameId: REFERENCE_GAME_ID,
    roundId: REFERENCE_ROUND_ID,
    regionId: region.id,
    countryId: region.homelandCountryId,
    controlType: region.homelandCountryId ? "controlled" : "neutral",
    serverVersion: 0,
    updatedAt: REFERENCE_UPDATED_AT,
  }));
  const unitStacks: UnitStackDTO[] = REFERENCE_UNIT_STACKS.map((stack, index) => ({
    id: `reference-stack-${index + 1}`,
    gameId: REFERENCE_GAME_ID,
    roundId: REFERENCE_ROUND_ID,
    countryId: stack.countryId,
    regionId: stack.regionId,
    unitType: stack.unitType,
    count: stack.count,
    status: "active",
    isExiled: false,
    serverVersion: 0,
    updatedAt: REFERENCE_UPDATED_AT,
  }));
  const navalAccess: CountryNavalAccessDTO[] = COUNTRY_NAVAL_ACCESS_SEEDS.map((access) => ({
    id: access.id,
    countryId: access.countryId,
    regionId: access.regionId,
    accessType: access.accessType,
    note: access.note,
    isReviewNeeded: access.isReviewNeeded,
  }));

  return {
    game: {
      id: REFERENCE_GAME_ID,
      code: "REFERENCE",
      name: "Reference Map",
      status: "reference",
      phase: "order_submission",
      currentRoundNumber: 1,
      serverVersion: 0,
      updatedAt: REFERENCE_UPDATED_AT,
    },
    round: {
      id: REFERENCE_ROUND_ID,
      gameId: REFERENCE_GAME_ID,
      number: 1,
      phase: "order_submission",
      deadlineAt: null,
      serverVersion: 0,
      updatedAt: REFERENCE_UPDATED_AT,
    },
    countries,
    regions,
    edges,
    controls,
    unitStacks,
    navalAccess,
    events: [],
    serverVersion: 0,
    updatedAt: REFERENCE_UPDATED_AT,
  };
}
