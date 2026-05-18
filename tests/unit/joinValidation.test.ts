import { describe, expect, it } from "vitest";
import { joinGamePayloadSchema } from "@/lib/validation/joinGame";

describe("join payload validation", () => {
  it("normalizes game and invite codes", () => {
    const parsed = joinGamePayloadSchema.parse({
      gameCode: " gpg-test ",
      inviteCode: " usa-test ",
      displayName: " Team A ",
    });

    expect(parsed).toEqual({
      gameCode: "GPG-TEST",
      inviteCode: "USA-TEST",
      displayName: "Team A",
    });
  });

  it("rejects malformed join payloads", () => {
    expect(() =>
      joinGamePayloadSchema.parse({
        gameCode: "",
        inviteCode: "",
      }),
    ).toThrow();
  });
});
