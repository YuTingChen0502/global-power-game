# Global Power Game PWA — PRD

Version: 1.1-revised
Direction: Path A' — functional-first, future-proofed for smooth UX and complete rules

## 0. Purpose

This document is the single source of truth for the Global Power Game PWA project.

Conflict precedence:

1. Current user instruction
2. Teacher/admin current-round ruling
3. Later-round formal precedents
4. `docs/RULES.md`
5. This PRD
6. Automatic rules-engine behavior

Related documents:

* `docs/RULES.md`: implementation-facing complete game rules
* `docs/RULINGS.md`: accumulated teacher/admin rulings
* `docs/API.md`: API contract and DTOs
* `docs/DECISIONS.md`: architectural decisions
* `docs/PLAYTEST.md`: manual playtest notes
* `docs/DEPLOYMENT.md`: production operation guide
* `docs/REDTEAM-FINDINGS.md`: production hardening report
* `prompts/CODEX_PHASES.md`: Codex implementation prompts
* `docs/HANDOFF.md`: project handoff summary

## 1. Product overview

Global Power Game Online is a mobile-first PWA for a classroom Diplomacy-style board game. It is both a player interface and an adjudication/admin tool.

It supports:

* player join flow by game code and country invite code
* interactive strategic map
* secret structured order submission
* admin phase control
* admin order review and override
* semi-automatic and automatic adjudication
* event-sequence battle report
* audit trail, snapshot, and rollback

Design philosophy:

> Path A': build function first, but reserve realtime, interactive map, central store, event sequence, and complete schema from day one.

Non-negotiable from day one:

* Postgres + Supabase Realtime architecture
* Prisma ORM
* Zustand central store
* map as primary input surface
* event sequence for all adjudication output
* admin override, audit logging, snapshots, and rollback as first-class capabilities
* schema fields for complete future rules, even if some logic is delayed

## 2. Roles

### 2.1 Player

A team controlling one country. Usually uses mobile browser.

Player can:

* join game
* view current round, phase, deadline, and connection state
* view public map and own private units/orders/effects
* create draft orders
* submit orders
* duplicate previous round orders
* use quick defense
* respond to paired political requests
* select target units for pending effects
* view published battle reports

### 2.2 Admin

Teacher/TA. Usually uses desktop or tablet.

Admin can:

* create games
* manage country invite codes
* set initial deployments
* control phases and deadlines
* view, edit, invalidate, and override all orders
* run adjudication preview and commit
* manually edit game state
* add rulings
* publish battle reports
* create snapshots
* rollback latest current-round snapshot

## 3. Game-domain summary

### 3.1 Countries

| id          | name | tier | initialArmy | initialNavy | note                |
| ----------- | ---- | ---: | ----------: | ----------: | ------------------- |
| `usa`       | 美國   |    1 |           3 |           4 | global naval reach  |
| `china`     | 中國   |    1 |           4 |           2 | land expansion      |
| `russia`    | 俄羅斯  |    2 |           3 |           1 | buffer seeker       |
| `eu`        | 歐盟   |    2 |           2 |           2 | collective security |
| `india`     | 印度   |    2 |           2 |           2 | non-aligned         |
| `japan`     | 日本   |    2 |           1 |           3 | maritime barrier    |
| `ukraine`   | 烏克蘭  |    3 |           2 |           0 | landlocked          |
| `taiwan`    | 台灣   |    3 |           1 |           1 | chip disruption     |
| `australia` | 澳洲   |    3 |           1 |           1 | logistics base      |

### 3.2 Regions

Use 23 core regions.

Homeland / country regions:

1. `china_eastern_coast`
2. `china_western_frontier`
3. `china_northern_command`
4. `usa_indo_pacific_base`
5. `usa_homeland_atlantic`
6. `russia_europe`
7. `russia_far_east`
8. `india_northern_border`
9. `india_peninsula`
10. `eu_eastern_flank`
11. `eu_western_seaboard`
12. `japan`
13. `taiwan`
14. `australia`
15. `ukraine`

Land strategic regions:

16. `asean`
17. `central_asia`
18. `middle_east`
19. `korean_peninsula`

