import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { SubmitOrdersResponseDTO } from "@/lib/api/types";
import { PlayerAuthorizationError, requirePlayer } from "@/lib/auth/requirePlayer";
import { prisma } from "@/lib/db/prisma";
import {
  cancelEditableOrdersForCountry,
  createOrdersForInputs,
  getCurrentGameRound,
  loadCurrentCountryOrders,
  validateOrderInputsForRound,
  writeClientMutation,
} from "@/lib/orders/orderServer";
import { submitOrdersPayloadSchema } from "@/lib/validation/orderValidation";

export async function POST(request: NextRequest) {
  try {
    const payload = submitOrdersPayloadSchema.parse(await request.json());
    const submittedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const player = await requirePlayer(tx, payload);
      const current = await getCurrentGameRound(tx, payload.gameId);

      if (!current) {
        return { type: "not_found" as const };
      }

      await writeClientMutation(tx, {
        clientMutationId: payload.clientMutationId,
        gameId: current.game.id,
        roundId: current.round.id,
        playerId: player.id,
        countryId: payload.countryId,
        mutationType: "submit_orders",
        status: "pending",
        requestPayload: { orderCount: payload.orders.length },
        serverVersion: current.round.serverVersion,
      });

      const validation = await validateOrderInputsForRound(tx, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
        orders: payload.orders,
        maxCountableOrders: current.maxCountableOrders,
        includeExistingOrders: false,
      });

      if (!validation.ok) {
        await writeClientMutation(tx, {
          clientMutationId: payload.clientMutationId,
          gameId: current.game.id,
          roundId: current.round.id,
          playerId: player.id,
          countryId: payload.countryId,
          mutationType: "submit_orders",
          status: "rejected",
          requestPayload: { orderCount: payload.orders.length },
          responsePayload: {
            issues: validation.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              orderId: issue.orderId ?? null,
            })),
            countableOrderCount: validation.countableOrderCount,
          },
          errorCode: "order_invalid",
          errorMessage: "Submitted orders failed lightweight validation.",
          serverVersion: current.round.serverVersion,
        });

        return {
          type: "invalid" as const,
          issues: validation.issues,
          serverVersion: current.round.serverVersion,
        };
      }

      await cancelEditableOrdersForCountry(tx, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
      });

      await createOrdersForInputs(tx, payload.orders, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
        submittedByPlayerId: player.id,
        status: "submitted",
        clientMutationId: payload.clientMutationId,
      });

      const nextGameVersion = current.game.serverVersion + 1;
      const nextRoundVersion = current.round.serverVersion + 1;
      await Promise.all([
        tx.game.update({
          where: { id: current.game.id },
          data: { serverVersion: nextGameVersion },
        }),
        tx.round.update({
          where: { id: current.round.id },
          data: { serverVersion: nextRoundVersion },
        }),
      ]);

      const orders = await loadCurrentCountryOrders(tx, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
      });

      await writeClientMutation(tx, {
        clientMutationId: payload.clientMutationId,
        gameId: current.game.id,
        roundId: current.round.id,
        playerId: player.id,
        countryId: payload.countryId,
        mutationType: "submit_orders",
        status: "completed",
        requestPayload: { orderCount: payload.orders.length },
        responsePayload: { orderIds: orders.map((order) => order.id) },
        serverVersion: nextRoundVersion,
      });

      return {
        type: "ok" as const,
        orders,
        serverVersion: nextRoundVersion,
      };
    });

    if (result.type === "not_found") {
      return jsonApiError<SubmitOrdersResponseDTO>("game_or_round_not_found", "Game or current round was not found.", {
        status: 404,
        clientMutationId: payload.clientMutationId,
      });
    }

    if (result.type === "invalid") {
      return jsonApiError<SubmitOrdersResponseDTO>("order_invalid", "Submitted orders failed lightweight validation.", {
        status: 422,
        details: result.issues,
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      });
    }

    return jsonApiSuccess<SubmitOrdersResponseDTO>(
      {
        orders: result.orders,
        submittedAt: submittedAt.toISOString(),
      },
      {
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<SubmitOrdersResponseDTO>("invalid_payload", "Submit orders request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof PlayerAuthorizationError) {
      return jsonApiError<SubmitOrdersResponseDTO>("player_unauthorized", "Player token is invalid for this country.", {
        status: 401,
      });
    }

    console.error(error);
    return jsonApiError<SubmitOrdersResponseDTO>("submit_orders_failed", "Could not submit orders.", { status: 500 });
  }
}
