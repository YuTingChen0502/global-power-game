import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COASTAL_REGION_IDS, RESOURCE_REGION_IDS, SEA_OR_STRAIT_REGION_IDS } from "@/rules-engine/domainIds";
import type { CountryId, RegionId } from "@/rules-engine/types";
import {
  COUNTRY_NAVAL_ACCESS_SEEDS,
  COUNTRY_SEEDS,
  DEFAULT_RULESET_CONFIG,
  DEFAULT_RULESET_SEED,
  LAND_EDGE_SEEDS,
  REGION_SEEDS,
} from "@/prisma/seedData";

function getCountry(countryId: CountryId) {
  const country = COUNTRY_SEEDS.find((item) => item.id === countryId);

  if (!country) {
    throw new Error(`Missing country seed: ${countryId}`);
  }

  return country;
}

function getRegion(regionId: RegionId) {
  const region = REGION_SEEDS.find((item) => item.id === regionId);

  if (!region) {
    throw new Error(`Missing region seed: ${regionId}`);
  }

  return region;
}

function hasLandEdge(fromRegionId: RegionId, toRegionId: RegionId) {
  return LAND_EDGE_SEEDS.some((edge) => {
    const direct = edge.fromRegionId === fromRegionId && edge.toRegionId === toRegionId;
    const reverse = edge.isBidirectional && edge.fromRegionId === toRegionId && edge.toRegionId === fromRegionId;
    return direct || reverse;
  });
}

function getLandEdge(fromRegionId: RegionId, toRegionId: RegionId) {
  return LAND_EDGE_SEEDS.find((edge) => {
    const direct = edge.fromRegionId === fromRegionId && edge.toRegionId === toRegionId;
    const reverse = edge.isBidirectional && edge.fromRegionId === toRegionId && edge.toRegionId === fromRegionId;
    return direct || reverse;
  });
}

function hasNavalAccess(countryId: CountryId, regionId: RegionId) {
  return COUNTRY_NAVAL_ACCESS_SEEDS.some((access) => access.countryId === countryId && access.regionId === regionId);
}

