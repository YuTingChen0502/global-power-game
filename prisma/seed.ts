import { Prisma, PrismaClient } from "@prisma/client";
import {
  COUNTRY_NAVAL_ACCESS_SEEDS,
  COUNTRY_SEEDS,
  DEFAULT_RULESET_SEED,
  LAND_EDGE_SEEDS,
  REGION_SEEDS,
  type JsonValue,
} from "./seedData";

const prisma = new PrismaClient();

function toPrismaJson(value: JsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function seedCountries(tx: Prisma.TransactionClient) {
  for (const country of COUNTRY_SEEDS) {
    await tx.country.upsert({
      where: { id: country.id },
      update: {
        displayName: country.displayName,
        englishName: country.englishName,
        tier: country.tier,
        initialArmy: country.initialArmy,
        initialNavy: country.initialNavy,
        color: country.color,
        specialPowerKey: country.specialPowerKey,
        isLandlocked: country.isLandlocked,
        metadata: toPrismaJson(country.metadata),
      },
      create: {
        id: country.id,
        displayName: country.displayName,
        englishName: country.englishName,
        tier: country.tier,
        initialArmy: country.initialArmy,
        initialNavy: country.initialNavy,
        color: country.color,
        specialPowerKey: country.specialPowerKey,
        isLandlocked: country.isLandlocked,
        metadata: toPrismaJson(country.metadata),
      },
    });
  }
}

async function seedRegions(tx: Prisma.TransactionClient) {
  for (const region of REGION_SEEDS) {
    await tx.region.upsert({
      where: { id: region.id },
      update: {
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
        metadata: toPrismaJson(region.metadata),
      },
      create: {
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
        metadata: toPrismaJson(region.metadata),
      },
    });
  }
}

async function seedRegionEdges(tx: Prisma.TransactionClient) {
  for (const edge of LAND_EDGE_SEEDS) {
    await tx.regionEdge.upsert({
      where: { id: edge.id },
      update: {
        fromRegionId: edge.fromRegionId,
        toRegionId: edge.toRegionId,
        edgeType: edge.edgeType,
        isBidirectional: edge.isBidirectional,
        note: edge.note,
        metadata: toPrismaJson(edge.metadata),
      },
      create: {
        id: edge.id,
        fromRegionId: edge.fromRegionId,
        toRegionId: edge.toRegionId,
        edgeType: edge.edgeType,
        isBidirectional: edge.isBidirectional,
        note: edge.note,
        metadata: toPrismaJson(edge.metadata),
      },
    });
  }
}

async function seedCountryNavalAccess(tx: Prisma.TransactionClient) {
  for (const access of COUNTRY_NAVAL_ACCESS_SEEDS) {
    await tx.countryNavalAccess.upsert({
      where: { id: access.id },
      update: {
        countryId: access.countryId,
        regionId: access.regionId,
        accessType: access.accessType,
        note: access.note,
        isReviewNeeded: access.isReviewNeeded,
      },
      create: {
        id: access.id,
        countryId: access.countryId,
        regionId: access.regionId,
        accessType: access.accessType,
        note: access.note,
        isReviewNeeded: access.isReviewNeeded,
      },
    });
  }
}

async function seedDefaultRuleset(tx: Prisma.TransactionClient) {
  await tx.ruleset.upsert({
    where: { key: DEFAULT_RULESET_SEED.key },
    update: {
      name: DEFAULT_RULESET_SEED.name,
      version: DEFAULT_RULESET_SEED.version,
      status: DEFAULT_RULESET_SEED.status,
      config: toPrismaJson(DEFAULT_RULESET_SEED.config),
    },
    create: {
      key: DEFAULT_RULESET_SEED.key,
      name: DEFAULT_RULESET_SEED.name,
      version: DEFAULT_RULESET_SEED.version,
      status: DEFAULT_RULESET_SEED.status,
      config: toPrismaJson(DEFAULT_RULESET_SEED.config),
    },
  });
}

export async function seedReferenceData(client: PrismaClient = prisma) {
  await client.$transaction(
    async (tx) => {
      await seedCountries(tx);
      await seedRegions(tx);
      await seedRegionEdges(tx);
      await seedCountryNavalAccess(tx);
      await seedDefaultRuleset(tx);
    },
    { timeout: 20_000 },
  );

  return {
    countries: COUNTRY_SEEDS.length,
    regions: REGION_SEEDS.length,
    landEdges: LAND_EDGE_SEEDS.length,
    navalAccess: COUNTRY_NAVAL_ACCESS_SEEDS.length,
    rulesetKey: DEFAULT_RULESET_SEED.key,
  };
}

async function main() {
  const result = await seedReferenceData();
  console.log(
    `Seeded ${result.countries} countries, ${result.regions} regions, ${result.landEdges} land edges, ` +
      `${result.navalAccess} naval access rows, and ruleset '${result.rulesetKey}'.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
