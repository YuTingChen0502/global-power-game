# Global Power Game — Rules Implementation Spec

Version: 0.1-engineering-draft
Purpose: implementation-facing rules document for seed data, order validation, adjudication fixtures, and admin rulings.

This file should be treated as the canonical engineering form of the game rules until a more complete source conversion is available. When the teacher/admin makes a current-round ruling, that ruling overrides this file and should be recorded in `docs/RULINGS.md`.

## 1. Rule authority

Conflict precedence:

1. Current user instruction
2. Teacher/admin current-round ruling
3. Later-round formal precedents
4. This `docs/RULES.md`
5. `docs/PRD.md`
6. Automatic rules-engine behavior

The engine must never silently override an admin ruling. If a case is ambiguous, the engine should return a warning or require admin review.

## 2. Core game entities

### 2.1 Countries

| id          | Chinese name | tier | initial army | initial navy | special note        |
| ----------- | ------------ | ---: | -----------: | -----------: | ------------------- |
| `usa`       | 美國           |    1 |            3 |            4 | global naval reach  |
| `china`     | 中國           |    1 |            4 |            2 | land expansion      |
| `russia`    | 俄羅斯          |    2 |            3 |            1 | buffer seeker       |
| `eu`        | 歐盟           |    2 |            2 |            2 | collective security |
| `india`     | 印度           |    2 |            2 |            2 | non-aligned         |
| `japan`     | 日本           |    2 |            1 |            3 | maritime barrier    |
| `ukraine`   | 烏克蘭          |    3 |            2 |            0 | landlocked          |
| `taiwan`    | 台灣           |    3 |            1 |            1 | chip disruption     |
| `australia` | 澳洲           |    3 |            1 |            1 | logistics base      |

### 2.2 Unit types

Allowed unit types:

* `army`
* `navy`

A `UnitStack` represents one or more same-type units belonging to one country in one region.

### 2.3 Region kinds

Allowed `Region.kind` values:

* `land`
* `coastal_land`
* `resource_land`
* `buffer_land`
* `sea_zone`
* `strait`

Engine behavior should distinguish:

* land-like regions: `land`, `coastal_land`, `resource_land`, `buffer_land`
* naval-like regions: `sea_zone`, `strait`
* coastal regions: land-like regions that can be reached by some navy, if explicitly seeded in `CountryNavalAccess`

## 3. Region list

### 3.1 Homeland / country regions

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

### 3.2 Land strategic regions

16. `asean`
17. `central_asia`
18. `middle_east`
19. `korean_peninsula`

### 3.3 Sea/strait regions

20. `south_china_sea`
21. `malacca_strait`
22. `hormuz_strait`
23. `giuk_gap`

## 4. Land adjacency

Seed exactly the following edges. Unless explicitly stated otherwise, land edges are bidirectional.

### 4.1 Normal land edges

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
* `china_eastern_coast` ↔ `asean`
* `korean_peninsula` ↔ `russia_far_east`
* `russia_europe` ↔ `ukraine`
* `ukraine` ↔ `eu_eastern_flank`
* `eu_eastern_flank` ↔ `eu_western_seaboard`
* `russia_europe` ↔ `eu_eastern_flank`

### 4.2 Special land bridges

These are legal land movement edges but should carry edge metadata.

* `india_northern_border` ↔ `asean`, `edgeType = special_land_bridge`, note = `經緬甸`
* `eu_eastern_flank` ↔ `middle_east`, `edgeType = special_land_bridge`, note = `經土耳其`
* `ukraine` ↔ `middle_east`, `edgeType = special_land_bridge`, note = `經土耳其陸橋`
* `central_asia` ↔ `middle_east`, `edgeType = special_land_bridge`, note = `經伊朗`

### 4.3 Explicit non-edge

Do not create:

* `china_western_frontier` ↔ `asean`

### 4.4 Admin-reviewed precedent edge

Do not treat `russia_europe` ↔ `middle_east` as a normal land edge. If a playtest or teacher precedent allows it, model it as an admin-reviewed amphibious/naval-adjacent special case before making it generally valid.

## 5. Naval access

### 5.1 General policy

Naval access must be explicit. Do not infer naval reach from geography unless it is seeded in `CountryNavalAccess`.

