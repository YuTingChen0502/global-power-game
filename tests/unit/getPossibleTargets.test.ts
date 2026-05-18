import { describe, expect, it } from "vitest";
import { COUNTRY_NAVAL_ACCESS_SEEDS, LAND_EDGE_SEEDS } from "@/prisma/seedData";
import { SEA_OR_STRAIT_REGION_IDS } from "@/rules-engine/domainIds";
import { getPossibleTargets } from "@/rules-engine/getPossibleTargets";
import type { CountryId, RegionId, UnitType } from "@/rules-engine/types";

function targetIds(countryId: CountryId, originRegionId: RegionId, unitType: UnitType) {
  return getPossibleTargets({
    countryId,
    originRegionId,
    unitType,
    edges: LAND_EDGE_SEEDS,
    navalAccess: COUNTRY_NAVAL_ACCESS_SEEDS,
  }).targetRegionIds;
}

describe("getPossibleTargets", () => {
  it("does not let china_western_frontier target asean by land", () => {
    expect(targetIds("china", "china_western_frontier", "army")).not.toContain("asean");
  });

  it("lets india_northern_border target asean through the special bridge", () => {
    expect(targetIds("india", "india_northern_border", "army")).toContain("asean");
  });

  it("lets ukraine target middle_east through the special bridge", () => {
    expect(targetIds("ukraine", "ukraine", "army")).toContain("middle_east");
  });

  it("lets usa navy target all sea and strait regions", () => {
    const targets = targetIds("usa", "usa_indo_pacific_base", "navy");

    for (const regionId of SEA_OR_STRAIT_REGION_IDS) {
      expect(targets).toContain(regionId);
    }
  });

  it("gives ukraine navy no possible naval targets", () => {
    expect(targetIds("ukraine", "ukraine", "navy")).toEqual([]);
  });

  it("uses explicit nearby naval access for taiwan, china, and japan examples", () => {
    expect(targetIds("taiwan", "taiwan", "navy")).toEqual(["south_china_sea"]);
    expect(targetIds("china", "china_eastern_coast", "navy")).toEqual([
      "hormuz_strait",
      "malacca_strait",
      "south_china_sea",
    ]);
    expect(targetIds("japan", "japan", "navy")).toEqual([
      "malacca_strait",
      "south_china_sea",
      "usa_indo_pacific_base",
    ]);
  });
});
