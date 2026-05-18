"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiResponse, SetPhaseResponseDTO } from "@/lib/api/types";

const phaseOptions = [
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
] as const;

export default function AdminPhasePage() {
  const params = useParams<{ gameId: string }>();
  const [phase, setPhase] = useState<(typeof phaseOptions)[number]>("order_submission");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/round/set-phase", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          gameId: params.gameId,
          phase,
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
          reason: "Phase 2 public realtime test",
        }),
      });
      const payload: unknown = await response.json();

      if (!isSetPhaseResponse(payload) || !payload.ok || !payload.data) {
        setMessage(getSetPhaseErrorMessage(payload));
        return;
      }

      setMessage(`Round ${payload.data.round.number} is now ${payload.data.round.phase}.`);
    } catch {
      setMessage("Could not reach the phase endpoint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-xl">
        <Card className="border-white/10 bg-white text-slate-950">
          <CardHeader>
            <CardTitle>Phase Toggle</CardTitle>
            <CardDescription>Temporary Phase 2 control for public phase and deadline updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-medium">
                <span>Phase</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={phase}
                  onChange={(event) => setPhase(event.target.value as (typeof phaseOptions)[number])}
                >
                  {phaseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                aria-label="Deadline"
                type="datetime-local"
                value={deadlineAt}
                onChange={(event) => setDeadlineAt(event.target.value)}
              />
              <Input
                aria-label="Admin password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
              {message ? <p className="text-sm font-medium">{message}</p> : null}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Updating..." : "Update Phase"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function isSetPhaseResponse(value: unknown): value is ApiResponse<SetPhaseResponseDTO> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { ok?: unknown };
  return typeof candidate.ok === "boolean";
}

function getSetPhaseErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") {
    return "Phase update failed.";
  }

  const candidate = value as { error?: { message?: unknown } };
  return typeof candidate.error?.message === "string" ? candidate.error.message : "Phase update failed.";
}
