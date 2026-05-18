import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { COUNTRY_IDS } from "../rules-engine/domainIds";
import type { CountryId, RegionId, UnitType } from "../rules-engine/types";

const prisma = new PrismaClient();
const GAME_CODE = (process.env.TEST_GAME_CODE ?? "GPG-TEST").trim().toUpperCase();
const TEST_UPDATED_BY = "scripts/create-test-game.ts";

type UnitSeed = {
  countryId: CountryId;
  regionId: RegionId;
  unitType: UnitType;
  count: number;
};

const UNIT_SEEDS: readonly UnitSeed[] = [
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

async function main() {
  const ruleset = await prisma.ruleset.findUnique({
    where: { key: "default" },
  });

  if (!ruleset) {
    throw new Error("Default ruleset was not found. Run pnpm db:seed before creating a test game.");
  }

  const game = await prisma.game.upsert({
    where: { code: GAME_CODE },
    update: {
      name: "Phase 2 Local Test Game",
      status: "active",
      phase: "order_submission",
      currentRoundNumber: 1,
      rulesetId: ruleset.id,
    },
    create: {
      code: GAME_CODE,
      name: "Phase 2 Local Test Game",
      status: "active",
      phase: "order_submission",
      currentRoundNumber: 1,
      rulesetId: ruleset.id,
    },
  });
  const round = await prisma.round.upsert({
    where: {
      gameId_number: {
        gameId: game.id,
        number: 1,
      },
    },
    update: {
      phase: "order_submission",
      deadlineAt: null,
    },
    create: {
      gameId: game.id,
      number: 1,
      phase: "order_submission",
    },
  });
  const regions = await prisma.region.findMany({
    orderBy: { sortOrder: "asc" },
  });

  for (const region of regions) {
    await prisma.regionControl.upsert({
      where: {
        gameId_roundId_regionId: {
          gameId: game.id,
          roundId: round.id,
          regionId: region.id,
        },
      },
      update: {
        countryId: region.homelandCountryId,
        controlType: region.homelandCountryId ? "controlled" : "neutral",
        source: TEST_UPDATED_BY,
      },
      create: {
        gameId: game.id,
        roundId: round.id,
        regionId: region.id,
        countryId: region.homelandCountryId,
        controlType: region.homelandCountryId ? "controlled" : "neutral",
        source: TEST_UPDATED_BY,
      },
    });
  }

  for (const unitSeed of UNIT_SEEDS) {
    const existingStack = await prisma.unitStack.findFirst({
      where: {
        gameId: game.id,
        roundId: round.id,
        countryId: unitSeed.countryId,
        regionId: unitSeed.regionId,
        unitType: unitSeed.unitType,
      },
    });

    if (existingStack) {
      await prisma.unitStack.update({
        where: { id: existingStack.id },
        data: {
          count: unitSeed.count,
          status: "active",
          isExiled: false,
        },
      });
    } else {
      await prisma.unitStack.create({
        data: {
          gameId: game.id,
          roundId: round.id,
          countryId: unitSeed.countryId,
          regionId: unitSeed.regionId,
          unitType: unitSeed.unitType,
          count: unitSeed.count,
          status: "active",
        },
      });
    }
  }

  for (const countryId of COUNTRY_IDS) {
    const inviteCode = `${countryId.toUpperCase()}-TEST`;
    await prisma.countryInviteCode.upsert({
      where: {
        codeHash: hashSecret(inviteCode),
      },
      update: {
        gameId: game.id,
        countryId,
        label: `${countryId} local test`,
        status: "active",
        maxUses: 1,
        uses: 0,
        expiresAt: null,
        redeemedAt: null,
        redeemedByPlayerId: null,
        createdBy: TEST_UPDATED_BY,
      },
      create: {
        gameId: game.id,
        countryId,
        codeHash: hashSecret(inviteCode),
        label: `${countryId} local test`,
        status: "active",
        maxUses: 1,
        uses: 0,
        createdBy: TEST_UPDATED_BY,
      },
    });
  }

  console.log(`Created or updated local test game ${GAME_CODE} (${game.id}).`);
  console.log("Invite codes:");
  for (const countryId of COUNTRY_IDS) {
    console.log(`${countryId}: ${countryId.toUpperCase()}-TEST`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function hashSecret(secret: string) {
  return createHash("sha256").update(secret.trim().toUpperCase(), "utf8").digest("hex");
}
