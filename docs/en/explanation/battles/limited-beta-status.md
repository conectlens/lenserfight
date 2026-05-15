---
title: Cloud Battles — Operator Runbook
description: Operator runbook for the Cloud Battles surface — preflight env vars and Postgres GUCs, monitoring signals, rollback steps, and escalation channel.
---

# Cloud Battles — Operator Runbook

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


This page is the operator runbook for running the Cloud Battles surface. It assumes the deployment has the Phase O webhook outbox migration applied and a hosted Supabase instance with `pg_cron` and `pg_net` available.

For the full set of integrity checks the surface must pass before flipping the flag, see [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist).

## Preflight

### Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `FEATURE_PUBLIC_BATTLES` | Enables the cloud arena UI in `apps/web` and the cloud battle worker in `apps/platform-api`. | yes |
| `FEATURES.PUBLIC_BATTLES` | Server-side mirror of the same flag, read by the moderation admin console. | yes |
| `ANTHROPIC_API_KEY` (edge function env) | Used by the AI judge edge function. | yes |
| `CHAINABIT_API_URL` | Used when battles dispatch through the Chainabit execution bridge. | only if Chainabit bridge is enabled |

### Postgres GUCs

Set these on the deployment with `ALTER DATABASE postgres SET …`. Restart `pg_cron` workers after a change so the GUC takes effect inside the cron job's session.

| GUC | Purpose | Default | Required |
|---|---|---|---|
| `app.approval_timeout_hours` | Threshold for the `expire-stale-approvals` job. | `24` | recommended |
| `app.approval_webhook_url` | Best-effort POST URL for newly-pending approvals (drives the operator pager). | empty | yes |
| `app.moderation_webhook_url` | Best-effort POST URL for moderation events (flagged submissions, override decisions). | empty | yes |
| `app.webhook_signing_secret` | HMAC signing key for `audit.webhook_outbox` deliveries. Reject deliveries on the receiver side when `X-Lenserfight-Signature` does not match. | empty | yes |

```sql
ALTER DATABASE postgres SET app.approval_timeout_hours = 24;
ALTER DATABASE postgres SET app.approval_webhook_url    = 'https://example.com/approvals';
ALTER DATABASE postgres SET app.moderation_webhook_url  = 'https://example.com/moderation';
ALTER DATABASE postgres SET app.webhook_signing_secret  = '<32-byte hex>';
```

### Cron jobs

The dispatcher and timeout enforcement run inside Postgres via `pg_cron`. Verify both are scheduled:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('expire-stale-approvals', 'webhook-outbox-dispatcher');
```

Both rows must show `active = true`.

## Monitoring

| Signal | Where to look | What to watch for |
|---|---|---|
| Webhook outbox backlog | `audit.webhook_outbox` | `count(*) WHERE delivered_at IS NULL` should drift toward zero. A growing undelivered count means receivers are 5xx-ing or the dispatcher is not running. |
| Approval timeout job health | `cron.job_run_details WHERE jobname = 'expire-stale-approvals'` | Job runs every 5 minutes. Multiple consecutive `failed` rows indicates a configuration regression or a long-running locking transaction. |
| Webhook dispatcher health | `cron.job_run_details WHERE jobname = 'webhook-outbox-dispatcher'` | Job runs frequently; consecutive failures means the dispatcher RPC is misconfigured or `pg_net` is unavailable. |
| Battle moderation overrides | `battles.moderation_decisions` (when present) or `audit.action_logs WHERE action LIKE 'battle_moderation_%'` | Spike in overrides signals either a model regression or coordinated abuse. Cross-check against `battles.battle_submissions` rejection rate. |
| ELO change log | `battles.elo_changes` (or the equivalent log table) | Every leaderboard mutation must produce a row. Gaps mean the ELO writer is bypassing the log path. |

## Rollback

A rollback is non-destructive — battles already in flight finish on whatever path they were claimed by. The flip just stops new entries.

```bash
# 1. Disable the UI / worker (re-deploy with the flag flipped)
FEATURE_PUBLIC_BATTLES=false
```

```sql
-- 2. Stop the webhook outbox dispatcher
SELECT cron.unschedule('webhook-outbox-dispatcher');

-- 3. Optional: clear the webhook URLs so failed retries don't fan out
ALTER DATABASE postgres SET app.approval_webhook_url   = '';
ALTER DATABASE postgres SET app.moderation_webhook_url = '';
```

Local battles (`lf battle local`) continue to work — they do not depend on any of the above.

To re-enable later, restore the flag values, re-set the GUCs, and re-schedule the dispatcher with the same expression used in the original migration.

## Escalation

Use this channel when an automated control fails to contain a real-world incident (abusive submission, leaked credentials in a prompt, sustained moderation bypass).

- **Primary:** email `moderation@lenserfight.org`. Expected first response within 24 hours.
- **GitHub Issue (sensitive):** open a private security advisory if the report contains user data or credentials.
- **GitHub Issue (general):** label the issue `incident` so it surfaces in the maintainer triage queue.

## Integrity gate verification (Phase BV — 2026-05-12)

The five gates required by [OSS Launch Scope](/en/explanation/community/oss-launch-scope#cloud-battles-deployment-gates) are verified by automated tests at the SHA listed in [Announcement Readiness](/en/explanation/community/announcement-readiness).

| Gate | Test reference | Status |
|------|----------------|--------|
| **K4** — `/health` probe returns `ok` | `pnpm announcement:dashboard --once` row `GET /health` | ✅ verified |
| **J1** — `fn_battles_create` enforces per-lenser daily cap | `supabase/tests/59_battles_create_rate_limit.sql` plan(3) | ✅ verified |
| **J2** — Battle creator can override moderation | `supabase/tests/60_moderation_admin_override.sql` plan(2) | ✅ verified |
| **O1** — `audit.webhook_outbox` dispatcher exists and drains | `supabase/tests/61_webhook_outbox_drain.sql` plan(3); end-to-end smoke step 14 in `scripts/smoke.sh` | ✅ verified |
| **O3** — Every leaderboard mutation writes to ELO change log | `supabase/tests/62_elo_change_log.sql` plan(2); table `reputation.elo_battle_log` | ✅ verified |

All four pgTAP files are added to `scripts/coverage-gate.sh` critical-RPC checks. The gate fails the PR if any of these tests are removed or any of `fn_battles_create`, `fn_decide_moderation_override`, `fn_dispatch_webhook_outbox`, or `fn_compute_elo_after_battle` lose all test references.

## Related

- [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) — required checks before enabling cloud battles.
- [Known Preview Surfaces](/en/reference/known-preview-surfaces) — controlling flags, gates, and rollback per surface.
- [OSS Launch Scope](/en/explanation/community/oss-launch-scope) — surface status and deployment requirements.
- [Approvals](/en/reference/internals/approvals) — webhook payload shape and delivery semantics.
