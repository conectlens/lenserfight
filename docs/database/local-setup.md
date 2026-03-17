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

To drop the database, recreate it, run all migrations, and apply seed data:

```bash
# Regenerate seed.sql from individual files in supabase/seeds/
cd supabase && bash combine-seeds.sh

# Reset — runs all migrations then applies seed.sql
pnpm supabase db reset
```

This is the recommended way to get a clean local database. It executes every migration file in `supabase/migrations/` in order and then runs `supabase/seed.sql`. Always run `combine-seeds.sh` first if any seed file changed.

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

Seeds are managed as individual numbered files in `supabase/seeds/` and combined into `supabase/seed.sql` before a reset.

### Seed files

| Range | Purpose |
|-------|---------|
| `01–06` | Core dev fixtures: languages, auth users, lenser profiles, AI models, battles, analytics |
| `10–21` | Scale data: ~10k users, threads, prompts, replies, reactions, XP — used for load testing and index benchmarking |
| `30` | Benchmark & recommendation validation — runs automatically after scale data is loaded |

> `supabase/seed.sql` is **auto-generated**. Do not edit it directly. Edit files in `supabase/seeds/` instead.

### How to use

**Generate `seed.sql` and reset the database (standard dev setup):**

```bash
# 1. Combine individual seed files into seed.sql
cd supabase && bash combine-seeds.sh

# 2. Reset the database — applies all migrations then runs seed.sql
pnpm supabase db reset
```

The reset takes **2–5 minutes** for the core fixtures (files `01–06`) and **25–30 minutes** when scale data (`10–30`) is included.

**Benchmark results** are printed at the end of the reset output, produced by `30_benchmark.sql`. They show query latency for the recommendation and feed RPCs under scale load.

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

### Adding or modifying seed data

1. Edit or create a file in `supabase/seeds/` following the naming convention `NN_description.sql`.
2. Run `cd supabase && bash combine-seeds.sh` to regenerate `seed.sql`.
3. Run `pnpm supabase db reset` to apply the updated seed to your local database.

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
