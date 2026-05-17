import type { CountryId, RegionId } from "./types";

export const COUNTRY_IDS = [
  "usa",
  "china",
  "russia",
  "eu",
  "india",
  "japan",
  "ukraine",
  "taiwan",
  "australia",
] as const satisfies readonly CountryId[];

export const REGION_IDS = [
  "china_eastern_coast",
  "china_western_frontier",
  "china_northern_command",
  "usa_indo_pacific_base",
  "usa_homeland_atlantic",
  "russia_europe",
  "russia_far_east",
  "india_northern_border",
  "india_peninsula",
  "eu_eastern_flank",
  "eu_western_seaboard",
  "japan",
  "taiwan",
  "australia",
  "ukraine",
  "asean",
  "central_asia",
  "middle_east",
  "korean_peninsula",
  "south_china_sea",
  "malacca_strait",
  "hormuz_strait",
  "giuk_gap",
] as const satisfies readonly RegionId[];

export const RESOURCE_REGION_IDS = ["asean", "central_asia", "middle_east"] as const satisfies readonly RegionId[];

export const SEA_REGION_IDS = ["south_china_sea"] as const satisfies readonly RegionId[];

export const STRAIT_REGION_IDS = ["malacca_strait", "hormuz_strait", "giuk_gap"] as const satisfies readonly RegionId[];

export const SEA_OR_STRAIT_REGION_IDS = [
  "south_china_sea",
  "malacca_strait",
  "hormuz_strait",
  "giuk_gap",
] as const satisfies readonly RegionId[];

export const HOMELAND_REGION_IDS = [
  "china_eastern_coast",
  "china_western_frontier",
  "china_northern_command",
  "usa_indo_pacific_base",
  "usa_homeland_atlantic",
  "russia_europe",
  "russia_far_east",
  "india_northern_border",
  "india_peninsula",
  "eu_eastern_flank",
  "eu_western_seaboard",
  "japan",
  "taiwan",
  "australia",
  "ukraine",
] as const satisfies readonly RegionId[];

export const COASTAL_REGION_IDS = [
  "china_eastern_coast",
  "usa_indo_pacific_base",
  "usa_homeland_atlantic",
  "russia_europe",
  "russia_far_east",
  "india_peninsula",
  "eu_western_seaboard",
  "japan",
  "taiwan",
  "australia",
] as const satisfies readonly RegionId[];

const COUNTRY_ID_SET = new Set<string>(COUNTRY_IDS);
const REGION_ID_SET = new Set<string>(REGION_IDS);

export function isCountryId(value: string): value is CountryId {
  return COUNTRY_ID_SET.has(value);
}

export function isRegionId(value: string): value is RegionId {
  return REGION_ID_SET.has(value);
}
