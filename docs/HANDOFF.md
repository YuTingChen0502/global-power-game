# Global Power Game PWA — Handoff Summary

Use this document to brief a new ChatGPT control-center chat or a coding agent before implementation.

## 1. Project identity

We are building a mobile-first PWA version of the classroom board game 「全球權力博弈」.

The app is not merely a visual board. It is a complete game-management and adjudication system:

* player join flow
* mobile strategic map
* structured secret orders
* admin phase control
* admin review and override
* rules-engine adjudication
* battle report publishing
* audit log, snapshots, and rollback

Direction:

> Path A': functional-first, but future-proofed for smooth UX and complete rules.

## 2. Preferred operating model

The control-center chat handles:

* architecture decisions
* spec maintenance
* Codex prompt updates
* phase review
* task handoff
* ambiguous rule interpretation

Codex handles:

* repo implementation
* tests
* commits
* phase completion report

Preferred implementer:

* Codex GPT-5.5 very-high reasoning as primary implementation agent.

Claude/Gemini can be used as:

* critique reviewer
* UI concept reviewer
* alternative design reviewer

They should not become the main source of truth unless explicitly chosen.

## 3. Core architecture

* Next.js App Router + TypeScript strict
* Tailwind CSS + shadcn/ui
* Zustand central store
* Supabase Postgres + Supabase Realtime
* Prisma ORM
* Zod validation
* rules-engine as pure TypeScript functions
* SVG strategic map + `react-zoom-pan-pinch`
* GameEvent event sequence from day one
* Admin override, AuditLog, Snapshot, and Rollback are first-class

## 4. Core rule facts

### Countries

* USA: 3 army / 4 navy
* China: 4 army / 2 navy
* Russia: 3 army / 1 navy
* EU: 2 army / 2 navy
* India: 2 army / 2 navy
* Japan: 1 army / 3 navy
* Ukraine: 2 army / 0 navy
* Taiwan: 1 army / 1 navy
* Australia: 1 army / 1 navy

### Regions

Use 23 core regions:

* 15 homeland/country regions
* 4 land strategic regions
* 4 sea/strait regions

Important map constraints:

* China west must not border ASEAN.
* India north borders ASEAN through Myanmar special bridge.
* Ukraine/EU east connect to Middle East through Turkey special bridge.
* Central Asia connects to Middle East through Iran.
* Korean Peninsula has no resource bonus.

### Combat

* Land combat: majority wins, tie standoff, loser destroyed.
* Naval combat resolves before land combat.
* Support only works if actual matching combat exists.
* Head-on mutual attacks resolve in transit; no automatic territory swap.
* Amphibious attack is two-stage: naval battle first, then land landing.
* Amphibious landing needs strict land superiority; 1v1 landing fails.

### Special rules

* Hegemon threshold: total units >= 8.
* Taiwan chip disruption: allowed if hegemon exists at round start; same-round pre-combat effect.
* Embargo: Malacca/Hormuz controller can create next-round frozen pending selection.
* Resource bonus: ASEAN, Central Asia, Middle East; next round +1 after holding.
* Anti-hegemon bonus: winning attack/support against hegemon-held region creates next-round +1.
* Elimination: country eliminated when army total = 0.
* Remaining navy can continue only through asylum/exile.

## 5. Important spec corrections already decided

1. Add missing models:

   * `Ruleset`
   * `GamePlayer`
   * `CountryInviteCode`
   * `RoundHegemon`
   * `RoundEffect`
   * `UnitAdjustment`
   * `OrderVersion`
   * `BattleReport`
   * `ClientMutation`
2. Use public realtime in early phases; private country/admin data goes through API until RLS hardening.
3. Use `clientMutationId` + `serverVersion`/`updatedAt` for optimistic reconciliation.
4. Use `getPossibleTargets` in Phase 2, not final validation.
5. Support orders must reference concrete attack/defense intent.
6. Amphibious orders are parent + two children.
7. Chip is same-round; embargo is next-round.
8. Bonuses/penalties create `UnitAdjustment` records.
9. Naval access must be explicitly seeded and review-needed cases flagged.
10. MVP rollback only supports latest current-round snapshot.

## 6. Files that should exist before Codex starts

Minimum recommended files:

```txt
README.md
docs/PRD.md
docs/RULES.md
docs/DECISIONS.md
docs/HANDOFF.md
prompts/CODEX_PHASES.md
```

Optional but useful early stubs:

```txt
docs/API.md
docs/RULINGS.md
docs/PLAYTEST.md
.env.example
```

## 7. Recommended next action

Create the repo and add the initial documentation files.

Suggested repo name:

```txt
IR_global_power_game
```

Suggested initial folder creation:

```bash
mkdir IR_global_power_game
cd IR_global_power_game
git init
mkdir docs prompts
```

Add:

```txt
README.md
docs/PRD.md
docs/RULES.md
docs/DECISIONS.md
docs/HANDOFF.md
prompts/CODEX_PHASES.md
```

Then create the first implementation branch:

```bash
git checkout -b codex/phase-0-setup
```

Give Codex:

```txt
prompts/CODEX_PHASES.md → General Codex operating rules + Phase 0 Prompt — Setup
```

Expected first commit:

```txt
chore: initialize project architecture
```

## 8. Phase review checklist

After each Codex phase, verify:

* Does it match `docs/PRD.md`?
* Does it violate any `docs/RULES.md` rule?
* Did it update `docs/DECISIONS.md` if it made architectural decisions?
* Did it keep scope within the current phase?
* Did it run tests/checks?
* Did it avoid exposing service role keys?
* Did it avoid private realtime before RLS hardening?
* Did admin writes create audit logs?
* Did it commit only valid repo state?
* Did it report changed files, commands, test results, DoD, unresolved decisions, git status, and commit hash?

## 9. First message to Codex

```text
You are working on the Global Power Game PWA repo.

Read these first:
- README.md
- docs/PRD.md
- docs/RULES.md
- docs/DECISIONS.md
- docs/HANDOFF.md
- prompts/CODEX_PHASES.md

Then execute:
- General Codex operating rules
- Phase 0 Prompt — Setup

Keep changes within Phase 0 scope.
Do not add domain Prisma models yet.
Do not implement game logic yet.
Do not expose any service role key to the client.

At the end, run checks and provide:
- changed files
- commands run
- tests/checks result
- DoD checklist
- unresolved decisions
- git status
- commit hash if committed
```
