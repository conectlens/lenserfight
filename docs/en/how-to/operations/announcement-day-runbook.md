---
title: Announcement Day Runbook
description: Step-by-step operator guide for the LenserFight 0.10.0 public announcement. Covers pre-flight, monitoring cadence, kill-switch endpoints, expected error rates, escalation, and rollback.
---

# Announcement Day Runbook

This document is the operator checklist for **2026-06-12** — the day the LenserFight 0.10.0 public announcement goes live. Follow it in order.

> **Owner**: maintainer. No 24×7 on-call SLA — announcements are staggered to allow async response. Check the dashboard every 30 minutes during the first 8 hours.

---

## T-24 h: Pre-flight

Run these the day before. Do not proceed to announcement if any row is red.

- [ ] `pnpm announcement:gates` passes (static gate matrix audit — Phase BT)
- [ ] `pnpm announcement:dashboard --once` exits 0 (live runtime health probe — Phase BT)
- [ ] `pnpm health:cron` passes on staging (all required crons scheduled and ran within 5 min)
- [ ] `GET /health` returns `{ "status": "ok" }` on the staging deployment
- [ ] `/admin/kill-switch` page loads for a super-admin account; all three flags show correct state
- [ ] `pnpm docs:audit` returns zero errors (CLI docs drift, OpenAPI drift)
- [ ] `pnpm smoke` passes on a clean clone (README quickstart → first battle output ≤ 5 min)
- [ ] Announcement copy approved (HN, X thread, LinkedIn, dev.to)
- [ ] Screencaps hosted and URLs verified

---

## T-0: Go live

1. Push announcement to HN (morning PT — 9 AM Pacific, 17:00 UTC).
2. Wait 30 min — read and respond to first HN comments before posting X thread.
3. Post X thread (10 tweets, staggered from the HN link).
4. Post LinkedIn after X is live.
5. Post dev.to article (schedule it for the following day to maintain momentum).

---

## During: monitoring cadence

Run `pnpm announcement:dashboard` in a dedicated terminal — it refreshes every 30 s by default and shows colored status rows. Use `--interval 15` to poll faster during the first hour. Use `--once` for a single snapshot suitable for scripting.

```bash
# Continuous (default 30s refresh)
pnpm announcement:dashboard

# Single snapshot (CI-friendly, exits non-zero if any row is RED)
pnpm announcement:dashboard --once

# Faster cadence
pnpm announcement:dashboard --interval 15
```

Dashboard rows:

| Row | What it probes | Red when |
|-----|----------------|----------|
| `GET /health` | platform-api `/health` returns `{"status":"ok"}` | non-200 or body mismatch |
| `pnpm health:cron` | required crons ran in last 5 min | health-cron script exits non-zero |
| `fn_health()` | Supabase RPC returns `ok` | RPC returns non-ok or DB unreachable |
| `platform.system_flags` | 3 launch flags read | any flag missing or `=false` |
| `analytics.events` | active user count last 5 min | table missing (yellow), query fails (yellow) |
| `battles.battles` | open battle count | query fails |
| `audit.webhook_outbox` | failed events last 5 min | >5 failures in 5 min |

