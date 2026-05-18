---
title: "Rematch a Battle and Run a Series"
description: "Create a single rematch from the CLI or web UI, set up a recurring tournament series with pg_cron, and pause or troubleshoot it."
---

# Rematch a Battle and Run a Series

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


This guide covers the operational moves introduced in Phase V: spawning one rematch on demand, and standing up a recurring series so the dispatcher chains rematches automatically.

For the conceptual model — what gets copied, what doesn't, how lineage works — see [Rematches, Replays, and Series](/en/explanation/battles/rematches-and-series).

---

## Prerequisites

- The **parent battle** must be in a terminal status: `closed`, `published`, or `archived`. Drafts and in-flight battles cannot be rematched.
- The caller must be the **owner** of the parent battle (`battles.battles.creator_lenser_id = auth lenser`). The CLI and the web button both call the owner-checked RPC `public.fn_battles_create_rematch`.
- Cloud battles require operator checklist completion and controlled rollout. See [Local vs. Cloud Battles](/en/explanation/battles/local-vs-cloud-battles).

---

## Single rematch via CLI

The CLI command resolves a slug, calls the owner-checked RPC, and prints the new slug.

```bash
lf battle rematch csv-parser-2026
```

Example output:

```
i Resolving battle: csv-parser-2026
✔ Created rematch: csv-parser-2026-r3a7f2c
```

JSON mode for scripting:

```bash
lf battle rematch csv-parser-2026 --json
# { "rematch_id": "9b2e4f1a-...", "slug": "csv-parser-2026-r3a7f2c" }
```

The new battle starts in `draft`. You still own the lifecycle: re-open it (`lf battle open`), let it execute or accept submissions, then `start-voting` / `finalize` / `publish` as usual. See [`lf battle`](/en/reference/cli/battle#battle-rematch) for the full flag table.

---

## Single rematch from the web UI

On the **BattleResultPage** for any finalized battle you own, a "Create rematch" action is rendered next to the result summary. The button is gated to the battle owner — non-owners do not see it.

The button calls the same `fn_battles_create_rematch` RPC the CLI uses, so the constraints are identical: the parent must be in a terminal status, and the caller must be the owner. After success the page redirects to the new draft battle's edit view.

---

## Recurring series via SQL

Series management is currently SQL-only. The web UI surface for series is tracked separately.

### Create a series

```sql
SELECT public.fn_battles_series_create(
  'weekly-arena',                       -- name (also used to derive the slug)
  'a3c7e1f2-9b2e-4f1a-8e8e-1234567890ab', -- seed battle id (you must own it)
  '0 12 * * MON'                         -- cron: noon every Monday
);
```

The function:

- validates the cron expression (must be 5 whitespace-separated fields);
- requires the caller to own the seed battle;
- generates a slug like `weekly-arena-a3c7e1`;
- inserts the seed at `series_battles.position = 1`;
- primes `next_dispatch_at` to the next top-of-hour boundary.

It returns the new `battles.series.id`.

### How `next_dispatch_at` advances

The dispatcher (`battles.fn_dispatch_series_rematches`) runs once an hour at `0 * * * *`. On every tick, for every active series whose pointer has been reached, the pointer is moved forward to the next top-of-hour — regardless of whether the cron matched. So:

- A matching tick spawns a rematch and bumps the pointer.
- A non-matching tick is "checked but skipped" — the pointer still bumps, so the series isn't re-evaluated until the next hour.
- A failing tick is logged as `WARNING`, the pointer still bumps, and the dispatcher moves on. Per-series failures cannot block the rest of the queue.

### Inspect series state

```sql
SELECT id, name, slug, cron_expr, next_dispatch_at, is_active
FROM battles.series
WHERE creator_lenser_id = lensers.get_auth_lenser_id();

SELECT position, battle_id, created_at
FROM battles.series_battles
WHERE series_id = '<series-id>'
ORDER BY position ASC;
```

### Pause a series

```sql
UPDATE battles.series
SET is_active = false
WHERE id = '<series-id>'
  AND creator_lenser_id = lensers.get_auth_lenser_id();
```

The dispatcher's main loop filters on `is_active = true`, so paused series are skipped without losing their position pointer. Re-activate by flipping the flag back to `true`; the next eligible tick picks up where the chain left off.

---

## Troubleshooting

**`parent_battle_not_terminal: status=open`**
You called `fn_battles_create_rematch` against a battle that hasn't reached `closed`/`published`/`archived` yet. Finalize and close the parent first.

**`parent_battle_not_found`**
The id was wrong, the battle was hard-deleted, or it was soft-deleted (`deleted_at IS NOT NULL`). The CLI command resolves slugs via PostgREST and will print this if the slug doesn't match a row.

**`not_battle_owner`**
The signed-in lenser is not the parent's `creator_lenser_id`. Co-owners and moderators are not currently authorized to spawn rematches; only the original creator is.

**Slug collision on the rematch**
The clone helper appends `-r<6-hex>` to the parent slug, which makes a collision astronomically unlikely. If the parent slug is already at the length cap, the helper truncates the parent prefix to 200 characters before appending.

**Series isn't producing battles**
Check, in order:

1. `is_active = true`.
2. `next_dispatch_at <= now()`.
3. The cron expression actually matches the current hour. The dispatcher only fires hourly — sub-hourly cron expressions are accepted but observed at hour boundaries (see [Known Limitations](/en/reference/known-limitations#battles)).
4. The Postgres logs for `WARNING: series_dispatch_failed: series_id=...` lines. Per-series exceptions are swallowed and logged.

---

## Related

- [Rematches, Replays, and Series](/en/explanation/battles/rematches-and-series) — what's preserved and what isn't
- [`lf battle rematch`](/en/reference/cli/battle#battle-rematch) — CLI flags and error cases
- [Battle share-card API](/en/reference/battles/share-card-api) — `og:image` for any battle, including rematches
- [Known Limitations → Battles](/en/reference/known-limitations#battles)
