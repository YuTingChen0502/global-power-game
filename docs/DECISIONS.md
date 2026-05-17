# Global Power Game PWA — Architecture Decisions

This file records architectural and rules-implementation decisions that should remain stable across phases unless explicitly superseded.

## ADR-001 — Product direction: Path A'

Decision: Build functional gameplay first while reserving architecture for smooth UX and complete future rules.

Implications:

- Do not begin with pure visual polish.
- Do not create a throwaway local-only prototype.
- Use real data model, event log, admin override, and rules-engine boundaries from day one.
- UI can be simple in early phases, but data flow must be future-proof.

## ADR-002 — Tech stack

Decision:

- Next.js App Router
- React + TypeScript strict
- Tailwind CSS + shadcn/ui
- Zustand
- Supabase Postgres + Supabase Realtime
- Prisma ORM
- Zod validation
- Vitest + React Testing Library
- Playwright from production/red-team phase

Reasoning:

- Next.js App Router supports server-side API routes and PWA deployment.
- Prisma gives schema discipline for complex game state.
- Supabase gives hosted Postgres and realtime without building custom sockets early.
- Zustand is simpler than Redux for mobile game state and optimistic updates.

## ADR-003 — Rules engine must be pure

Decision: `rules-engine/` must contain pure deterministic TypeScript functions and no Prisma, Supabase, or filesystem imports.

Allowed:

- TypeScript types
- deterministic transformations
- validation
- adjudication
- event generation

Disallowed:

- DB reads/writes
- API route imports
- environment variables
- network calls
- random behavior unless seeded and explicit

Reasoning:

- Rules tests need to be fast and fixture-driven.
- Admin preview and commit should share the same engine output.
- Reproducibility matters more than convenience.

## ADR-004 — Event-first adjudication

Decision: Every adjudication result must produce `GameEvent[]`. Text reports, animation storyboards, and battle timelines derive from these events.

Implications:

- Do not write report markdown as the only adjudication output.
- Do not hardcode animations separately from engine events.
- `BattleReport.markdown` is derived or admin-edited presentation, not the canonical result.

## ADR-005 — Realtime scope before RLS hardening

Decision: Early phases use public realtime only for safe public state:

- round phase
- round deadline
- published public game events
- connection state

Private country/admin data must be fetched through API routes with token/admin validation until Phase 8 RLS hardening.

Reasoning:

- Browser clients must not subscribe to private country/admin table changes before RLS policies are correct.
- Public realtime is enough to create phase-change responsiveness.

## ADR-006 — Optimistic state reconciliation

Decision: State truth precedence is:

```txt
server-confirmed API response
> newer server realtime patch
> optimistic state
```

Use:

- `clientMutationId`
- `serverVersion`
- `updatedAt`
- `pendingMutations`

Reasoning:

- `transactionId` alone is insufficient because admin tools, system jobs, and Prisma Studio edits may not carry the player's transaction id.
- The UI must be able to roll back failed optimistic submissions.

## ADR-007 — Schema should reserve complete-rule models from Phase 1

Decision: Add future-proof models in the initial schema instead of repeated ad-hoc migrations.

Mandatory additional models:

- `Ruleset`
- `GamePlayer`
- `CountryInviteCode`
- `RoundHegemon`
- `RoundEffect`
- `UnitAdjustment`
- `OrderVersion`
- `BattleReport`
- `ClientMutation`

Reasoning:

- Special rules, player tokens, battle reports, and optimistic reconciliation are known requirements.
- Reserving these models early reduces schema churn and migration risk.

## ADR-008 — Domain enums in TypeScript, strings in Prisma

Decision: Use strings for domain enum fields in Prisma, but define strict TypeScript union types in `rules-engine/types.ts`.

Reasoning:

- Game rules may change during playtesting.
- String fields keep migrations flexible.
- TypeScript unions still provide compile-time safety inside the engine.

## ADR-009 — Map target highlighting in Phase 2 is only possible-target logic

Decision: Phase 2 map highlighting uses lightweight `getPossibleTargets`, not full legal validation.

UI label must say `possible targets`, not `legal targets`.

Reasoning:

- Full legality depends on current orders, support, effects, asylum, phase, and special rules.
- Early map UX should guide players but not promise final validation.

## ADR-010 — Support order semantics

Decision: A support order must reference a concrete attack/defense intent.

Preferred:

- `supportOrderId`

Fallback:

