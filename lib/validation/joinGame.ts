import { z } from "zod";

export const joinGamePayloadSchema = z.object({
  gameCode: z
    .string()
    .trim()
    .min(2, "Game code is required.")
    .max(32, "Game code is too long.")
    .transform((value) => value.toUpperCase()),
  inviteCode: z
    .string()
    .trim()
    .min(2, "Country invite code is required.")
    .max(64, "Country invite code is too long.")
    .transform((value) => value.toUpperCase()),
  displayName: z
    .string()
    .trim()
    .max(80, "Display name is too long.")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type JoinGamePayload = z.infer<typeof joinGamePayloadSchema>;
