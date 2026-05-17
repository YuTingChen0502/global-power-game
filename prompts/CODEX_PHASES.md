# Global Power Game PWA — Codex Phase Prompts

Use this file to run the implementation phase-by-phase with Codex.

## 0. General Codex operating rules

Use this before every phase:

```text
You are working on the Global Power Game PWA repo.

First read:
- docs/PRD.md
- docs/RULES.md if present
- docs/DECISIONS.md if present
- the previous phase completion report if present

Operate autonomously. Do not ask for confirmation unless:
1. a required secret/credential is missing,
2. a destructive action would delete user data,
3. the PRD and current user instruction conflict,
4. an implementation choice would violate the game rules or security boundaries.

Before coding, write a short execution plan in the terminal/chat.
Then implement.
Keep changes within this phase's scope.
Use TypeScript strict.
Do not use `any`.
Do not use non-null assertions unless impossible to avoid and documented.
Run the listed tests/checks.
Commit at the end if the repo is in a valid state.

End every phase with:
- changed files
- commands run
- tests/checks result
- DoD checklist
- unresolved decisions
- git status
- commit hash if committed
```

---

# Phase 0 Prompt — Setup

```text
Task: Phase 0 — architecture setup.

Goal:
Initialize the project so later phases can build without structural churn.

Read docs/PRD.md completely. Pay special attention to:
- Path A'
- tech stack
- required folder structure
- Phase 0 DoD
- engineering rules

Implement:
1. Next.js App Router + TypeScript strict.
2. Tailwind CSS + shadcn/ui base setup.
   Install UI primitives likely needed soon: button, input, card, dialog, sheet, dropdown-menu, badge, tabs, table, textarea, toast/sonner if available.
3. Supabase local/Postgres setup docs.
   Do not assume Supabase CLI exists; document fallback Docker/Postgres steps.
4. Prisma installed and configured for Postgres.
5. Supabase browser/server clients:
   - lib/db/supabaseBrowser.ts
   - lib/db/supabaseServer.ts
   Ensure service role key is only referenced server-side.
6. Zustand skeleton store:
   - lib/store/gameStore.ts
   Include typed state shape and stub actions that throw "not implemented".
7. Vitest + React Testing Library + one sanity test.
8. Required folders:
   app/join, app/player, app/admin, app/api,
   components/ui, components/map, components/orders, components/admin, components/battle,
   lib/api, lib/auth, lib/db, lib/realtime, lib/store, lib/validation,
   prisma, rules-engine, tests/fixtures, tests/unit, tests/rules-engine, docs, prompts.
9. README.md with prerequisites, install, local DB, dev, test, common troubleshooting.
10. docs/DECISIONS.md with initial architecture decisions.

Out of scope:
- no Prisma domain models
- no game logic
- no real UI beyond generated baseline
- no deployment

Checks:
- pnpm install
- pnpm lint if available
- pnpm test
- pnpm dev starts or document why not possible in this environment
- npx prisma validate

Commit:
`chore: initialize project architecture`
```

---

# Phase 1 Prompt — Schema + Seed

```text
Task: Phase 1 — schema, domain types, seed data.

Goal:
Create the complete future-proof data model and seed the full map/ruleset.

Read docs/PRD.md sections:
- domain summary
- data model
- Phase 1 DoD
Also read docs/RULES.md if present.

Implement:
1. prisma/schema.prisma with all required models:
   Game, Round, Ruleset, Country, Region, RegionEdge, CountryNavalAccess,
   RegionControl, UnitStack, Order, StatusEffect, AsylumGrant,
   GameEvent, BattleEvent, BattleReport,
   RoundHegemon, RoundEffect, UnitAdjustment,
   GameStateSnapshot, AuditLog, Ruling,
   GamePlayer, CountryInviteCode, OrderVersion, ClientMutation.
2. Use strings for domain enums in Prisma, but define TypeScript union types in rules-engine/types.ts.
3. Add helpers:
   - lib/utils/assertNever.ts or lib/utils.ts
   - rules-engine/types.ts
   - rules-engine/domainIds.ts
4. Migration:
   - pnpm prisma migrate dev --name init
   - pnpm prisma generate
5. prisma/seed.ts:
   - 9 countries
   - exactly 23 core regions
   - region coordinates as placeholder but coherent for SVG
   - all listed land/special edges
   - do NOT create china_western_frontier <-> asean edge
   - explicit CountryNavalAccess, with REVIEW_NEEDED notes where ambiguous
   - default Ruleset row with config JSON
6. Add package scripts:
   - db:migrate
   - db:seed
   - db:reset
7. Tests:
   - tests/unit/seed.test.ts
   - tests/unit/domain.test.ts
   Cover:
   - 9 countries and correct initial army/navy totals
   - 23 regions exist
   - china west has no asean edge
   - india north has asean special bridge
   - ukraine has middle_east special bridge
   - ukraine is landlocked
   - taiwan specialPowerKey chip_disruption
   - usa has global naval access
   - Ruleset config exists
   - reserved schema fields exist where testable

Out of scope:
- no API routes except seed/test helpers
- no UI
- no rules engine resolution

Checks:
- pnpm prisma validate
- pnpm db:seed
- pnpm test

Commit:
`feat: add domain schema and seed data`
```

