import { describe, expect, it } from "vitest";
import { createApiError, createApiSuccess } from "@/lib/api/responses";

describe("API response helpers", () => {
  it("creates PRD-shaped success responses", () => {
    expect(createApiSuccess({ gameId: "game-1" }, { clientMutationId: "mutation-1", serverVersion: 3 })).toEqual({
      ok: true,
      data: { gameId: "game-1" },
      events: undefined,
      warnings: undefined,
      clientMutationId: "mutation-1",
      serverVersion: 3,
    });
  });

  it("creates PRD-shaped error responses", () => {
    expect(createApiError("invalid_payload", "Bad payload.", { details: { field: "gameCode" } })).toEqual({
      ok: false,
      warnings: undefined,
      error: {
        code: "invalid_payload",
        message: "Bad payload.",
        details: { field: "gameCode" },
      },
      clientMutationId: undefined,
      serverVersion: undefined,
    });
  });
});
