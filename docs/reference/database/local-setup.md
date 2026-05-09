---
title: Local Database Setup
---

# Local Database Setup (Community Edition)

This guide sets up the **LenserFight Community Edition** PostgreSQL/Supabase stack for local development. The OSS database exposes only public schemas (`lensers`, `lenses`, `content`, `media`, `agents`, `ai`, `execution`, `tenancy`, etc.). It does **not** include private cloud schemas such as `battles`, `billing`, `xp`, `benchmark`, or `authz`.

For the **full LenserFight Cloud / platform** database (all schemas and private seeds, including `battles`, `billing`, `xp`, `benchmark`, `authz`), contact the maintainers — that schema is part of the private Chainabit backend and is not publicly available.

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
cd lenserfight
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
# Regenerate seed.sql + seed-data.sql from the two manifests
pnpm supabase:combine-seeds

# Reset — runs all migrations then applies seed.sql (runs combine first)
pnpm supabase:db:reset
```

This runs every migration in `supabase/migrations/` in order, then `supabase/seed.sql`. Run `pnpm supabase:combine-seeds` whenever you add or rename a file under `supabase/seeds/` and update either manifest.

### Seed split (Phase T5)

Seeds are split into two files so a cold reset stays fast:

| File | Manifest | Auto-applied? | Contents |
|------|----------|---------------|----------|
| `supabase/seed.sql` | `seed.manifest` | Yes (by `db reset`) | Schema-required lookups, AI catalog, system policies, default flags. Designed to run cold in well under 30 seconds. |
| `supabase/seed-data.sql` | `seed-data.manifest` | No (opt-in) | Demo auth users, sample profiles, lens / workflow templates, geo cities, sample battles, analytics rollups, benchmark fixtures. |

Apply demo data after a reset when you need it:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f supabase/seed-data.sql
```

### Guard: private schemas must not appear in OSS migrations

From the repo root:

```bash
pnpm check:oss-migration
```

## Verify the Setup (OSS schemas)

Confirm core OSS schemas exist (adjust table names if your migration differs):

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\dn" \
  -c "\dt lenses.*" \
  -c "\dt content.*"
```

You should see namespaces such as `lenses`, `lensers`, `content`, and related tables. Do **not** expect `xp`, `battles`, `benchmark`, or `billing` in Community Edition.

## Access Studio

Open [http://127.0.0.1:54323](http://127.0.0.1:54323) in your browser. Studio provides a GUI for browsing tables and inspecting RLS policies for schemas exposed to PostgREST.

## Seed Data

Seeds live in `supabase/seeds/` and are combined into `supabase/seed.sql` before a reset. Community Edition seeds exclude private cloud-only fixtures.

> `supabase/seed.sql` is **auto-generated**. Do not edit it directly. Edit `supabase/seeds/*.sql` and `supabase/seed.manifest`, then run `pnpm supabase:combine-seeds`.

### How to use

```bash
pnpm supabase:combine-seeds && pnpm supabase:db:reset
```

Reset duration depends on which seed files are included (scale data takes longer).

### Login Credentials

Use the same values as in [libs/utils/env/src/lib/runtimeConfig.ts](https://github.com/connectlens/lenserfight-web/blob/development/libs/utils/env/src/lib/runtimeConfig.ts) (`LOCAL_SEED_CREDENTIALS`) and your generated `seed.sql` (Alice is the primary dev user).

Example (verify against your current `02_auth_users.sql` / seed):

| User | Email | Password |
|------|-------|----------|
| Alice | `alice@lenserfight.local` | See `LOCAL_SEED_CREDENTIALS.password` in `runtimeConfig.ts` |

Use these with the Supabase auth endpoint:

```bash
curl -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@lenserfight.local",
    "password": "<password from LOCAL_SEED_CREDENTIALS>"
  }'
```

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

### PostgREST: `schema "lenses" does not exist` or 503 after `supabase start`

The DB volume may have been restored **before** migrations created app schemas. Wipe local volumes and reset:

```bash
pnpm supabase:local:recover
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

---

## Alternative: No-Supabase local mode

If you want to try LenserFight without Docker or a database, use the local file storage adapter. Data is stored in `~/.lenserfight/` on your machine.

### What works without Supabase

| Feature | Local mode |
|---------|-----------|
| Lens authoring and editing | ✅ |
| Local lens execution (BYOK) | ✅ |
| CLI commands | ✅ |
| Workflow authoring | ✅ |
| Auth / sessions | — requires Supabase |
| Multi-user access | — requires Supabase |
| RLS-enforced data isolation | — requires Supabase |

### Quick setup

```bash
# Create local directories
mkdir -p ~/.lenserfight/lenses ~/.lenserfight/media

# Configure the adapter
echo '{ "defaultAdapterId": "local" }' > ~/.lenserfight/config.json

# Set data source
echo 'VITE_DATA_SOURCE=file' >> .env.local

# Start the app
pnpm nx run web:serve
```

### Local directory layout

```
~/.lenserfight/
├── config.json          # Adapter config and auth tokens
├── lenses/              # One JSON file per lens
├── lensers/             # Lenser profile data
├── media/               # File uploads by bucket
│   └── objects.json     # Metadata index
├── workflows/
└── agents/
```

See [Storage Adapters Reference](/reference/platform-api/storage-adapters) for the full interface spec and adapter selection details.
See [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) for the complete step-by-step walkthrough.

---

## Related Documentation

- [RLS Policy Reference](./rls-reference.md) — row-level security policies per schema and table
- [RPC Function Reference](./rpc-reference.md) — available RPC endpoints with auth requirements and examples
- [Storage Adapters](/reference/platform-api/storage-adapters) — pluggable storage backends
- [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) — start without Docker
