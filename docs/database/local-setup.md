---
title: Local Database Setup
---

# Local Database Setup

This guide walks through setting up the LenserFight PostgreSQL/Supabase backend for local development.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | Required for the monorepo tooling |
| Docker Desktop | Latest | Must be **running** before starting Supabase |
| Supabase CLI | Latest | Install globally via `pnpm add -g supabase` |
| pnpm | 8+ | Package manager used by the monorepo |

## Clone and Start

```bash
git clone <repo-url>
cd lenserfight-web
pnpm install
pnpm supabase start
```

The first `supabase start` pulls Docker images and may take a few minutes. Subsequent starts are fast.

## Default Ports

| Service | Port | URL |
|---------|------|-----|
| API (PostgREST) | 54321 | `http://127.0.0.1:54321` |
| Database (PostgreSQL) | 54322 | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (Dashboard) | 54323 | `http://127.0.0.1:54323` |
| Inbucket (Email) | 54324 | `http://127.0.0.1:54324` |

## Run Migrations

To drop the database, recreate it, run all migrations, and apply seed data in one step:

```bash
pnpm supabase db reset
```

This is the recommended way to get a clean local database. It executes every migration file in `supabase/migrations/` in order and then runs `supabase/seed.sql`.

## Verify the Setup

Connect to the local database and confirm the battles schema and XP rules are in place:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\dt battles.*" \
  -c "SELECT action_key, base_xp FROM xp.rules WHERE action_key LIKE 'battle%';"
```

You should see the 7 battles tables (`rubrics`, `rubric_criteria`, `battles`, `contenders`, `submissions`, `votes`, `scorecards`) and the battle-related XP rules.

## Access Studio

Open [http://127.0.0.1:54323](http://127.0.0.1:54323) in your browser. Studio provides a GUI for browsing tables, running SQL, and inspecting RLS policies across all schemas.

## Seed Data

The seed file (`supabase/seed.sql`) creates a ready-to-use local environment:

| Data | Details |
|------|---------|
| Test users | 3 users: alice, bob, carol |
| AI models | Pre-configured AI model entries |
| Battles | 2 sample battles with rubrics |
| Rubrics | Default rubrics with criteria |

### Login Credentials

| User | Email | Password |
|------|-------|----------|
| Alice | `alice@lenserfight.local` | `password123` |
| Bob | `bob@lenserfight.local` | `password123` |
| Carol | `carol@lenserfight.local` | `password123` |

Use these credentials with the Supabase auth endpoint:

```bash
curl -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@lenserfight.local",
    "password": "password123"
  }'
```

The response includes an `access_token` (JWT) to use as `Authorization: Bearer <token>` in subsequent API calls.

## Common Issues

### Docker not running

```
Error: Cannot connect to the Docker daemon
```

Start Docker Desktop and wait for it to be fully ready before running `supabase start`.

### Port conflict

```
Error: port 54321 already in use
```

Another process is using the default ports. Check `supabase/config.toml` to change port assignments, or stop the conflicting process:

```bash
lsof -i :54321
```

### Migration failure

If `supabase db reset` fails mid-migration, check the output for the specific SQL error. Common causes:

- **Syntax error in migration**: fix the SQL in the failing migration file under `supabase/migrations/`.
- **Dependency order**: a migration references a schema or table created in a later migration.
- **Stale Docker state**: try `pnpm supabase stop && pnpm supabase start` and then `pnpm supabase db reset` again.

### Supabase CLI not found

If `supabase` is not recognized, ensure it is installed globally:

```bash
pnpm add -g supabase
```

Or use the local project binary:

```bash
pnpm supabase <command>
```

## Related Documentation

- [RLS Policy Reference](./rls-reference.md) -- row-level security policies per schema and table
- [RPC Function Reference](./rpc-reference.md) -- available RPC endpoints with auth requirements and examples
