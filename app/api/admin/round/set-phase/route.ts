import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { mapGame, mapGameEvent, mapRound } from "@/lib/api/mappers";
import { jsonApiError, jsonApiSuccess } from "@/lib/api/responses";
import type { SetPhaseResponseDTO } from "@/lib/api/types";
import { prisma } from "@/lib/db/prisma";
import { setPhasePayloadSchema } from "@/lib/validation/adminPhase";

export async function POST(request: NextRequest) {
  try {
    const payload = setPhasePayloadSchema.parse(await request.json());
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
      return jsonApiError<SetPhaseResponseDTO>("admin_not_configured", "Temporary admin password is not configured.", {
        status: 503,
      });
    }

    const suppliedPassword = request.headers.get("x-admin-password") ?? payload.adminPassword;
    if (suppliedPassword !== expectedPassword) {
      return jsonApiError<SetPhaseResponseDTO>("admin_unauthorized", "Admin password is invalid.", { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: payload.gameId },
      });

      if (!game) {
        return null;
      }

      const round = await tx.round.findUnique({
        where: {
          gameId_number: {
            gameId: game.id,
            number: game.currentRoundNumber,
          },
        },
      });

      if (!round) {
        return null;
      }

      const nextGameVersion = game.serverVersion + 1;
      const nextRoundVersion = round.serverVersion + 1;
      const deadlineAt = payload.deadlineAt ? new Date(payload.deadlineAt) : null;
      const nextSequence = await tx.gameEvent.aggregate({
        where: { gameId: game.id, roundId: round.id },
        _max: { sequence: true },
      });
      const sequence = (nextSequence._max.sequence ?? 0) + 1;

      const [updatedGame, updatedRound, event] = await Promise.all([
        tx.game.update({
          where: { id: game.id },
          data: {
            phase: payload.phase,
            serverVersion: nextGameVersion,
          },
        }),
        tx.round.update({
          where: { id: round.id },
          data: {
            phase: payload.phase,
            deadlineAt,
            serverVersion: nextRoundVersion,
          },
        }),
        tx.gameEvent.create({
          data: {
            gameId: game.id,
            roundId: round.id,
            sequence,
            type: "phase_changed",
            visibility: "public",
            title: "Phase changed",
            message: `Round ${round.number} is now ${payload.phase}.`,
            payload: {
              phase: payload.phase,
              deadlineAt: deadlineAt?.toISOString() ?? null,
            },
            serverVersion: nextRoundVersion,
          },
        }),
      ]);

      await tx.auditLog.create({
        data: {
          gameId: game.id,
          roundId: round.id,
          actorType: "admin",
          action: "set_phase",
          entityType: "Round",
          entityId: round.id,
          reason: payload.reason ?? "temporary Phase 2 phase toggle",
          beforeJson: {
            phase: round.phase,
            deadlineAt: round.deadlineAt?.toISOString() ?? null,
            serverVersion: round.serverVersion,
          },
          afterJson: {
            phase: updatedRound.phase,
            deadlineAt: updatedRound.deadlineAt?.toISOString() ?? null,
            serverVersion: updatedRound.serverVersion,
          },
          serverVersion: nextRoundVersion,
        },
      });

      return { game: updatedGame, round: updatedRound, event };
    });

    if (!result) {
      return jsonApiError<SetPhaseResponseDTO>("game_or_round_not_found", "Game or current round was not found.", {
        status: 404,
      });
    }

    const data: SetPhaseResponseDTO = {
      game: mapGame(result.game),
      round: mapRound(result.round),
      event: mapGameEvent(result.event),
    };

    return jsonApiSuccess(data, {
      events: [data.event],
      serverVersion: data.round.serverVersion,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonApiError<SetPhaseResponseDTO>("invalid_payload", "Phase update request is malformed.", {
        status: 400,
        details: error.flatten(),
      });
    }

    console.error(error);
    return jsonApiError<SetPhaseResponseDTO>("set_phase_failed", "Could not update phase.", { status: 500 });
  }
}
