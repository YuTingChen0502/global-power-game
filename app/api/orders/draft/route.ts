import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { mapOrder } from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { DraftOrderResponseDTO } from "@/lib/api/types";
import { PlayerAuthorizationError, requirePlayer } from "@/lib/auth/requirePlayer";
import { prisma } from "@/lib/db/prisma";
import {
  createOrdersForInputs,
  getCurrentGameRound,
  validateOrderInputsForRound,
  writeClientMutation,
  writeOrderVersion,
} from "@/lib/orders/orderServer";
import { draftOrderPayloadSchema } from "@/lib/validation/orderValidation";

export async function POST(request: NextRequest) {
  try {
    const payload = draftOrderPayloadSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const player = await requirePlayer(tx, payload);
      const current = await getCurrentGameRound(tx, payload.gameId);

      if (!current) {
        return { type: "not_found" as const };
      }

      const validation = await validateOrderInputsForRound(tx, {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
        orders: [payload.order],
        maxCountableOrders: current.maxCountableOrders,
        includeExistingOrders: true,
        excludeOrderIds: payload.order.id && !payload.order.id.startsWith("draft-") ? [payload.order.id] : [],
      });

      if (!validation.ok) {
        await writeClientMutation(tx, {
          clientMutationId: payload.clientMutationId,
          gameId: current.game.id,
          roundId: current.round.id,
          playerId: player.id,
          countryId: payload.countryId,
          mutationType: "draft_order",
          status: "rejected",
          responsePayload: {
            issues: validation.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              orderId: issue.orderId ?? null,
            })),
          },
          errorCode: "order_invalid",
          errorMessage: "Draft order failed lightweight validation.",
          serverVersion: current.round.serverVersion,
        });

        return {
          type: "invalid" as const,
          issues: validation.issues,
          serverVersion: current.round.serverVersion,
        };
      }

      if (payload.order.id && !payload.order.id.startsWith("draft-")) {
        const existingOrder = await tx.order.findFirst({
          where: {
            id: payload.order.id,
            gameId: current.game.id,
            roundId: current.round.id,
            countryId: payload.countryId,
            status: { in: ["draft", "invalid"] },
          },
        });

        if (existingOrder) {
          const updated = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              actionType: payload.order.actionType,
              originRegionId: payload.order.originRegionId ?? null,
              targetRegionId: payload.order.targetRegionId ?? null,
              targetCountryId: payload.order.targetCountryId ?? null,
              targetUnitStackId: payload.order.targetUnitStackId ?? null,
              unitType: payload.order.unitType ?? null,
              unitCount: payload.order.unitCount ?? null,
              countsTowardLimit: payload.order.countsTowardLimit ?? true,
              supportOrderId: payload.order.supportOrderId ?? null,
              supportCountryId: payload.order.supportCountryId ?? null,
              supportActionType: payload.order.supportActionType ?? null,
              supportTargetRegionId: payload.order.supportTargetRegionId ?? null,
              pairedOrderId: payload.order.pairedOrderId ?? null,
              payload: payload.order.payload ?? {},
              validationSummary: {
                phase: "phase_3_lightweight",
                issues: [],
              },
            },
          });
          await writeOrderVersion(tx, updated, "draft_updated");
          await writeClientMutation(tx, {
            clientMutationId: payload.clientMutationId,
            gameId: current.game.id,
            roundId: current.round.id,
            playerId: player.id,
            countryId: payload.countryId,
            mutationType: "draft_order",
            status: "completed",
            responsePayload: { orderId: updated.id },
            serverVersion: current.round.serverVersion,
          });

          return {
            type: "ok" as const,
            order: mapOrder(updated),
            serverVersion: current.round.serverVersion,
          };
        }
      }

      const [createdOrder] = await createOrdersForInputs(tx, [payload.order], {
        gameId: current.game.id,
        roundId: current.round.id,
        countryId: payload.countryId,
        submittedByPlayerId: player.id,
        status: "draft",
        clientMutationId: payload.clientMutationId,
      });

      if (!createdOrder) {
        return { type: "not_created" as const, serverVersion: current.round.serverVersion };
      }

      await writeClientMutation(tx, {
        clientMutationId: payload.clientMutationId,
        gameId: current.game.id,
        roundId: current.round.id,
        playerId: player.id,
        countryId: payload.countryId,
        mutationType: "draft_order",
        status: "completed",
        responsePayload: { orderId: createdOrder.id },
        serverVersion: current.round.serverVersion,
      });

      return {
        type: "ok" as const,
        order: createdOrder,
        serverVersion: current.round.serverVersion,
      };
    });

    if (result.type === "not_found") {
      return jsonApiError<DraftOrderResponseDTO>("game_or_round_not_found", "Game or current round was not found.", {
        status: 404,
      });
    }

    if (result.type === "invalid") {
      return jsonApiError<DraftOrderResponseDTO>("order_invalid", "Draft order failed lightweight validation.", {
        status: 422,
        details: result.issues,
        serverVersion: result.serverVersion,
      });
    }

    if (result.type === "not_created") {
      return jsonApiError<DraftOrderResponseDTO>("order_not_created", "Draft order could not be created.", {
        status: 400,
        serverVersion: result.serverVersion,
      });
    }

    return jsonApiSuccess<DraftOrderResponseDTO>(
      { order: result.order },
      {
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<DraftOrderResponseDTO>("invalid_payload", "Draft order request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof PlayerAuthorizationError) {
      return jsonApiError<DraftOrderResponseDTO>("player_unauthorized", "Player token is invalid for this country.", {
        status: 401,
      });
    }

    console.error(error);
    return jsonApiError<DraftOrderResponseDTO>("draft_order_failed", "Could not save draft order.", { status: 500 });
  }
}
