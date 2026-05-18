---
title: lf reset
description: Reset all local settings and the local database. Requires typed confirmation or --force.
---

<!-- AUTO-GEN-START -->

# `lf reset`

Reset all local settings and the local database. Requires typed confirmation or --force.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--force` | boolean | no | Skip interactive confirmation (required in CI / non-interactive shells) |
| `--skip-db` | boolean | no | Skip database reset, only clear config files |

**Confirmation:** In an interactive terminal you must type `RESET` exactly when prompted. Pass `--force` to bypass this in CI or scripts — the command will print a warning and proceed immediately. If neither confirmation method is supplied, the command exits 1 with an impact summary showing exactly what will be deleted.

**What is deleted:**
- `.lenserfight.json` — project config
- `~/.lenserfight/lenserfight.json` — auth tokens and API keys
- Local Supabase database (via `supabase db reset`) — unless `--skip-db`

Re-initialise after a reset with `lf init`.

<!-- AUTO-GEN-END -->
