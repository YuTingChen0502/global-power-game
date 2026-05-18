import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { DuplicateLastRoundResponseDTO } from "@/lib/api/types";
import { PlayerAuthorizationError, requirePlayer } from "@/lib/auth/requirePlayer";
import { prisma } from "@/lib/db/prisma";
import {
  duplicatePreviousRoundOrders,
  getCurrentGameRound,
  writeClientMutation,
} from "@/lib/orders/orderServer";
import { duplicateLastRoundPayloadSchema } from "@/lib/validation/orderValidation";

export async function POST(request: NextRequest) {
  try {
    const payload = duplicateLastRoundPayloadSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const player = await requirePlayer(tx, payload);
      const current = await getCurrentGameRound(tx, payload.gameId);

      if (!current) {
        return { type: "not_found" as const };
      }

      const sourceRoundNumber = payload.sourceRoundNumber ?? current.round.number - 1;
      if (sourceRoundNumber < 1) {
        await writeClientMutation(tx, {
          clientMutationId: payload.clientMutationId,
          gameId: current.game.id,
          roundId: current.round.id,
          playerId: player.id,
          countryId: payload.countryId,
          mutationType: "duplicate_last_round",
          status: "completed",
          responsePayload: { duplicatedCount: 0, sourceRoundNumber: null },
          serverVersion: current.round.serverVersion,
        });

        return {
          type: "ok" as const,
          orders: [],
          duplicatedCount: 0,
          sourceRoundNumber: null,
          serverVersion: current.round.serverVersion,
        };
      }

      const sourceRound = await tx.round.findUnique({
        where: {
          gameId_number: {
            gameId: current.game.id,
            number: sourceRoundNumber,
          },
        },
      });

      if (!sourceRound) {
        return {
          type: "ok" as const,
          orders: [],
          duplicatedCount: 0,
          sourceRoundNumber,
          serverVersion: current.round.serverVersion,
        };
      }

      const duplicate = await duplicatePreviousRoundOrders(tx, {
        gameId: current.game.id,
        currentRoundId: current.round.id,
        sourceRoundId: sourceRound.id,
        countryId: payload.countryId,
        submittedByPlayerId: player.id,
        clientMutationId: payload.clientMutationId,
        maxCountableOrders: current.maxCountableOrders,
      });

      if (!duplicate.ok) {
        await writeClientMutation(tx, {
          clientMutationId: payload.clientMutationId,
          gameId: current.game.id,
          roundId: current.round.id,
          playerId: player.id,
          countryId: payload.countryId,
          mutationType: "duplicate_last_round",
          status: "rejected",
          responsePayload: {
            issues: duplicate.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              orderId: issue.orderId ?? null,
            })),
          },
          errorCode: "order_invalid",
          errorMessage: "Duplicated orders failed lightweight validation.",
          serverVersion: current.round.serverVersion,
        });

        return {
          type: "invalid" as const,
          issues: duplicate.issues,
          serverVersion: current.round.serverVersion,
        };
      }

      const nextRoundVersion = current.round.serverVersion + 1;
      await tx.round.update({
        where: { id: current.round.id },
        data: { serverVersion: nextRoundVersion },
      });

      await writeClientMutation(tx, {
        clientMutationId: payload.clientMutationId,
        gameId: current.game.id,
        roundId: current.round.id,
        playerId: player.id,
        countryId: payload.countryId,
        mutationType: "duplicate_last_round",
        status: "completed",
        responsePayload: { duplicatedCount: duplicate.orders.length, sourceRoundNumber },
        serverVersion: nextRoundVersion,
      });

      return {
        type: "ok" as const,
        orders: duplicate.orders,
        duplicatedCount: duplicate.orders.length,
        sourceRoundNumber,
        serverVersion: nextRoundVersion,
      };
    });

    if (result.type === "not_found") {
      return jsonApiError<DuplicateLastRoundResponseDTO>(
        "game_or_round_not_found",
        "Game or current round was not found.",
        {
          status: 404,
          clientMutationId: payload.clientMutationId,
        },
      );
    }

    if (result.type === "invalid") {
      return jsonApiError<DuplicateLastRoundResponseDTO>(
        "order_invalid",
        "Duplicated orders failed lightweight validation.",
        {
          status: 422,
          details: result.issues,
          clientMutationId: payload.clientMutationId,
          serverVersion: result.serverVersion,
        },
      );
    }

    return jsonApiSuccess<DuplicateLastRoundResponseDTO>(
      {
        orders: result.orders,
        duplicatedCount: result.duplicatedCount,
        sourceRoundNumber: result.sourceRoundNumber,
      },
      {
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<DuplicateLastRoundResponseDTO>("invalid_payload", "Duplicate order request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof PlayerAuthorizationError) {
      return jsonApiError<DuplicateLastRoundResponseDTO>(
        "player_unauthorized",
        "Player token is invalid for this country.",
        { status: 401 },
      );
    }

    console.error(error);
    return jsonApiError<DuplicateLastRoundResponseDTO>("duplicate_orders_failed", "Could not duplicate orders.", {
      status: 500,
    });
  }
}
