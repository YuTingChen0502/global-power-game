import {
  mapCountry,
  mapCountryNavalAccess,
  mapGame,
  mapGameEvent,
  mapRegion,
  mapRegionControl,
  mapRegionEdge,
  mapRound,
  mapUnitStack,
} from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { PublicGameStateDTO } from "@/lib/api/types";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { gameId } = await context.params;

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return jsonApiError<PublicGameStateDTO>("game_not_found", "Game was not found.", { status: 404 });
    }

    const round = await prisma.round.findUnique({
      where: {
        gameId_number: {
          gameId: game.id,
          number: game.currentRoundNumber,
        },
      },
    });

    if (!round) {
      return jsonApiError<PublicGameStateDTO>("round_not_found", "Current round was not found.", { status: 404 });
    }

    const [countries, regions, edges, controls, unitStacks, navalAccess, events] = await Promise.all([
      prisma.country.findMany({ orderBy: [{ tier: "asc" }, { id: "asc" }] }),
      prisma.region.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.regionEdge.findMany({ orderBy: [{ fromRegionId: "asc" }, { toRegionId: "asc" }] }),
      prisma.regionControl.findMany({
        where: { gameId: game.id, roundId: round.id },
        orderBy: { regionId: "asc" },
      }),
      prisma.unitStack.findMany({
        where: { gameId: game.id, roundId: round.id, status: "active" },
        orderBy: [{ regionId: "asc" }, { unitType: "asc" }],
      }),
      prisma.countryNavalAccess.findMany({ orderBy: [{ countryId: "asc" }, { regionId: "asc" }] }),
      prisma.gameEvent.findMany({
        where: { gameId: game.id, visibility: "public" },
        orderBy: [{ roundId: "asc" }, { sequence: "asc" }],
        take: 80,
      }),
    ]);

    const gameDto = mapGame(game);
    const roundDto = mapRound(round);
    const serverVersion = Math.max(gameDto.serverVersion, roundDto.serverVersion);
    const updatedAt = gameDto.updatedAt > roundDto.updatedAt ? gameDto.updatedAt : roundDto.updatedAt;

    const data: PublicGameStateDTO = {
      game: gameDto,
      round: roundDto,
      countries: countries.map(mapCountry),
      regions: regions.map(mapRegion),
      edges: edges.map(mapRegionEdge),
      controls: controls.map(mapRegionControl),
      unitStacks: unitStacks.map(mapUnitStack),
      navalAccess: navalAccess.map(mapCountryNavalAccess),
      events: events.map(mapGameEvent),
      serverVersion,
      updatedAt,
    };

    return jsonApiSuccess(data, { serverVersion });
  } catch (error: unknown) {
    console.error(error);
    return jsonApiError<PublicGameStateDTO>("public_state_failed", "Could not load public game state.", {
      status: 500,
    });
  }
}
