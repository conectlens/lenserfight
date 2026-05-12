---
title: "lf battle dev-cycle"
description: "One-command end-to-end battle lifecycle against a local Supabase. Boots create → enroll → submit → vote in a single shot for fast contributor onboarding."
---

# `lf battle dev-cycle`

The fastest way to prove your local environment can run a full battle. Useful
when you've cloned the repo for the first time and want a green path to
"battles work" before you start writing code.

## Prerequisites

1. `supabase start` is running locally (`pnpm supabase:db:reset` once).
2. `SUPABASE_URL=http://127.0.0.1:54321` is in your env.
3. `SUPABASE_SERVICE_ROLE_KEY` is the local service-role key from
   `supabase status`.

`dev-cycle` refuses to run when `SUPABASE_URL` does not match `127.0.0.1` or
`localhost`. Pass `--dry-run` to inspect the planned steps without making any
RPC calls.

## Plan-then-run

```
$ lf battle dev-cycle --dry-run
┌──────────────────────────────────────────────────────────────────┐
│ dev-cycle (dry-run) — no RPCs executed:                          │
│   1. create battle from template "e2e-default"                   │
│   2. enroll 2 contender(s)                                       │
│   3. submit text entry per contender (body="<auto-lorem>")       │
│   4. cast cross-votes targeting "A"                              │
└──────────────────────────────────────────────────────────────────┘
```

## Real run

```
$ lf battle dev-cycle
[e2e-battle] (1/4) supabase start
[e2e-battle] (2/4) load e2e seed
[e2e-battle] (3/4) pgTAP lifecycle suite
[e2e-battle] (4/4) Vitest + CLI integration specs
[e2e-battle] OK
✓ dev-cycle complete (delegated to scripts/e2e-battle.sh).
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--template` | string | `e2e-default` | Template slug or UUID to draw the prompt from |
| `--contenders` | number | `2` | How many contenders to enroll |
| `--submit-text` | string | auto-lorem | Submission body text |
| `--vote-for` | string | `A` | Contender to cross-vote for |
| `--dry-run` | bool | false | Plan only — no RPCs called |
| `--json` | bool | false | Emit JSON instead of human output |

## Errors

| Symptom | Cause | Fix |
|---|---|---|
| `refusing to drive dev-cycle against non-local Supabase` | `SUPABASE_URL` does not look local | export `SUPABASE_URL=http://127.0.0.1:54321` |
| `e2e-battle.sh failed` | Supabase not started | `supabase start` then re-run |
| pgTAP test 51_battle_lifecycle_e2e fails | Stale seed data — drop & reseed | `pnpm supabase:db:reset` |

## What gets exercised

- `fn_battles_create_from_template`
- `fn_submit_vote` (twice, distinct voters)
- `fn_battles_finalize` → `winner_contender_id`
- `uq_votes_battle_voter` unique constraint (re-vote rejected)
- `fn_browse_battles` (anon read of the seeded battle)
