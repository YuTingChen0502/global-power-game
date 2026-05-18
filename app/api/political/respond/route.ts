import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { mapOrder, parseCountryId } from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { PoliticalRespondResponseDTO } from "@/lib/api/types";
import { PlayerAuthorizationError, requirePlayer } from "@/lib/auth/requirePlayer";
import { prisma } from "@/lib/db/prisma";
import {
  getCurrentGameRound,
  validateOrderInputsForRound,
  writeClientMutation,
  writeOrderVersion,
} from "@/lib/orders/orderServer";
import { politicalRespondPayloadSchema, type OrderMutationInput } from "@/lib/validation/orderValidation";

export async function POST(request: NextRequest) {
  try {
    const payload = politicalRespondPayloadSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const player = await requirePlayer(tx, payload);
      const current = await getCurrentGameRound(tx, payload.gameId);

      if (!current) {
        return { type: "not_found" as const };
      }

      const requestOrder = await tx.order.findFirst({
        where: {
          id: payload.requestOrderId,
          gameId: current.game.id,
          roundId: current.round.id,
          actionType: "request_asylum",
          targetCountryId: payload.countryId,
          status: { in: ["submitted", "valid"] },
        },
      });

      if (!requestOrder) {
        return { type: "request_not_found" as const };
      }

      const actionType: "approve_asylum" | "reject_asylum" =
        payload.response === "approve" ? "approve_asylum" : "reject_asylum";
      const responseInput: OrderMutationInput = {
        actionType,
        status: "submitted" as const,
        targetCountryId: parseCountryId(requestOrder.countryId),
        countsTowardLimit: true,
        pairedOrderId: requestOrder.id,
        payload: {
          requestOrderId: requestOrder.id,
          response: payload.response,
          note: payload.note ?? null,
        },
      };
      const validation = await validateOrderInputsForRound(tx, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
        orders: [responseInput],
        maxCountableOrders: current.maxCountableOrders,
        includeExistingOrders: true,
      });

      if (!validation.ok) {
        await writeClientMutation(tx, {
          clientMutationId: payload.clientMutationId,
          gameId: current.game.id,
          roundId: current.round.id,
          playerId: player.id,
          countryId: payload.countryId,
          mutationType: "political_respond",
          status: "rejected",
          responsePayload: {
            issues: validation.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              orderId: issue.orderId ?? null,
            })),
          },
          errorCode: "order_invalid",
          errorMessage: "Political response failed lightweight validation.",
          serverVersion: current.round.serverVersion,
        });

        return {
          type: "invalid" as const,
          issues: validation.issues,
          serverVersion: current.round.serverVersion,
        };
      }

      const responseOrder = await tx.order.create({
        data: {
          gameId: current.game.id,
          roundId: current.round.id,
          countryId: payload.countryId,
          submittedByPlayerId: player.id,
          actionType,
          status: "submitted",
          targetCountryId: responseInput.targetCountryId,
          countsTowardLimit: true,
          pairedOrderId: requestOrder.id,
          clientMutationId: payload.clientMutationId ?? null,
          payload: responseInput.payload,
          validationSummary: {
            phase: "phase_3_political_pair",
          },
          submittedAt: new Date(),
        },
      });

      const updatedRequest = await tx.order.update({
        where: { id: requestOrder.id },
        data: {
          pairedOrderId: responseOrder.id,
          payload: {
            phase3ResponseOrderId: responseOrder.id,
            phase3Response: payload.response,
          },
        },
      });

      await writeOrderVersion(tx, responseOrder, "political_response_created");
      await writeOrderVersion(tx, updatedRequest, "political_request_linked");

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
        mutationType: "political_respond",
        status: "completed",
        responsePayload: {
          requestOrderId: updatedRequest.id,
          responseOrderId: responseOrder.id,
          response: payload.response,
        },
        serverVersion: nextRoundVersion,
      });

      return {
        type: "ok" as const,
        request: mapOrder(updatedRequest),
        response: mapOrder(responseOrder),
        serverVersion: nextRoundVersion,
      };
    });

    if (result.type === "not_found") {
      return jsonApiError<PoliticalRespondResponseDTO>("game_or_round_not_found", "Game or current round was not found.", {
        status: 404,
        clientMutationId: payload.clientMutationId,
      });
    }

    if (result.type === "request_not_found") {
      return jsonApiError<PoliticalRespondResponseDTO>(
        "request_not_found",
        "Asylum request was not found for this country.",
        {
          status: 404,
          clientMutationId: payload.clientMutationId,
        },
      );
    }

    if (result.type === "invalid") {
      return jsonApiError<PoliticalRespondResponseDTO>(
        "order_invalid",
        "Political response failed lightweight validation.",
        {
          status: 422,
          details: result.issues,
          clientMutationId: payload.clientMutationId,
          serverVersion: result.serverVersion,
        },
      );
    }

    return jsonApiSuccess<PoliticalRespondResponseDTO>(
      {
        request: result.request,
        response: result.response,
      },
      {
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<PoliticalRespondResponseDTO>("invalid_payload", "Political response request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof PlayerAuthorizationError) {
      return jsonApiError<PoliticalRespondResponseDTO>(
        "player_unauthorized",
        "Player token is invalid for this country.",
        { status: 401 },
      );
    }

    console.error(error);
    return jsonApiError<PoliticalRespondResponseDTO>("political_response_failed", "Could not respond to request.", {
      status: 500,
    });
  }
}