Uncertain access must be seeded with `note = REVIEW_NEEDED` rather than omitted silently.

### 5.2 Baseline naval access

* `usa`: all sea/strait regions and all coastal regions
* `russia`: `giuk_gap`, `south_china_sea`, `russia_europe`, `russia_far_east`, and relevant adjacent coastal regions
* `china`: `south_china_sea`, `malacca_strait`, `hormuz_strait`, `china_eastern_coast`
* `japan`: `south_china_sea`, `malacca_strait`, `japan`, `usa_indo_pacific_base`
* `australia`: `south_china_sea`, `malacca_strait`, `hormuz_strait`, `australia`
* `india`: `malacca_strait`, `hormuz_strait`, `india_peninsula`, `REVIEW_NEEDED`
* `eu`: `giuk_gap`, `eu_western_seaboard`, `russia_europe`, `nearby_only`
* `taiwan`: `south_china_sea`, `taiwan`, `nearby_only`
* `ukraine`: none

### 5.3 Navy movement and attack

A navy may move/attack only if the target region exists in that country's naval access list and the move is otherwise valid.

A country with no naval access cannot create navy moves unless under explicit asylum/exile rules and admin-approved precedent.

## 6. Orders

### 6.1 Order lifecycle

Order statuses:

* `draft`
* `submitted`
* `submitted_pending`
* `valid`
* `invalid`
* `resolved`
* `cancelled`

Player flow:

1. create draft orders
2. run lightweight client/server validation
3. submit orders
4. admin review or automatic validation
5. adjudication
6. published report

### 6.2 Action types

Core military actions:

* `move`
* `attack`
* `defend`
* `support_attack`
* `support_defend`
* `amphibious_attack`

Special/political actions:

* `chip_disrupt`
* `declare_embargo`
* `request_asylum`
* `approve_asylum`
* `reject_asylum`
* `revoke_asylum`
* `effect_selection`

### 6.3 Order limit

Maximum countable orders per country per round: 8.

Countable:

* ordinary military orders
* amphibious parent order
* political/special orders if ruleset config says they count

Non-counting:

* amphibious child orders
* implicit defense markers if the UI uses them
* system-generated effect selections unless ruleset config says otherwise

### 6.4 Support order semantics

Support must support a concrete attack or defense intent. It must not merely point to a target region.

Preferred fields:

* `supportOrderId` when supporting a submitted/draft order

Fallback fields:

* `supportCountryId`
* `supportActionType`
* `supportTargetRegionId`

A support order contributes only if there is actual matching combat. Support without matching battle is ignored, not converted into independent attack power.

### 6.5 Amphibious compound order

A valid amphibious operation consists of:

* parent order: `actionType = amphibious_attack`, counts toward order limit
* child navy order: `compoundRole = naval_carrier`, does not count
* child army order: `compoundRole = land_payload`, does not count

The children must be linked to the parent by `parentOrderId`.

## 7. Combat resolution

### 7.1 Combat power

Combat power:

```txt
committed unit count + valid support power
```

Support power is counted only if the support matches a real battle.

### 7.2 Land combat

* Higher power wins.
* Tie = standoff.
* Losing committed units are destroyed.
* Winner occupies the target if the target is land-like and occupation is legal.
* 1v1 ordinary land attack results in standoff unless support or other rules alter power.

### 7.3 Naval combat

* Naval combat resolves before land combat if both occur in a region.
* Higher power wins.
* Tie = standoff.
* Losing committed navy units are destroyed.
* Naval win may enable amphibious landing.

### 7.4 Head-on mutual attacks

If two opposing forces attack each other's origin in the same round, resolve as transit conflict.

* There is no automatic territory swap.
* If power ties, both fail/retreat.
* If one side wins, apply losses and occupation only if target legality permits.

### 7.5 Retreat and origin occupation

If a failed/tied unit must retreat but its origin is occupied or no longer available, it is destroyed.

### 7.6 Homeland congestion fallback

This is disabled by default. It may be enabled only by ruleset flag and only for specific precedent-like cases.

## 8. Amphibious resolution

Stage 1: naval battle.

* Attacking navy must win.
* If naval battle ties or fails, the carried army returns and is not destroyed.

Stage 2: land battle.

