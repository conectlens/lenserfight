---
title: lf db
description: Database management commands.
---

<!-- AUTO-GEN-START -->

# `lf db`

Database management commands.

## `lf db dev`

Start local Supabase stack, run migrations, and seed the database.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--reset` | boolean | no | Run db reset instead of start (drops and recreates) |
| `--echo` | boolean | no | Set USE_ECHO_PROVIDER=true — no real API calls (local testing) |

## `lf db seed`

Run seed.sql against local database. Requires --force to confirm the database reset.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--file` | string | no | Path to seed SQL file |
| `--force` | boolean | no | Skip confirmation warning and proceed with database reset |

## `lf db reset`

Reset all local settings and the local database. Requires typed confirmation or --force.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--force` | boolean | no | Skip interactive confirmation (required in CI / non-interactive shells) |
| `--skip-db` | boolean | no | Skip database reset, only clear config files |

<!-- AUTO-GEN-END -->