---

# Phase 2 Prompt — State + Realtime + Interactive Map

```text
Task: Phase 2 — state layer, public realtime, interactive map.

Goal:
Create the UX architecture foundation without implementing order submission.

Read docs/PRD.md sections:
- architecture
- realtime policy
- UI/UX
- Phase 2 DoD

Implement:
1. Full Zustand store in lib/store/gameStore.ts:
   - game, round, regions, edges, controls, unitStacks
   - myCountryId, playerToken
   - selectedOriginId, selectedTargetId, legalTargetIds
   - draftOrders placeholder
   - gameEvents
   - connectionStatus
   - pendingMutations map with clientMutationId
   - actions: hydrateInitialState, selectOrigin, selectTarget, clearSelection, applyRealtimePatch, setConnectionStatus
2. State reconciliation:
   - API response > newer realtime patch > optimistic state
   - support clientMutationId and serverVersion/updatedAt
   - unit tests for this precedence
3. Realtime:
   - lib/realtime/subscribe.ts
   - subscribeToGamePublic(gameId)
   - subscribeToEvents(gameId)
   - stub subscribeToCountryPrivate and subscribeToAdmin but do not expose private data without RLS
   - reconnect handling
4. Join flow:
   - app/join/page.tsx
   - POST /api/join-game
   - validates game code + country invite code
   - returns playerToken, countryId, gameId
   - stores token client-side
5. Player dashboard:
   - app/player/page.tsx
   - mobile layout with top status, map, bottom tabs
6. Map:
   - components/map/GameMap.tsx
   - SVG with react-zoom-pan-pinch
   - render regions and land/special edges
   - region color by control
   - unit chips
   - tap select origin/target
   - legal target highlighting using lightweight `getPossibleTargets`
   - bottom sheet component
7. Add `rules-engine/getPossibleTargets.ts`:
   - lightweight only
   - land unit: land/special edges
   - navy: CountryNavalAccess
   - returns "possible", not final legality
8. Admin phase toggle minimal page/API:
   - app/admin/games/[gameId]/phase/page.tsx
   - POST /api/admin/round/set-phase
   - writes AuditLog

Out of scope:
- no order submission
- no full validation
- no admin console
- no private realtime hardening
- no animation polish

Checks:
- pnpm test
- manual two-tab test: admin changes phase, player updates within ~2s
- mobile width check 375px
- document realtime limitations in docs/DECISIONS.md

Commit:
`feat: add realtime state layer and interactive map`
```

---

# Phase 3 Prompt — Order Composer

