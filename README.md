# Global Power Game PWA

Mobile-first PWA implementation of the Global Power Game classroom board game.

Project direction: **Path A' - functional-first, future-proofed for smooth UX and complete rules**.

This repository is intentionally initialized as a real application foundation, not a throwaway prototype. Phase 0 sets up the stack and boundaries; game schema, seed data, order logic, and rules adjudication begin in later phases.

## Core Stack

- Next.js App Router
- React
- TypeScript strict
- Tailwind CSS
- shadcn/ui-compatible components
- Zustand
- Prisma
- Supabase Postgres
- Supabase Realtime
- Zod
- Vitest + React Testing Library
- pnpm

## Important Documents

Read these before implementing a phase:

- `docs/PRD.md` - product and architecture spec
- `docs/RULES.md` - implementation-facing game rules
- `docs/DECISIONS.md` - architectural decisions
- `docs/HANDOFF.md` - project handoff summary
- `prompts/CODEX_PHASES.md` - phase-by-phase Codex prompts

## Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer
- Git
- One local Postgres-compatible database option:
  - Preferred: Supabase CLI local development
  - Fallback: Docker Postgres or ordinary local Postgres

If pnpm is not installed:

```bash
npm install -g pnpm
```

## Install

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

`.env.local` is intentionally ignored by git.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_power_game"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="replace-me"
SUPABASE_SERVICE_ROLE_KEY="replace-me-server-only"
ADMIN_PASSWORD="replace-me"
```

Rules:

- Browser code may only use `NEXT_PUBLIC_*` variables.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be imported into client components.
- `ADMIN_PASSWORD` is temporary MVP admin auth for later phases.

## Local DB Setup

### Preferred: Supabase CLI

Install the Supabase CLI using the official Supabase instructions for your OS, then run:

```bash
supabase init
supabase start
```

Use the local Supabase Postgres connection string for `DATABASE_URL`, and copy the local API URL and anon key into `.env.local`.

Phase 0 does not require Supabase CLI to exist. Realtime subscriptions are only stubbed until later phases.

### Fallback: Docker Postgres

If Supabase CLI is unavailable, use ordinary Postgres. Example Docker command:

```bash
docker run --name global-power-game-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=global_power_game \
  -p 5432:5432 \
  -d postgres:16
```

Then keep:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_power_game"
```

This fallback supports Prisma development, but Supabase Realtime behavior will be limited until a Supabase project is available.

### Fallback: Existing Local Postgres

Create a database named `global_power_game`, then adjust `DATABASE_URL` to match your local user, password, host, and port.

## Development

Run the Next.js dev server:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

Test:

```bash
pnpm test
pnpm test:watch
```

## Prisma

Validate schema:

```bash
pnpm prisma:validate
```

Generate Prisma Client:

```bash
pnpm prisma:generate
```

Run migrations in later phases:

```bash
pnpm db:migrate
```

Reserved future scripts:

```bash
pnpm db:seed
pnpm db:reset
```

In Phase 0, `db:seed` and `db:reset` intentionally fail with a placeholder message because no domain schema or seed data exists yet.

## Current Structure

```txt
app/
  join/
  player/
  admin/
  api/
components/
  admin/
  battle/
  map/
  orders/
  ui/
lib/
  api/
  auth/
  db/
  realtime/
  store/
  validation/
prisma/
rules-engine/
tests/
  fixtures/
  rules-engine/
  unit/
docs/
prompts/
```

## Troubleshooting

### `pnpm` is not recognized

Install pnpm with npm:

```bash
npm install -g pnpm
```

Then reopen the terminal and run:

```bash
pnpm --version
```

### Prisma cannot connect

Verify that Postgres or Supabase local is running and that `DATABASE_URL` in `.env.local` matches the active database.

### Supabase CLI is unavailable

Use Docker Postgres or ordinary local Postgres for Phase 0 and Phase 1 schema work. Document that realtime behavior is not locally verified until Supabase CLI or hosted Supabase is available.

### Service role key safety

Only `lib/db/supabaseServer.ts` may reference `SUPABASE_SERVICE_ROLE_KEY`. Client components and browser helpers must use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

## Phase Roadmap

- Phase 0: architecture setup, tooling, Prisma baseline, Supabase stubs, Zustand skeleton, sanity test
- Phase 1: complete schema and seed countries, regions, edges, naval access, and default ruleset
- Phase 2: public realtime state layer, join flow, player dashboard, interactive map
- Phase 3: order composer and optimistic order submission
- Phase 4: admin console for manual demo operation
- Phase 5: pure rules engine v1 for common combat
- Phase 6: special rules, bonuses, elimination, asylum
- Phase 7: storyboard reports and mobile UX polish
- Phase 8: production deployment, auth hardening, RLS, PWA, E2E, red-team

## Codex Workflow

Work phase-by-phase, keep scope tight, run checks, and commit valid states. Expected Phase 0 commit:

```txt
chore: initialize project architecture
```
