import "server-only";

import type { Prisma } from "@prisma/client";
import { hashSecret } from "@/lib/auth/playerTokens";
import type { PlayerOrderAuthPayload } from "@/lib/validation/orderValidation";
import type { CountryId } from "@/rules-engine/types";

export class PlayerAuthorizationError extends Error {
  constructor() {
    super("Player token is invalid for this country.");
  }
}

export type AuthorizedPlayer = {
  id: string;
  gameId: string;
  countryId: CountryId;
};

export async function requirePlayer(
  tx: Prisma.TransactionClient,
  payload: PlayerOrderAuthPayload,
): Promise<AuthorizedPlayer> {
  const tokenHash = hashSecret(payload.playerToken);
  const player = await tx.gamePlayer.findFirst({
    where: {
      gameId: payload.gameId,
      countryId: payload.countryId,
      tokenHash,
      status: "active",
    },
    select: {
      id: true,
      gameId: true,
      countryId: true,
    },
  });

  if (!player || player.countryId !== payload.countryId) {
    throw new PlayerAuthorizationError();
  }

  await tx.gamePlayer.update({
    where: { id: player.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    id: player.id,
    gameId: player.gameId,
    countryId: payload.countryId,
  };
}