```text
Task: Phase 3 — order composer, compound orders, optimistic submit.

Goal:
Players can create and submit orders quickly on mobile.

Read docs/PRD.md sections:
- order schema
- player order flow
- amphibious compound order
- paired political order
- API contract
- Phase 3 DoD

Implement:
1. Components:
   - components/orders/OrderCard.tsx
   - components/orders/OrderListPanel.tsx
   - components/orders/OrderEditor.tsx
   - components/orders/AmphibiousOrderEditor.tsx
   - components/orders/PoliticalRequestPanel.tsx
   - components/orders/EffectSelectionPanel.tsx stub
2. Map integration:
   - selecting origin+target creates draft order in store
   - default actionType should be "move"; user can change to attack/support/etc.
3. Lightweight validation:
   - lib/validation/orderValidation.ts
   - unit availability
   - origin belongs to player
   - max 8 countable orders
   - child amphibious orders do not count
   - obvious malformed payloads
4. API routes with Zod:
   - POST /api/orders/draft
   - POST /api/orders/submit
   - POST /api/orders/duplicate-last-round
   - DELETE /api/orders/[id]
   - POST /api/political/respond
   All return ApiResponse<T>.
5. Optimistic submit:
   - create clientMutationId
   - mark submitted_pending
   - rollback on failure
   - reconcile on success
6. Duplicate last round and quick defense:
   - duplicate submitted parent orders only, then recreate children
   - quick defense creates explicit non-counting defend orders or marks UI implicit defense; document choice
7. Amphibious compound:
   - parent + navy child + army child
   - parent counts toward limit
   - children do not count
   - UI shows one card
8. Political paired order:
   - request_asylum creates pending request
   - target country sees request panel after API refetch/realtime stub
   - approve/reject creates linked response order
9. Tests:
   - lightweight validation
   - duplicate last round
   - quick defense
   - amphibious parent/children
   - paired asylum approval
   - optimistic rollback

Out of scope:
- no full rules engine validation
- no admin review UI
- no battle report

Checks:
- pnpm test
- manual: create 8 orders, 9th rejected
- manual: amphibious card creates 3 DB rows but counts as 1
- manual: political request + approve linked correctly

Commit:
`feat: add mobile order composer`
```

---

# Phase 4 Prompt — Admin Console

```text
Task: Phase 4 — admin console and manual demo capability.

Goal:
Demo v0.1: admin can run a game manually even without automatic rules engine.

Read docs/PRD.md:
- admin role
- phase lifecycle
- override/audit requirements
- Phase 4 DoD

Implement:
1. Simple admin gate:
   - ADMIN_PASSWORD env
   - httpOnly cookie
   - middleware for /admin
   - no full Supabase Auth yet
2. Admin pages:
   - app/admin/page.tsx game list
   - app/admin/games/new/page.tsx
   - app/admin/games/[id]/page.tsx tabbed console
3. Game setup:
   - create game
   - create Round 1
   - generate 9 CountryInviteCode rows
   - show copyable invite codes once
4. Deployment editor:
   - reuse map in admin mode
   - add/edit UnitStack
   - validate totals against initialArmy/initialNavy
   - allow override but require reason
5. Phase control:
   - legal phase transitions
   - deadlines
   - AuditLog
   - public realtime update
6. Order review:
   - table by country
   - edit/mark invalid/mark valid
   - create manual political approval
   - write OrderVersion and AuditLog
7. Manual state editor:
   - UnitStack
   - RegionControl
   - StatusEffect
   - AsylumGrant
   - UnitAdjustment
   Every write must produce AuditLog with before/after JSON.
8. Ruling panel:
   - add/list Ruling
9. Publish panel:
   - list GameEvents if any
   - markdown BattleReport editor
   - publish report
   - phase = published
10. Snapshots and rollback:
   - create manual snapshots
   - create before_adjudication snapshot before any manual "resolve" action
   - restore only latest current-round snapshot
   - block rollback if a later round has submitted orders
11. Demo v0.1 happy path doc:
   - docs/PLAYTEST.md with exact manual test steps

Out of scope:
- no automatic adjudication
- no polish animation
- no production auth

Checks:
- pnpm test
- manually run one 1-round game:
  setup → deployment → order_submission → admin_review → manual state edit → publish
- verify AuditLog rows exist for admin writes

Commit:
`feat: add admin console for manual adjudication`
```

---

# Phase 5 Prompt — Rules Engine v1

