import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { mapOrder } from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { DeleteOrderResponseDTO } from "@/lib/api/types";
import { PlayerAuthorizationError, requirePlayer } from "@/lib/auth/requirePlayer";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGameRound, writeClientMutation, writeOrderVersion } from "@/lib/orders/orderServer";
import { deleteOrderPayloadSchema } from "@/lib/validation/orderValidation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const payload = deleteOrderPayloadSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const player = await requirePlayer(tx, payload);
      const current = await getCurrentGameRound(tx, payload.gameId);

      if (!current) {
        return { type: "not_found" as const };
      }

      const order = await tx.order.findFirst({
        where: {
          id,
          gameId: current.game.id,
          roundId: current.round.id,
          countryId: payload.countryId,
          parentOrderId: null,
          status: { in: ["draft", "submitted", "submitted_pending", "invalid"] },
        },
        include: { childOrders: true },
      });

      if (!order) {
        return { type: "not_found" as const };
      }

      await tx.order.updateMany({
        where: {
          OR: [{ id: order.id }, { parentOrderId: order.id }],
        },
        data: {
          status: "cancelled",
        },
      });

      const cancelledOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { childOrders: true },
      });

      if (!cancelledOrder) {
        return { type: "not_found" as const };
      }

      await writeOrderVersion(tx, cancelledOrder, "cancelled_by_player");
      for (const child of cancelledOrder.childOrders) {
        await writeOrderVersion(tx, child, "cancelled_by_player");
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
        mutationType: "delete_order",
        status: "completed",
        responsePayload: { orderId: order.id },
        serverVersion: nextRoundVersion,
      });

      return {
        type: "ok" as const,
        order: mapOrder(cancelledOrder),
        serverVersion: nextRoundVersion,
      };
    });

    if (result.type === "not_found") {
      return jsonApiError<DeleteOrderResponseDTO>("order_not_found", "Order was not found or cannot be deleted.", {
        status: 404,
        clientMutationId: payload.clientMutationId,
      });
    }

    return jsonApiSuccess<DeleteOrderResponseDTO>(
      { order: result.order },
      {
        clientMutationId: payload.clientMutationId,
        serverVersion: result.serverVersion,
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<DeleteOrderResponseDTO>("invalid_payload", "Delete order request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    if (error instanceof PlayerAuthorizationError) {
      return jsonApiError<DeleteOrderResponseDTO>("player_unauthorized", "Player token is invalid for this country.", {
        status: 401,
      });
    }

    console.error(error);
    return jsonApiError<DeleteOrderResponseDTO>("delete_order_failed", "Could not delete order.", { status: 500 });
  }
}