Sea/strait regions:

20. `south_china_sea`
21. `malacca_strait`
22. `hormuz_strait`
23. `giuk_gap`

`Region.kind` values:

* `land`
* `coastal_land`
* `resource_land`
* `buffer_land`
* `sea_zone`
* `strait`

### 3.3 Land adjacency

Seed exactly, bidirectional unless explicitly stated otherwise:

* `china_eastern_coast` ↔ `china_western_frontier`
* `china_eastern_coast` ↔ `china_northern_command`
* `china_western_frontier` ↔ `china_northern_command`
* `china_eastern_coast` ↔ `korean_peninsula`
* `korean_peninsula` ↔ `china_northern_command`
* `china_northern_command` ↔ `russia_far_east`
* `china_western_frontier` ↔ `central_asia`
* `central_asia` ↔ `russia_europe`
* `china_western_frontier` ↔ `india_northern_border`
* `india_northern_border` ↔ `central_asia`
* `india_northern_border` ↔ `india_peninsula`
* `india_northern_border` ↔ `asean`, edgeType = `special_land_bridge`, note = `經緬甸`
* `china_eastern_coast` ↔ `asean`
* `korean_peninsula` ↔ `russia_far_east`
* `russia_europe` ↔ `ukraine`
* `ukraine` ↔ `eu_eastern_flank`
* `eu_eastern_flank` ↔ `eu_western_seaboard`
* `russia_europe` ↔ `eu_eastern_flank`
* `eu_eastern_flank` ↔ `middle_east`, edgeType = `special_land_bridge`, note = `經土耳其`
* `ukraine` ↔ `middle_east`, edgeType = `special_land_bridge`, note = `經土耳其陸橋`
* `central_asia` ↔ `middle_east`, edgeType = `special_land_bridge`, note = `經伊朗`

Do not seed:

* `china_western_frontier` ↔ `asean`

Treat `russia_europe` ↔ `middle_east` as not a normal land edge. It is an amphibious/naval-adjacent precedent and must remain admin-reviewed until formalized.

### 3.4 Naval access seed policy

Seed `CountryNavalAccess` explicitly. Mark uncertain entries with `note = "REVIEW_NEEDED"`.

Baseline:

* `usa`: all sea/strait regions and all coastal regions
* `russia`: `giuk_gap`, `south_china_sea`, plus `russia_europe`, `russia_far_east`, and relevant adjacent coastal regions
* `china`: `south_china_sea`, `malacca_strait`, `hormuz_strait`, `china_eastern_coast`
* `japan`: `south_china_sea`, `malacca_strait`, `japan`, `usa_indo_pacific_base`
* `australia`: `south_china_sea`, `malacca_strait`, `hormuz_strait`, `australia`
* `india`: `malacca_strait`, `hormuz_strait`, `india_peninsula`, `REVIEW_NEEDED`
* `eu`: `giuk_gap`, `eu_western_seaboard`, `russia_europe`, `nearby_only`
* `taiwan`: `south_china_sea`, `taiwan`, `nearby_only`
* `ukraine`: none

### 3.5 Combat summary

* Power = committed unit count + valid support power.
* Higher power wins.
* Tie = standoff; both sides retreat/fail.
* Loser committed units are destroyed.
* Naval combat resolves before land combat if both occur in the same region.
* Support only works when a matching real battle exists.
* Units used for support remain in origin.
* Head-on mutual attacks resolve in transit; no territory swap.
* If a tied/failed unit must retreat but origin is occupied, it is destroyed.
* Homeland congestion fallback is enabled only by ruleset flag and only for the specific precedent-like case.

### 3.6 Amphibious combat

* One navy carries one army.
* Amphibious attack is compound: parent + navy child + army child.
* Stage 1: naval battle. Attacker must win.
* If naval battle ties or fails, army returns and is not destroyed.
* Stage 2: land battle. Attacking landed army must be strictly greater than defender to occupy.
* 1v1 landing fails.

### 3.7 Bonuses and penalties

Bonuses and penalties create `UnitAdjustment` records. They do not directly create/delete hidden units.

