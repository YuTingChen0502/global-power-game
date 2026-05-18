"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiResponse, JoinGameResponseDTO } from "@/lib/api/types";
import { useGameStore } from "@/lib/store/gameStore";

export default function JoinPage() {
  const router = useRouter();
  const setPlayerIdentity = useGameStore((state) => state.setPlayerIdentity);
  const [gameCode, setGameCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/join-game", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameCode,
          inviteCode,
          displayName,
        }),
      });
      const payload: unknown = await response.json();

      if (!isJoinApiResponse(payload) || !payload.ok || !payload.data) {
        setErrorMessage(getJoinErrorMessage(payload));
        return;
      }

      setPlayerIdentity({
        gameId: payload.data.gameId,
        countryId: payload.data.countryId,
        playerToken: payload.data.playerToken,
      });
      router.push("/player");
    } catch {
      setErrorMessage("Could not reach the join endpoint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <Card className="w-full max-w-md border-white/10 bg-white text-slate-950">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
          <CardDescription>Enter the game code and country invite code from the admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              aria-label="Game code"
              autoComplete="off"
              placeholder="Game code"
              value={gameCode}
              onChange={(event) => setGameCode(event.target.value)}
            />
            <Input
              aria-label="Country invite code"
              autoComplete="off"
              placeholder="Country invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
            <Input
              aria-label="Display name"
              autoComplete="nickname"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            {errorMessage ? <p className="text-sm font-medium text-destructive">{errorMessage}</p> : null}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function isJoinApiResponse(value: unknown): value is ApiResponse<JoinGameResponseDTO> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { ok?: unknown };
  return typeof candidate.ok === "boolean";
}

function getJoinErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") {
    return "Join failed.";
  }

  const candidate = value as { error?: { message?: unknown } };
  return typeof candidate.error?.message === "string" ? candidate.error.message : "Join failed.";
}
