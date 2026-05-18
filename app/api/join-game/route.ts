import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { mapCountry } from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { JoinGameResponseDTO } from "@/lib/api/types";
import { createPlayerToken, hashSecret } from "@/lib/auth/playerTokens";
import { prisma } from "@/lib/db/prisma";
import { joinGamePayloadSchema } from "@/lib/validation/joinGame";

class InvalidJoinCodeError extends Error {
  constructor() {
    super("Invalid join code.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = joinGamePayloadSchema.parse(await request.json());
    const now = new Date();
    const codeHash = hashSecret(payload.inviteCode);
    const playerToken = createPlayerToken();
    const tokenHash = hashSecret(playerToken);

    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { code: payload.gameCode },
        select: { id: true, code: true, status: true, serverVersion: true },
      });

      if (!game || game.status === "completed") {
        throw new InvalidJoinCodeError();
      }

      const invite = await tx.countryInviteCode.findFirst({
        where: {
          gameId: game.id,
          codeHash,
        },
        include: {
          country: true,
        },
      });

      if (
        !invite ||
        invite.status !== "active" ||
        invite.uses >= invite.maxUses ||
        (invite.expiresAt !== null && invite.expiresAt <= now)
      ) {
        throw new InvalidJoinCodeError();
      }

      const player = await tx.gamePlayer.upsert({
        where: {
          gameId_countryId: {
            gameId: game.id,
            countryId: invite.countryId,
          },
        },
        update: {
          tokenHash,
          displayName: payload.displayName,
          status: "active",
          joinedAt: now,
          lastSeenAt: now,
        },
        create: {
          gameId: game.id,
          countryId: invite.countryId,
          displayName: payload.displayName,
          tokenHash,
          status: "active",
          joinedAt: now,
          lastSeenAt: now,
        },
        select: { id: true, countryId: true },
      });

      const nextUses = invite.uses + 1;
      await tx.countryInviteCode.update({
        where: { id: invite.id },
        data: {
          uses: nextUses,
          status: nextUses >= invite.maxUses ? "redeemed" : "active",
          redeemedAt: nextUses >= invite.maxUses ? now : null,
          redeemedByPlayerId: player.id,
        },
      });

      await tx.auditLog.create({
        data: {
          gameId: game.id,
          actorType: "player",
          actorId: player.id,
          action: "join_game",
          entityType: "GamePlayer",
          entityId: player.id,
          reason: "country invite code redeemed",
          afterJson: {
            countryId: player.countryId,
            displayName: payload.displayName ?? null,
          },
          serverVersion: game.serverVersion,
        },
      });

      return {
        game,
        player,
        country: invite.country,
      };
    });

    const data: JoinGameResponseDTO = {
      playerToken,
      playerId: result.player.id,
      countryId: mapCountry(result.country).id,
      gameId: result.game.id,
      country: mapCountry(result.country),
    };

    return jsonApiSuccess(data, { serverVersion: result.game.serverVersion });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<JoinGameResponseDTO>("invalid_payload", "Join request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof InvalidJoinCodeError) {
      return jsonApiError<JoinGameResponseDTO>("invalid_join_code", "Game code or invite code is invalid.", {
        status: 401,
      });
    }

    console.error(error);
    return jsonApiError<JoinGameResponseDTO>("join_failed", "Could not join the game.", { status: 500 });
  }
}