Resource regions:

* `asean`
* `central_asia`
* `middle_east`

Rules:

* If controlled with army present through one adjudicated round: +1 next round.
* Korean Peninsula has no bonus.
* Occupying enemy homeland: +1.
* Losing homeland: -1.
* Recapturing homeland offsets prior loss but does not generate extra bonus.
* Ukraine/landlocked countries cannot choose navy.

### 3.8 Special powers

* Hegemon threshold: total units >= 8.
* Hegemon list is computed at round start after previous bonuses/penalties.
* Taiwan chip disruption may be used if a hegemon exists at round start.
* `chip_disrupt` resolves pre-combat in the same round.
* `declare_embargo` requires sole navy control of Malacca or Hormuz.
* Embargo creates next-round `embargo_frozen` pending selection.
* Double paralysis may stack: chip + embargo = defense zero / direct destruction if attacked.
* Anti-hegemon bonus: attacking or supporting an attack on a hegemon-held region and winning creates +1 next-round adjustment.

### 3.9 Elimination and asylum

* Country is eliminated when its total army count becomes zero.
* Remaining navy can become exiled only if there is active asylum.
* Exiled navy can defend and support.
* Exiled navy cannot occupy land.
* Asylum is paired political order: request + approval, or admin approval.
* Host may revoke asylum by political order/admin ruling.

## 4. Technical stack

* Next.js 14+ or 15 App Router
* React 18+
* TypeScript strict
* Tailwind CSS
* shadcn/ui
* Zustand
* Supabase local / hosted Postgres
* Supabase Realtime
* Prisma
* Zod
* Vitest + React Testing Library
* Playwright from Phase 8
* `react-zoom-pan-pinch`
* Framer Motion from Phase 7
* howler or native Audio from Phase 7
* package manager: `pnpm`

## 5. Architecture

### 5.1 Write flow

```txt
UI
→ Zustand optimistic update
→ Next.js API route
→ Zod validation
→ rules-engine validation
→ Prisma transaction
→ Postgres
→ AuditLog / GameEvent / Snapshot
→ Supabase Realtime / API response
→ Zustand store reconciliation
```

### 5.2 Truth precedence

```txt
server-confirmed API response
> newer server realtime patch
> optimistic state
```

Use:

* `clientMutationId`
* `serverVersion`
* `updatedAt`
* `pendingMutations`

### 5.3 Realtime policy

Phase 2:

* public round phase/deadline updates
* public game events after publish
* connection status

Private country/admin realtime may be stubbed until RLS hardening. Use API refetch for private data.

Phase 8:

* RLS policies
* private realtime hardening
* direct client write prevention

### 5.4 Rules engine interface

```ts
export function adjudicateRound(input: AdjudicationInput): AdjudicationResult;
export function validateOrders(input: ValidationInput): ValidationResult[];
export function getLegalTargets(input: LegalTargetInput): LegalTargetResult;
```

Rules engine must be pure, deterministic, and IO-free.

### 5.5 Event-first adjudication

All adjudication output must produce `GameEvent[]`. Text reports, timeline, animations, and battle storyboard derive from these events.

## 6. Required folder structure

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

## 7. Data model requirements

The schema must include the original core models plus future-proof reserved models.

Required domain models:

* `Game`
* `Round`
* `Ruleset`
* `Country`
* `Region`
* `RegionEdge`
* `CountryNavalAccess`
* `RegionControl`
* `UnitStack`
* `Order`
* `StatusEffect`
* `AsylumGrant`
* `GameEvent`
* `BattleEvent`
* `BattleReport`
* `RoundHegemon`
* `RoundEffect`
* `UnitAdjustment`
* `GameStateSnapshot`
* `AuditLog`
* `Ruling`
* `GamePlayer`
* `CountryInviteCode`
* `OrderVersion`
* `ClientMutation`

Important additions:

* `Ruleset`: versioned rules configuration
* `GamePlayer`: player-country binding with hashed token
* `CountryInviteCode`: one-time country join code
* `RoundHegemon`: round-start hegemon list
* `RoundEffect`: pending cross-round effects
* `UnitAdjustment`: explicit bonus/penalty resolution
* `OrderVersion`: admin/player edit history
* `BattleReport`: published markdown report
* `ClientMutation`: optimistic mutation tracking