```text
Task: Phase 5 — automatic rules engine for common cases.

Goal:
Demo v0.2: automate common land/naval/amphibious/support battles while keeping admin override.

Read:
- docs/PRD.md rules engine sections
- docs/RULES.md
- existing schema/types/tests
- Phase 5 DoD

Implementation constraints:
- rules-engine functions must be pure and IO-free
- no Prisma imports inside rules-engine
- no UI changes except admin adjudication integration
- no special rules: hegemon/chip/embargo/asylum/resource bonus are Phase 6 unless trivial stubs already exist

Implement in small commits if useful:
1. rules-engine/types.ts finalize:
   AdjudicationInput, GameState, OperationNode, ValidationResult, BattleResolution, StatePatch, AdjudicationResult.
2. rules-engine/validateOrders.ts:
   - unit availability
   - origin correctness
   - land adjacency
   - naval access
   - amphibious parent/children
   - order limit
   - political pair warnings
   - countable order logic
3. rules-engine/buildOperationGraph.ts:
   - operation nodes
   - dependencies
   - head-on detection
   - duplicate unit commitment detection
4. resolvers:
   - resolveNaval.ts
   - resolveAmphibious.ts
   - resolveLand.ts
   - resolveRetreats.ts
   - resolveOccupation.ts
   - applyLosses.ts
5. generateEvents.ts:
   - deterministic GameEvent sequence
   - BattleEvent notes explaining power calculation and ruling basis
6. adjudicateRound.ts:
   - orchestrates full pipeline
   - returns patches/events, not DB writes
7. API:
   - POST /api/admin/round/adjudicate/preview
   - POST /api/admin/round/adjudicate/commit
   Transaction on commit:
   before snapshot → engine → apply patches → write events → after snapshot → audit log
8. Admin integration:
   - preview state diff
   - confirm commit
   - cancel back to admin_review

Fixture tests: at minimum 16:
- china west → asean invalid
- india north → asean valid
- ukraine → middle_east valid
- land army cross-sea without navy invalid
- usa amphibious global valid
- amphibious naval tie fails, army survives
- empty territory occupation
- support without battle ignored
- head-on tie both retreat
- origin occupied after standoff destroys retreating units
- homeland congestion fallback
- 1v1 land standoff
- majority destroys minority
- self-support
- naval before land
- amphibious compound structure

Out of scope:
- no hegemon/chip/embargo/asylum/resource bonus automation
- no full Diplomacy paradox solver
- supportCutRule remains admin_only

Checks:
- pnpm test
- all fixtures pass
- manual Demo v0.2: two rounds with at least one land battle, one naval battle, one amphibious battle

Commit:
`feat: add rules engine v1`
```

---

# Phase 6 Prompt — Special Rules v1

```text
Task: Phase 6 — hegemon, chip, embargo, bonuses, elimination, asylum.

Goal:
Demo v0.3: implement distinctive game mechanics.

Read:
- docs/PRD.md special rules
- docs/RULES.md modules for bonuses/special powers/asylum
- Phase 6 DoD
- current rules-engine pipeline

Implement:
1. RoundHegemon:
   - detect at round start after prior adjustments
   - store RoundHegemon rows
   - show public hegemon list
2. UnitAdjustment:
   - resource bonus
   - homeland gain/loss
   - recapture offset
   - anti-hegemon bonus
   - landlocked restrictions
   - admin/player resolution UI if required
3. Chip disruption:
   - actionType = chip_disrupt
   - requires Taiwan and hegemonAtRoundStart
   - same-round pre-combat StatusEffect chip_disrupted
   - targeted navy defense = 0, destroyed if attacked
4. Embargo:
   - actionType = declare_embargo
   - requires sole navy control of malacca/hormuz
   - creates next-round pending StatusEffect embargo_frozen
   - effect_selection phase
   - target country chooses stack; split stack if count > 1
   - frozen stack cannot act
5. Double paralysis:
   - chip + embargo same stack resolves defense zero/direct destruction
6. Elimination:
   - army total zero → country eliminated
   - remaining navy inactive unless active asylum
7. Asylum:
   - request_asylum + approve_asylum creates AsylumGrant
   - exiled navy lifecycle
   - allowed actions: defend, support_defend, support_attack
   - no land occupation
   - revoke_asylum support if schema exists
8. UI additions:
   - player pending effects panel
   - hegemon list
   - own status effects
   - unit adjustment resolution if implemented
   - report displays bonus/effect events
9. Tests:
   - hegemon detection
   - Taiwan chip happy path
   - embargo declaration and selection
   - double paralysis
   - anti-hegemon bonus
   - ASEAN held bonus
   - Ukraine/landlocked bonus only army
   - homeland loss/gain/recapture
   - EU eliminated + USA asylum + exiled navy support
   - effect selection timeout/admin selection

Out of scope:
- no storyboard polish
- no production auth
- no complex chat

Checks:
- pnpm test
- manual Demo v0.3: 3-4 rounds triggering hegemon, chip, embargo, bonus, elimination/asylum

Commit:
`feat: implement special rules v1`
```

---

# Phase 7 Prompt — Storyboard + UX Polish