describe("Phase 1 seed data", () => {
  it("seeds exactly 9 countries with the rules initial unit totals", () => {
    expect(COUNTRY_SEEDS).toHaveLength(9);
    expect(getCountry("usa")).toMatchObject({ initialArmy: 3, initialNavy: 4 });
    expect(getCountry("china")).toMatchObject({ initialArmy: 4, initialNavy: 2 });
    expect(getCountry("russia")).toMatchObject({ initialArmy: 3, initialNavy: 1 });
    expect(getCountry("eu")).toMatchObject({ initialArmy: 2, initialNavy: 2 });
    expect(getCountry("india")).toMatchObject({ initialArmy: 2, initialNavy: 2 });
    expect(getCountry("japan")).toMatchObject({ initialArmy: 1, initialNavy: 3 });
    expect(getCountry("ukraine")).toMatchObject({ initialArmy: 2, initialNavy: 0, isLandlocked: true });
    expect(getCountry("taiwan")).toMatchObject({
      initialArmy: 1,
      initialNavy: 1,
      specialPowerKey: "chip_disruption",
    });
    expect(getCountry("australia")).toMatchObject({ initialArmy: 1, initialNavy: 1 });
  });

  it("seeds exactly 23 regions and only the three resource regions", () => {
    expect(REGION_SEEDS).toHaveLength(23);
    expect(getRegion("korean_peninsula").isResource).toBe(false);
    expect(getRegion("korean_peninsula").kind).toBe("buffer_land");

    const resourceRegionIds = REGION_SEEDS.filter((region) => region.isResource).map((region) => region.id);
    expect(resourceRegionIds).toEqual([...RESOURCE_REGION_IDS]);
  });

  it("seeds the required land edges and special land bridges", () => {
    expect(LAND_EDGE_SEEDS).toHaveLength(21);
    expect(hasLandEdge("china_western_frontier", "asean")).toBe(false);
    expect(hasLandEdge("russia_europe", "middle_east")).toBe(false);

    expect(getLandEdge("india_northern_border", "asean")).toMatchObject({
      edgeType: "special_land_bridge",
      note: "經緬甸",
    });
    expect(getLandEdge("ukraine", "middle_east")).toMatchObject({
      edgeType: "special_land_bridge",
      note: "經土耳其陸橋",
    });
    expect(getLandEdge("eu_eastern_flank", "middle_east")).toMatchObject({
      edgeType: "special_land_bridge",
      note: "經土耳其",
    });
    expect(getLandEdge("central_asia", "middle_east")).toMatchObject({
      edgeType: "special_land_bridge",
      note: "經伊朗",
    });
  });

  it("seeds explicit naval access with review notes for ambiguous countries", () => {
    for (const regionId of SEA_OR_STRAIT_REGION_IDS) {
      expect(hasNavalAccess("usa", regionId)).toBe(true);
    }

    for (const regionId of COASTAL_REGION_IDS) {
      expect(hasNavalAccess("usa", regionId)).toBe(true);
    }

    expect(COUNTRY_NAVAL_ACCESS_SEEDS.some((access) => access.countryId === "ukraine")).toBe(false);
    expect(COUNTRY_NAVAL_ACCESS_SEEDS.some((access) => access.countryId === "india" && access.isReviewNeeded)).toBe(
      true,
    );
    expect(
      COUNTRY_NAVAL_ACCESS_SEEDS.some(
        (access) => access.countryId === "eu" && access.note?.includes("nearby_only") === true,
      ),
    ).toBe(true);
    expect(
      COUNTRY_NAVAL_ACCESS_SEEDS.some(
        (access) => access.countryId === "taiwan" && access.note?.includes("REVIEW_NEEDED") === true,
      ),
    ).toBe(true);
  });

  it("seeds the default ruleset config", () => {
    expect(DEFAULT_RULESET_SEED.key).toBe("default");
    expect(DEFAULT_RULESET_CONFIG.maxCountableOrders).toBe(8);
    expect(DEFAULT_RULESET_CONFIG.hegemonThreshold).toBe(8);
    expect(DEFAULT_RULESET_CONFIG.resourceRegionIds).toEqual(["asean", "central_asia", "middle_east"]);
    expect(DEFAULT_RULESET_CONFIG.resourceRegionIds).not.toContain("korean_peninsula");
    expect(DEFAULT_RULESET_CONFIG.supportCutRule).toBe("admin_only");
    expect(DEFAULT_RULESET_CONFIG.homelandCongestionFallback.enabledByDefault).toBe(false);
    expect(DEFAULT_RULESET_CONFIG.amphibious.requiresStrictLandSuperiority).toBe(true);
    expect(DEFAULT_RULESET_CONFIG.amphibious.oneVsOneLandingFails).toBe(true);
  });
});

describe("Phase 1 Prisma schema shape", () => {
  const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

  it("reserves all required models", () => {
    const requiredModels = [
      "Game",
      "Round",
      "Ruleset",
      "Country",
      "Region",
      "RegionEdge",
      "CountryNavalAccess",
      "RegionControl",
      "UnitStack",
      "Order",
      "StatusEffect",
      "AsylumGrant",
      "GameEvent",
      "BattleEvent",
      "BattleReport",
      "RoundHegemon",
      "RoundEffect",
      "UnitAdjustment",
      "GameStateSnapshot",
      "AuditLog",
      "Ruling",
      "GamePlayer",
      "CountryInviteCode",
      "OrderVersion",
      "ClientMutation",
    ];

    for (const modelName of requiredModels) {
      expect(schema).toContain(`model ${modelName} {`);
    }
  });

  it("supports reserved order and reconciliation structures", () => {
    expect(schema).toContain("parentOrderId");
    expect(schema).toContain("childOrders");
    expect(schema).toContain("compoundRole");
    expect(schema).toContain("countsTowardLimit");
    expect(schema).toContain("supportOrderId");
    expect(schema).toContain("clientMutationId");
    expect(schema).toContain("serverVersion");
  });
});
