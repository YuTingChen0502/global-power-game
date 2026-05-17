# Global Power Game PWA

Mobile-first PWA implementation of the classroom board game 「全球權力博弈」.

The project is built as both:

1. a player-facing mobile order-submission interface, and
2. an admin/rules-adjudication tool for teacher/TA use.

Project direction: **Path A' — functional-first, future-proofed for smooth UX and complete rules**.

## 1. Core goals

The app should support:

- game creation by admin
- player join by game code + country invite code
- mobile map-based order creation
- secret structured order submission
- admin phase control
- admin order review and override
- automatic/semi-automatic adjudication
- public battle report publishing
- audit trail, snapshots, and rollback
- eventual PWA deployment

## 2. Tech stack

- Next.js App Router
- React
- TypeScript strict
- Tailwind CSS
- shadcn/ui
- Zustand
- Prisma
- Supabase Postgres
- Supabase Realtime
- Zod
- Vitest + React Testing Library
- Playwright in production/red-team phase
- `react-zoom-pan-pinch` for map pan/zoom
- Framer Motion in UX polish phase

Package manager: `pnpm`

## 3. Important documents

Read these before implementing:

- `docs/PRD.md` — product and architecture spec
- `docs/RULES.md` — implementation-facing game rules
- `docs/DECISIONS.md` — architectural decisions
- `prompts/CODEX_PHASES.md` — phase-by-phase Codex prompts
- `docs/HANDOFF.md` — project handoff summary

Later documents:

- `docs/API.md`
- `docs/RULINGS.md`
- `docs/PLAYTEST.md`
- `docs/DEPLOYMENT.md`
- `docs/REDTEAM-FINDINGS.md`

## 4. Required repository structure

```txt
app/
  join/
  player/
  admin/
  api/
components/
  admin/
  map/
  orders/
  battle/
  ui/
docs/
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
prompts/
```

## 5. Environment variables

Create `.env.local` from `.env.example` after Phase 0.

Expected variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_power_game"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="replace-me"
SUPABASE_SERVICE_ROLE_KEY="replace-me-server-only"
ADMIN_PASSWORD="replace-me"
```

Rules:

- `NEXT_PUBLIC_*` variables may be used in browser code.
- `SUPABASE_SERVICE_ROLE_KEY` must never be imported or exposed in client components.
- Admin password is temporary MVP auth only and should be replaced/hardened in Phase 8.

## 6. Local development

Install dependencies:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Run tests:

```bash
pnpm test
```

Run lint if configured:

```bash
pnpm lint
```

Validate Prisma schema:

```bash
pnpm prisma validate
```

Generate Prisma client:

```bash
pnpm prisma generate
```

Run migration:

```bash
pnpm prisma migrate dev
```

Seed database:

```bash
pnpm db:seed
```

Reset database:

```bash
pnpm db:reset
```

## 7. Supabase local notes

Preferred: Supabase CLI local development.

Fallback: ordinary local Postgres or Docker Postgres is acceptable for early phases if Supabase CLI is unavailable, but realtime behavior should be documented as limited.

Codex should not assume Supabase CLI exists. Phase 0 should document both paths.

## 8. Phase roadmap

### Phase 0 — Setup

Goal: initialize project architecture.

Deliverables:

- Next.js + TypeScript strict
- Tailwind + shadcn/ui
- Prisma configuration
- Supabase client stubs
- Zustand skeleton
- Vitest sanity test
- required folders
- README and initial docs

### Phase 1 — Schema + Seed

Goal: complete future-proof schema and seed map/ruleset.

Deliverables:

- Prisma models
- migration
- 9 countries
- 23 regions
- land edges
- naval access
- default ruleset
- seed/domain tests

### Phase 2 — State + Realtime + Interactive Map

Goal: UX architecture foundation.

Deliverables:

- Zustand game store
- public realtime phase/deadline updates
- join flow
- mobile player dashboard
- pan/zoom SVG map
- possible-target highlighting

### Phase 3 — Order Composer

Goal: players can create and submit orders quickly.

Deliverables:

- order cards
- order editor
- amphibious compound UI
- paired political request UI
- duplicate last round
- quick defense
- optimistic submit

### Phase 4 — Admin Console

Goal: Demo v0.1 manual game management.

Deliverables:

- admin gate
- game creation
- invite codes
- deployment editor
- phase control
- order review/edit
- manual state editor
- battle report publishing
- latest-round rollback

### Phase 5 — Rules Engine v1

Goal: automate common battle adjudication.

Deliverables:

- pure rules engine
- validation
- operation graph
- land/naval/amphibious/support resolution
- event output
- preview/commit API
- 16 fixture tests

### Phase 6 — Special Rules v1

Goal: implement distinctive mechanics.

Deliverables:

- hegemon detection
- Taiwan chip disruption
- embargo
- resource and homeland effects
- anti-hegemon bonus
- elimination
- asylum/exiled navy

### Phase 7 — Storyboard + UX Polish

Goal: make the app feel like a smooth mobile game.

Deliverables:

- event storyboard player
- map animations
- report replay
- design tokens
- haptics/audio
- mobile polish

### Phase 8 — Production + Red-Team

Goal: public beta readiness.

Deliverables:

- hosted Supabase
- Vercel deployment
- PWA manifest/service worker
- hardened auth
- RLS policies
- Playwright E2E
- red-team findings
- deployment docs

## 9. Codex workflow

Recommended branch strategy:

```bash
git checkout -b main
# or use an existing stable branch as the base

git checkout -b codex/phase-0-setup
```

For each phase:

1. Read `docs/PRD.md`.
2. Read `docs/RULES.md`.
3. Read `docs/DECISIONS.md`.
4. Read previous phase completion report if present.
5. Execute only that phase's prompt from `prompts/CODEX_PHASES.md`.
6. Run checks.
7. Commit if repo is valid.
8. Report changed files, commands run, test result, DoD checklist, unresolved decisions, git status, and commit hash.

## 10. Implementation safety rules

- Do not use `any` unless impossible and documented.
- Do not use non-null assertions unless impossible and documented.
- Do not expose service role key to client.
- Do not subscribe to private country/admin realtime before RLS hardening.
- Do not silently mutate bonuses/penalties; use `UnitAdjustment`.
- Do not bypass `AuditLog` for admin writes.
- Do not implement ambiguous rules as final engine logic without warning/admin review.

## 11. Current next action

Start with Phase 0 using:

```txt
prompts/CODEX_PHASES.md → Phase 0 Prompt — Setup
```

Expected first commit:

```txt
chore: initialize project architecture
```