```text
Task: Phase 7 — storyboard report and mobile polish.

Goal:
Turn functional gameplay into a smooth mobile game-like experience without changing backend contracts.

Read:
- docs/PRD.md UI/UX and GameEvent sections
- existing GameEvent schema and map components
- Phase 7 DoD

Strict constraints:
- do not change rules-engine behavior
- do not change DB schema unless absolutely necessary and documented
- do not change API contracts except additive display fields

Implement:
1. Install animation/audio deps:
   - framer-motion
   - howler or native audio helper
2. Design tokens:
   - app/design-tokens.css or Tailwind theme
   - cold-war/Risk-like palette
   - country colors
   - region state colors
   - action colors
   - spacing, radius, shadow, motion durations
   - Noto Sans TC + Inter
3. Storyboard:
   - components/battle/StoryboardPlayer.tsx
   - reads GameEvent[]
   - supports play/pause/previous/next/speed
   - event duration from displayDurationMs or default
4. Map animations:
   - move arrows/chips
   - battle pulse
   - unit destroyed fade
   - occupy color transition
   - bonus glow
5. Report view:
   - timeline list synchronized with map animation
   - replay published round
6. Mobile polish:
   - safe-area insets
   - tap target >= 44px
   - bottom sheet drag feel
   - tabs transitions
   - loading skeletons
   - connection status and submit status microinteractions
7. Audio/haptics:
   - submit success
   - phase change
   - battle
   - unit destroyed
   - occupation
   - navigator.vibrate fallback
   - user setting to mute/reduce motion
8. Accessibility:
   - prefers-reduced-motion support
   - buttons labelled
   - color is not sole status signal

Checks:
- pnpm test
- manual mobile check at 375px width
- reduced motion mode
- no rules-engine tests broken

Commit:
`feat: add storyboard battle reports and mobile polish`
```

---

# Phase 8 Prompt — Production + Red-Team

```text
Task: Phase 8 — production deploy, auth hardening, red-team, E2E.

Goal:
Public Beta readiness.

Read:
- docs/PRD.md
- docs/RULES.md
- docs/API.md
- docs/DECISIONS.md
- docs/PLAYTEST.md
- previous phase completion reports

Constraints:
- do not change rules-engine behavior unless fixing a confirmed bug with tests
- do not weaken admin override/audit
- do not put service role key in client
- document every security decision

Implement:
1. Production Supabase:
   - create hosted project
   - run Prisma migrations
   - seed initial data if needed
   - configure storage only if needed
   - add raw SQL migrations for RLS and realtime publication
2. Auth hardening:
   - admin Supabase Auth magic link or email/password
   - keep player invite-code tokens for MVP
   - hash player tokens
   - rate limit /api/join-game and state-mutating endpoints
   - CSRF protection for mutations
   - server-only service role
3. RLS and realtime:
   - public data readable as appropriate
   - player can only read own private country data
   - admin can read/write admin data
   - direct realtime spoof/write attempts should fail
   - document policies in docs/DEPLOYMENT.md
4. PWA:
   - manifest
   - placeholder icons
   - standalone display
   - service worker app shell caching
   - iOS Safari and Android Chrome install test
5. Deployment:
   - Vercel
   - env vars
   - build command
   - migration procedure
   - rollback procedure
   - monitoring notes
6. E2E:
   - Playwright happy path:
     create game → join players → deploy → submit orders → adjudicate → publish
   - edge paths:
     amphibious win
     embargo selection
     country elimination
     asylum
     rollback blocked after later submissions
7. Red-team:
   Try to break:
   - deadline race: 9 teams submit simultaneously
   - malformed order payloads
   - oversized notes/payloadJson
   - SQL injection attempts
   - token reuse for another country
   - direct Supabase client writes
   - realtime spoofing
   - spam draft orders
   - simultaneous swap attacks
   - chain support
   - exile + chip + embargo same unit
8. Performance:
   - Lighthouse mobile >= 90 if realistic; otherwise document bottlenecks
   - FCP < 2s target
   - bundle analyzer
   - identify chunks > 500KB

Deliver:
- live URL
- docs/DEPLOYMENT.md
- docs/REDTEAM-FINDINGS.md
- tests/e2e/*
- list of P0/P1 issues fixed
- list of remaining P2/P3 issues

Checks:
- pnpm lint
- pnpm test
- pnpm build
- Playwright suite
- manual PWA install

Commit:
`chore: prepare production beta`
```
