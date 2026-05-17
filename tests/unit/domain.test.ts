import { describe, expect, it } from "vitest";
import {
  COASTAL_REGION_IDS,
  COUNTRY_IDS,
  HOMELAND_REGION_IDS,
  REGION_IDS,
  RESOURCE_REGION_IDS,
  SEA_OR_STRAIT_REGION_IDS,
  SEA_REGION_IDS,
  STRAIT_REGION_IDS,
  isCountryId,
  isRegionId,
} from "@/rules-engine/domainIds";
import type { CountryId, RegionId } from "@/rules-engine/types";

describe("domain identifiers", () => {
  it("exposes the canonical country and region ids", () => {
    expect(COUNTRY_IDS).toHaveLength(9);
    expect(REGION_IDS).toHaveLength(23);
    expect(new Set(COUNTRY_IDS).size).toBe(COUNTRY_IDS.length);
    expect(new Set(REGION_IDS).size).toBe(REGION_IDS.length);
  });

  it("exposes canonical region groups", () => {
    expect(RESOURCE_REGION_IDS).toEqual(["asean", "central_asia", "middle_east"]);
    expect(SEA_REGION_IDS).toEqual(["south_china_sea"]);
    expect(STRAIT_REGION_IDS).toEqual(["malacca_strait", "hormuz_strait", "giuk_gap"]);
    expect(SEA_OR_STRAIT_REGION_IDS).toEqual([
      "south_china_sea",
      "malacca_strait",
      "hormuz_strait",
      "giuk_gap",
    ]);
    expect(HOMELAND_REGION_IDS).toHaveLength(15);
    expect(COASTAL_REGION_IDS).toContain("usa_homeland_atlantic");
    expect(COASTAL_REGION_IDS).toContain("taiwan");
  });

  it("guards dynamic strings into stable domain ids", () => {
    const country: string = "taiwan";
    const region: string = "south_china_sea";

    expect(isCountryId(country)).toBe(true);
    expect(isRegionId(region)).toBe(true);
    expect(isCountryId("atlantis")).toBe(false);
    expect(isRegionId("moon_base")).toBe(false);

    if (isCountryId(country) && isRegionId(region)) {
      const typedCountry: CountryId = country;
      const typedRegion: RegionId = region;
      expect(typedCountry).toBe("taiwan");
      expect(typedRegion).toBe("south_china_sea");
    }
  });
});