| Signal | OK threshold | Action if breached |
|--------|-------------|-------------------|
| Docs 404 rate | < 5 % | Fix the broken link immediately; flush CDN |
| `/health` status | `ok` | See [DB degraded](#db-degraded) below |
| Required crons healthy | All green | See [Cron stale](#cron-stale) below |
| Platform flags | `autonomy_dispatch_enabled: true` | Expected; do not change unless incident |
| HN top comment sentiment | Neutral/positive | Respond factually; avoid defensiveness |

---

## Kill-switch endpoints

### Via the admin UI

1. Log in as a super-admin account.
2. Navigate to `/admin/kill-switch`.
3. Click the toggle for the relevant flag. Changes take effect within ≤ 60 seconds.

### Via SQL (emergency — no UI access)

```sql
-- Halt all autonomous workflow dispatches
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';

-- Disable cloud battles arena
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'public_battles_enabled';

-- Disable webhook outbox
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'webhook_outbox_enabled';

-- Re-enable any flag
UPDATE platform.system_flags
SET value = 'true', updated_at = now()
WHERE key = '<flag_key>';
```

### Per-battle or per-agent kill switch (via CLI)

```bash
lf kill-switch on --scope battle --target <battle-id> --reason "announcement incident"
lf kill-switch on --scope agent  --target <agent-id>  --reason "announcement incident"
```

### Halt CRON scheduling entirely

```sql
SELECT cron.unschedule('dispatch-scheduled-workflows');
SELECT cron.unschedule('webhook-outbox-dispatcher');
SELECT cron.unschedule('expire-stale-approvals');
```

Restore with:

```sql
SELECT cron.schedule('dispatch-scheduled-workflows', '*/5 * * * *',
  'SELECT public.fn_dispatch_scheduled_workflows_with_approval()');
SELECT cron.schedule('webhook-outbox-dispatcher', '*/1 * * * *',
  'SELECT audit.fn_drain_webhook_outbox()');
SELECT cron.schedule('expire-stale-approvals', '*/10 * * * *',
  'SELECT agents.fn_expire_stale_approvals()');
```

---

## Incident response by scenario

### DB degraded

`GET /health` returns `{ "status": "degraded" }`.

1. Check Supabase dashboard → Database → Logs for the root cause.
2. If it is a connection-limit spike: temporarily reduce auth pool size in `config.toml`.
3. If migrations are broken: roll back the most recent migration.
4. Set `public_battles_enabled = false` to reduce load while investigating.

### Cron stale

`pnpm health:cron` reports a stale cron.

1. Check `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20` in psql.
2. If cron.job_run_details shows errors, read the `return_message` column.
3. If `pg_cron` worker is down, restart: `SELECT cron.schedule_in_database(...)` after checking the extension is loaded.
4. If it is a function error inside the cron body, fix the function and re-test manually:
   ```sql
   SELECT public.fn_dispatch_scheduled_workflows_with_approval();
   ```

### ELO mutation without change-log

If a dispute is raised about a leaderboard entry:

1. Query `reputation.elo_change_log` for the contested battle UUID.
2. If no row exists, the mutation pre-dates Phase AC (the pgTAP test will have caught this going forward).
3. Reconstruct the ELO from the `reputation.contender_ratings` history and file a manual correction via `fn_battles_finalize` replay.

### High 404 rate on docs

1. Check the dead links in the 404 logs.
2. Add a redirect entry in the VitePress config (`rewrites` or `redirects`) if the URL was posted publicly.
3. Re-deploy docs: `pnpm docs:build && pnpm docs:preview`.

---

## Expected error rates

These are normal on announcement day:

| Error | Normal rate | Cause |
|-------|------------|-------|
| `401 Unauthorized` on `/v1/*` | 5–15 % | Visitors hitting API endpoints directly from sharing links |
| `429 Too Many Requests` | < 1 % | Rate-limit enforcement on `fn_battles_create` — expected and healthy |
| `503 Degraded` on `/health` | 0 % — P0 if > 0 | Database probe timeout |

---

## Escalation contact

- **Primary**: `maintainers@lenserfight.com` (repository maintainer rotation)
- **Security incidents**: `security@lenserfight.com` (see `SECURITY.md`)
- **GitHub**: open an issue with label `announcement-incident` — maintainers monitor during the 8-hour window

---

## T+72 h: Post-launch retro

After 72 hours, write a retro at `docs/community/post-launch-retro.md` covering:

1. Traffic numbers (stars, clones, opt-in CLI invocations)
2. Incidents — what happened, root cause, resolution
3. What worked in the announcement copy
4. What to improve for the next announcement

Post a link in GitHub Discussions under "Announcements".

---

## Related

- Platform System Flags at `/admin/kill-switch` — admin UI (requires super-admin login)
- [Known Preview Surfaces](/en/reference/known-preview-surfaces) — flag rollback reference
- [Announcement Readiness](/en/explanation/community/announcement-readiness) — gate matrix
