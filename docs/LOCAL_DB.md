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