Use strings for domain enums in Prisma. Define TypeScript union types in `rules-engine/types.ts`.

## 8. API contract

All API responses use this shape:

```ts
type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  events?: GameEventDTO[];
  warnings?: ApiWarning[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  clientMutationId?: string;
  serverVersion?: number;
};
```

State-mutating endpoints must:

* validate token/auth
* validate payload with Zod
* run DB transaction
* write `AuditLog` when relevant
* return `clientMutationId`
* never expose `SUPABASE_SERVICE_ROLE_KEY`

## 9. UI/UX specification

### 9.1 Player mobile layout

```txt
Top status bar: round / phase / deadline / connection
Main: interactive map
Bottom: tabs
  - Orders
  - Report
  - Effects
  - Diplomacy requests
```

### 9.2 Map interactions

* pinch zoom and pan
* tap region to select origin
* highlight possible targets
* tap target creates draft order
* bottom sheet for region details
* display unit chips and controller color
* use optimistic order arrows for draft orders

Phase 2 target highlighting must be labeled as possible targets, not final legality.

### 9.3 Order UX

Must support 3-minute order submission:

* duplicate previous round
* quick defense
* editable order cards
* amphibious compound card
* paired political request alert
* optimistic submit
* rollback on failed submit

### 9.4 Admin UX

Admin console tabs:

* Overview
* Deployment
* Phase Control
* Order Review
* State Editor
* Adjudication
* Reports
* Rulings
* Snapshots

## 10. Phase roadmap and Definition of Done

### Phase 0 — Setup

DoD:

* Next.js + TypeScript strict runs
* Tailwind + shadcn installed
* Supabase local available or documented fallback
* Prisma connected
* Zustand skeleton
* Vitest sanity test
* required folders
* README with prerequisites/install/run/test

### Phase 1 — Schema + Seed

DoD:

* all schema models, including reserved future-proof models
* migration succeeds
* seed 9 countries, 23 regions, land edges, naval access, default ruleset
* tests for key edges and country settings
* `assertNever` helper and base domain enums

### Phase 2 — State + Realtime + Interactive Map

DoD:

* Zustand store with transaction-aware reconciliation
* public realtime phase/deadline updates
* join flow
* mobile player dashboard
* SVG map with pan/zoom/tap/bottom sheet
* possible target highlighting
* store tests

### Phase 3 — Order Composer

DoD:

* draft orders
* order cards and editor
* map-origin-target order creation
* lightweight validation
* duplicate last round
* quick defense
* amphibious compound UI and data
* paired political order flow
* optimistic submit
* API response shape

### Phase 4 — Admin Console

DoD:

* admin login/simple gate
* game creation and invite codes
* deployment editor
* phase control
* order review and edit
* manual state editor
* ruling panel
* battle report publishing
* snapshots and latest-round rollback
* Demo v0.1 playable manually

### Phase 5 — Rules Engine v1

DoD:

* pure adjudication engine
* validate orders
* operation graph
* land/naval/amphibious/support resolution
* retreats, occupation, losses
* GameEvent and BattleEvent output
* transaction wrapper API
* 16 fixture tests
* Demo v0.2 playable with common battle automation

### Phase 6 — Special Rules v1

DoD:

* RoundHegemon
* chip disruption
* embargo + effect selection
* resource and homeland effects
* anti-hegemon bonus
* elimination and asylum
* exiled navy validation
* Demo v0.3 with special rules

### Phase 7 — Storyboard + UX polish

DoD:

* event storyboard player
* map animations
* controls: play/pause/step/speed
* design tokens
* haptics/audio
* loading skeletons
* safe-area/tap-target mobile polish

### Phase 8 — Production + red-team

DoD:

* hosted Supabase
* Vercel deployment
* PWA manifest/icons/service worker
* admin auth hardened
* rate limiting/CSRF
* RLS policies
* Playwright E2E
* red-team findings and P0/P1 fixes
* deployment docs
