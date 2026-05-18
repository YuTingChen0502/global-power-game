# Local Database Setup

Phase 0 supports two local database paths.

## Preferred: Supabase CLI

Use this path when Supabase CLI is installed:

```bash
supabase init
supabase start
```

Then copy the local Supabase API URL, anon key, and Postgres connection string into `.env.local`.

This is the preferred path because later phases need Supabase Realtime.

## Fallback: Docker Postgres

Use Docker Postgres when Supabase CLI is unavailable:

```bash
docker run --name global-power-game-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=global_power_game \
  -p 5432:5432 \
  -d postgres:16
```

Use:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_power_game"
```

This fallback is enough for Prisma validation, migrations, and seed work. Supabase Realtime should be treated as unverified until Supabase local or hosted Supabase is available.

## Fallback: Ordinary Local Postgres

Create the database:

```bash
createdb global_power_game
```

Then set `DATABASE_URL` to match your local credentials.

## Phase 1 Migration And Seed

After a local Postgres-compatible database is running and `DATABASE_URL` is present in `.env.local`, run:

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm test
```

Phase 1 seeds the canonical 9 countries, 23 core regions, land/special-bridge edges, explicit naval access rows, and the default ruleset. If you need a clean disposable database, `pnpm db:reset` will drop local data, reapply migrations, and rerun seed.

## Phase 2 Test Game And Invite Codes

Phase 1 reference seed data does not create a playable game. For local Phase 2 join-flow and map testing, run:

```bash
pnpm db:test-game
```

The helper creates or refreshes a local test game:

```txt
game code: GPG-TEST
invite codes:
usa: USA-TEST
china: CHINA-TEST
russia: RUSSIA-TEST
eu: EU-TEST
india: INDIA-TEST
japan: JAPAN-TEST
ukraine: UKRAINE-TEST
taiwan: TAIWAN-TEST
australia: AUSTRALIA-TEST
```

Invite codes are stored hashed in `CountryInviteCode`; the raw local codes are only printed by the helper. The helper is for disposable local development and is not production auth.

If you prefer manual setup, create:

- one `Game` using the default ruleset
- one current `Round`
- `RegionControl` rows for that round
- public `UnitStack` rows for map chips
- one hashed `CountryInviteCode` per country using SHA-256 of the normalized invite code

Supabase Realtime remains fully verifiable only with Supabase local or hosted Supabase. Docker Postgres supports Prisma migration, seed, join-flow API testing, and public-state hydration, but it does not deliver Supabase Realtime websocket events.

## Phase 3 Order Testing

With the local test game created, use the China invite for a quick player flow:

```txt
game code: GPG-TEST
invite code: CHINA-TEST
```

Manual smoke path:

1. Run `pnpm dev`.
2. Open `/join`, join the test game, then open `/player`.
3. Tap an owned origin and a possible target to create a draft move.
4. Edit the action in the Orders tab and submit.
5. Use Duplicate after creating a prior-round submitted order in local data.
6. Use Defend to create explicit non-counting defense drafts.

Phase 3 intentionally does not adjudicate battles. Order submit persists structured rows only; amphibious submit creates one countable parent row plus two non-counting child rows, and political asylum responses create linked response orders without Phase 6 exile automation.
