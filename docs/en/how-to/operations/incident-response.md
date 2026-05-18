---
title: Incident Response
description: Step-by-step guide for diagnosing and recovering from production incidents in LenserFight — cron staleness, DB degradation, provider failures, and kill-switch procedures.
---

# Incident Response

This guide covers common production incidents and how to respond. For the announcement-day-specific runbook, see [Announcement Day Runbook](/en/how-to/operations/announcement-day-runbook).

## Severity tiers

| Tier | Criteria | Response target |
|------|----------|-----------------|
| P0 | Complete outage — auth, battles, or DB unreachable | Immediate (15 min) |
| P1 | Partial degradation — one subsystem down, workaround exists | 1 hour |
| P2 | Non-critical feature broken, no data loss | Next business day |
| P3 | Cosmetic / minor UX issue | Best effort |

## 1. Auth or database unreachable (P0)

**Symptoms**: 503/5xx from any API route; Supabase Studio unreachable; auth callbacks failing.

**Steps**:
1. Check Supabase Status page (linked from your project dashboard).
2. Check connection pool usage: `SUPABASE_URL/rest/v1/rpc/fn_health_check`.
3. If the DB is up but connections are saturated: scale the connection pool or restart the platform-api pod.
4. If fully down: activate the kill-switch for BYOK/autonomy to reduce load:
   ```sql
   UPDATE platform.system_flags SET enabled = false WHERE key = 'autonomy_dispatch_enabled';
   UPDATE platform.system_flags SET enabled = false WHERE key = 'public_battles_enabled';
   ```
   Or use the admin UI at `/admin/kill-switch`.
5. Post a status update to GitHub Discussions → `#announcements`.

**Recovery**: Verify `fn_health_check` returns `{ "status": "ok" }` before re-enabling flags.

## 2. Cron job stale (P1)

**Symptoms**: `pnpm health:cron` exits non-zero; dispatched workflows not executing on schedule; webhook outbox backing up.

**Check**:
```bash
pnpm health:cron
```

**Recovery**:
1. SSH into or exec on the Supabase server.
2. Confirm `pg_cron` is loaded: `SELECT cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. If jobs are defined but not running, restart the pg_cron worker via the Supabase dashboard → "Scheduled Jobs".
4. If the job definition is missing, re-register it:
   ```sql
   SELECT cron.schedule('dispatch-scheduled-workflows', '* * * * *',
     $$SELECT execution.fn_dispatch_scheduled_workflows()$$);
   ```

## 3. BYOK streaming failures (P1)

**Symptoms**: `lf run exec` or cloud BYOK battles returning provider errors; high 5xx on `/rpc/fn_workflow_*` routes.

**Diagnosis**:
1. Test with a minimal local battle: `lf battle local run --example haiku-shootout`.
2. Check the provider key validity: `lf byok-key list`.
3. Verify provider quota and rate limits in the provider's dashboard (OpenAI, Anthropic, Fal, etc.).
4. Check `BYOK_PROVIDERS` env var is set correctly in the cloud deployment.

**Kill-switch**: Disable BYOK on the platform level:
```sql
UPDATE platform.system_flags SET enabled = false WHERE key = 'public_battles_enabled';
```

## 4. ELO / ranking dispute (P2)

**Symptoms**: User reports unexpected ELO change; leaderboard ordering looks wrong.

**Diagnosis**:
```sql
SELECT * FROM reputation.lenser_scores WHERE lenser_id = '<uuid>';
SELECT * FROM reputation.contender_ratings WHERE battle_id = '<battle_uuid>';
```

**Recovery**: ELO updates are applied by `reputation.fn_update_elo_after_vote`. Check the trigger exists:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'battles'
  AND event_object_table = 'battle_votes';
```

If the trigger is missing, reapply the migration. No manual ELO adjustment — explain and re-run if needed.

## 5. High 404 rate on docs short-links (P2)

**Symptoms**: `/r/<slug>` returning 404; analytics shows 404 spike.

**Recovery**:
```bash
pnpm gen-shortlinks
```
Then redeploy the docs site. Check `tools/gen-shortlinks.mjs` LINKS map if a slug is missing.

## 6. CLI telemetry endpoint errors (P3)

**Symptoms**: Users report `LF_TELEMETRY=opt-in` causing errors on `lf` commands.

**Recovery**: Telemetry is fire-and-forget and should never affect command exit codes. If it does, check `apps/cli/src/lib/telemetry.ts` — the `recordEvent` function must swallow all errors. As an immediate mitigation, users can unset `LF_TELEMETRY`:
```bash
unset LF_TELEMETRY
```

## Post-incident

After every P0 or P1 incident:
1. Write a brief retro in GitHub Discussions → `#incident-retros` within 72 hours.
2. Update this document if the incident revealed a missing scenario.
3. File a GitHub Issue tagged `p0-*` or `p1-*` for any follow-up hardening work.

## Escalation contacts

| Role | Contact |
|------|---------|
| Maintainer | @ofcskn on GitHub |
| Security issues | lets@conectlens.com (see [Security Policy](/en/explanation/community/security)) |
| Provider outages | Provider status pages (OpenAI, Anthropic, Fal) |