* Land payload attacks target land region.
* Attacking landed army must be strictly greater than defender to occupy.
* 1v1 landing fails.

Result output must explain both stages through `GameEvent[]` and `BattleEvent[]`.

## 9. Bonuses and penalties

Bonuses and penalties must create `UnitAdjustment` records. Do not silently mutate unit totals.

### 9.1 Resource bonus

Resource regions:

* `asean`
* `central_asia`
* `middle_east`

If a country controls a resource region with army present through one adjudicated round, it creates a next-round `UnitAdjustment`:

```txt
type = add_unit
amount = 1
reason = resource_control
```

Korean Peninsula does not grant a bonus.

### 9.2 Homeland gain/loss

* Occupying enemy homeland creates +1 next-round adjustment.
* Losing homeland creates -1 next-round adjustment.
* Recapturing homeland offsets the prior loss but does not generate extra bonus unless a later teacher ruling says otherwise.

### 9.3 Landlocked restriction

Landlocked countries cannot choose navy as a bonus unit.

Current landlocked country:

* `ukraine`

## 10. Special powers and status effects

### 10.1 Hegemon

A country is a hegemon if total units >= 8 at round start.

Round-start hegemon list is computed after prior adjustments and stored in `RoundHegemon`.

### 10.2 Taiwan chip disruption

Requirement:

* actor country = `taiwan`
* a hegemon exists at round start

Timing:

* same-round pre-combat

Effect:

* target navy receives `chip_disrupted`
* defense may become zero
* if combined with embargo frozen and attacked, double paralysis/direct destruction may apply according to ruleset config

### 10.3 Embargo

Requirement:

* actor has sole navy control of `malacca_strait` or `hormuz_strait`

Timing:

* declaration creates next-round pending effect

Effect:

* creates `embargo_frozen`
* target country must select target stack in effect-selection phase
* frozen stack cannot act

### 10.4 Double paralysis

If a unit is already affected by `embargo_frozen` and is also hit by same-round `chip_disrupted`, it may resolve as defense zero or direct destruction if attacked.

The exact behavior should be ruleset-configurable and visible in battle report.

### 10.5 Anti-hegemon bonus

If a country attacks or supports an attack on a hegemon-held region and wins, create next-round +1 `UnitAdjustment`:

```txt
type = add_unit
reason = anti_hegemon_bonus
```

## 11. Elimination and asylum

### 11.1 Elimination

A country is eliminated when total army count becomes zero.

### 11.2 Exiled navy

If a country has no army but has remaining navy, the navy becomes active only if covered by active asylum.

Exiled navy can:

* defend
* support defense
* support attack

Exiled navy cannot:

* occupy land
* create homeland/resource control

### 11.3 Asylum

Asylum is a paired political process:

1. `request_asylum`
2. target country responds with `approve_asylum` or `reject_asylum`
3. admin may approve manually if needed

Host may revoke asylum by political order or admin ruling.

## 12. Event output requirements

All adjudication results must output deterministic `GameEvent[]`.

Text reports, report timeline, and animation storyboard derive from events.

Each battle event should include:

* round id
* involved countries
* region id
* order ids
* committed unit counts
* support counts
* final power calculation
* winner/loser/standoff
* losses
* occupation changes
* rule/ruling basis

## 13. Required fixture cases

Rules-engine Phase 5 must include at least these fixtures:

1. `china_western_frontier` → `asean` invalid
2. `india_northern_border` → `asean` valid
3. `ukraine` → `middle_east` valid
4. land army cross-sea without navy invalid
5. USA amphibious global valid
6. amphibious naval tie fails, army survives
7. empty territory occupation
8. support without battle ignored
9. head-on tie both retreat
10. origin occupied after standoff destroys retreating units
11. homeland congestion fallback
12. 1v1 land standoff
13. majority destroys minority
14. self-support behavior documented and tested
15. naval before land
16. amphibious compound parent/child structure

Phase 6 must add fixtures for:

1. hegemon detection
2. Taiwan chip happy path
3. embargo declaration and selection
4. double paralysis
5. anti-hegemon bonus
6. ASEAN held bonus
7. Ukraine/landlocked bonus only army
8. homeland loss/gain/recapture
9. eliminated country + asylum + exiled navy support
10. effect selection timeout/admin selection
