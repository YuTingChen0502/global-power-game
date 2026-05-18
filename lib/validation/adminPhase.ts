import { z } from "zod";

const gamePhaseSchema = z.enum([
  "setup",
  "deployment",
  "order_submission",
  "admin_review",
  "adjudication_preview",
  "adjudication_committed",
  "published",
  "effect_selection",
  "paused",
  "completed",
]);

export const setPhasePayloadSchema = z.object({
  gameId: z.string().trim().min(1),
  phase: gamePhaseSchema,
  deadlineAt: z
    .string()
    .trim()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  adminPassword: z.string().optional(),
  reason: z.string().trim().max(240).optional(),
});

export type SetPhasePayload = z.infer<typeof setPhasePayloadSchema>;