- `supportCountryId`
- `supportActionType`
- `supportTargetRegionId`

A support order contributes only if there is actual matching combat.

Reasoning:

- Support should not simply add generic power to a target region.
- This prevents ambiguous or exploitable support interpretation.

## ADR-011 — Amphibious operation structure

Decision: Amphibious attack is a compound order:

- parent: `actionType = amphibious_attack`, counts toward order limit
- child navy: `compoundRole = naval_carrier`, does not count
- child army: `compoundRole = land_payload`, does not count

Reasoning:

- A single UI card can still map to explicit engine operations.
- Parent/child rows make validation, preview, and audit clear.

## ADR-012 — Special-effect timing

Decision:

- `chip_disrupt`: same-round pre-combat effect if a hegemon exists at round start.
- `declare_embargo`: creates a next-round pending effect requiring target-country selection.
- double paralysis can happen when an already selected `embargo_frozen` unit is also hit by same-round `chip_disrupted`.

Reasoning:

- Chip is reactive/tactical.
- Embargo is strategic/delayed.
- Explicit timing prevents hidden resolution order disputes.

## ADR-013 — Bonuses and penalties use UnitAdjustment

Decision: Resource, homeland, anti-hegemon, and penalty effects create `UnitAdjustment` records.

They do not silently add/remove units.

Reasoning:

- Placement choice may matter.
- Admin/player resolution needs visibility.
- Landlocked restrictions must be enforced.

## ADR-014 — Naval access must be explicit

Decision: Seed `CountryNavalAccess` explicitly. Ambiguous cases must use `note = REVIEW_NEEDED`.

Known review-needed areas:

- India naval access edge cases
- EU nearby waters
- Taiwan nearby waters

Reasoning:

- Geographic intuition is not enough for a classroom game map.
- Explicit seed data gives stable tests and predictable UI.

## ADR-015 — Rollback restriction for MVP

Decision: MVP rollback only supports latest current-round pre-adjudication snapshot.

Automatic rollback is disallowed if a later round has started and players have submitted orders.

Reasoning:

- Multi-round rollback can corrupt submitted orders and player expectations.
- Complex rollback should be manual/admin correction until a full event-sourcing model exists.

## ADR-016 — Admin override and audit are first-class

Decision: Every admin state-changing action must write `AuditLog` with before/after JSON and reason when applicable.

Reasoning:

- Teacher/admin rulings outrank the rules engine.
- Manual correction is expected, not an edge case.
- Auditability is essential for classroom trust.

## ADR-017 — Codex implementation style

Decision: Codex should work phase-by-phase, commit only valid states, and end each phase with a completion report.

Required final report fields:

- changed files
- commands run
- tests/checks result
- DoD checklist
- unresolved decisions
- git status
- commit hash if committed

Codex should not ask for confirmation unless:

1. a required secret/credential is missing
2. a destructive action would delete user data
3. the PRD and current user instruction conflict
4. an implementation choice would violate game rules or security boundaries

## ADR-018 — Phase boundaries

Decision: Keep phase scope strict.

Examples:

- Phase 0 should not add domain models.
- Phase 1 should not implement UI.
- Phase 2 should not submit orders.
- Phase 3 should not implement full rules adjudication.
- Phase 4 should support manual demo, not automatic engine.
- Phase 5 should implement common battle automation, not special powers.
- Phase 6 should implement special powers.
- Phase 7 should polish UX without changing rules behavior.
- Phase 8 should harden production without changing rules unless fixing tested bugs.

Reasoning:

- Strict phase boundaries reduce Codex drift.
- Each phase has a testable Definition of Done.

## ADR-019 - Phase 0 foundation scope

Decision: Phase 0 configures Prisma, Supabase clients, Zustand, Tailwind, and shadcn/ui-compatible components, but intentionally leaves Prisma without game-domain models.

Implications:

- `prisma/schema.prisma` contains only generator and datasource configuration in Phase 0.
- Domain models, migrations, and seed data begin in Phase 1.
- Supabase browser code may only use `NEXT_PUBLIC_*` variables.
- The service role client lives behind `server-only` in `lib/db/supabaseServer.ts`.
- UI pages are baseline shells only and must not implement player/admin workflows yet.

Reasoning:

- This keeps Phase 0 focused on architecture setup.
- It avoids schema churn before the Phase 1 seed/data-model pass.
- It preserves the security boundary for later Supabase and realtime work.
