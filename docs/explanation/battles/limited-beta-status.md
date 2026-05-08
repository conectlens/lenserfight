---
title: Cloud Battles — Limited Beta Status
description: Operator runbook for the Cloud Battles Limited Beta — preflight env vars and Postgres GUCs, monitoring signals, rollback steps, and escalation channel.
---

# Cloud Battles — Limited Beta Status

This page is the operator runbook for running the Cloud Battles surface in Limited Beta. It assumes the deployment has the Phase O webhook outbox migration applied and a hosted Supabase instance with `pg_cron` and `pg_net` available.

For the full set of integrity checks the surface must pass before flipping the flag, see [Battle Integrity Checklist](/how-to/battles/battle-integrity-checklist).

## Preflight

### Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_FEATURE_PUBLIC_BATTLES` | Enables the cloud arena UI in `apps/web` and the cloud battle worker in `apps/platform-api`. | yes |
| `FEATURES.PUBLIC_BATTLES` | Server-side mirror of the same flag, read by the moderation admin console. | yes |
| `ANTHROPIC_API_KEY` (edge function env) | Used by the AI judge edge function. | yes |
| `CHAINABIT_API_URL` | Used when battles dispatch through the Chainabit execution bridge. | only if Chainabit bridge is enabled |

### Postgres GUCs

Set these on the Limited Beta deployment with `ALTER DATABASE postgres SET …`. Restart `pg_cron` workers after a change so the GUC takes effect inside the cron job's session.

| GUC | Purpose | Default | Required |
|---|---|---|---|
| `app.approval_timeout_hours` | Threshold for the `expire-stale-approvals` job. | `24` | recommended |
| `app.approval_webhook_url` | Best-effort POST URL for newly-pending approvals (drives the operator pager). | empty | yes for Limited Beta |
| `app.moderation_webhook_url` | Best-effort POST URL for moderation events (flagged submissions, override decisions). | empty | yes for Limited Beta |
| `app.webhook_signing_secret` | HMAC signing key for `audit.webhook_outbox` deliveries. Reject deliveries on the receiver side when `X-Lenserfight-Signature` does not match. | empty | yes for Limited Beta |

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
VITE_FEATURE_PUBLIC_BATTLES=false
FEATURES.PUBLIC_BATTLES=false
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

- **Primary:** email `moderation@lenserfight.org`. Expected first response within 24 hours during Limited Beta.
- **GitHub Issue (sensitive):** open a private security advisory if the report contains user data or credentials.
- **GitHub Issue (general):** label the issue `limited-beta` and `incident` so it surfaces in the maintainer triage queue.

## Related

- [Battle Integrity Checklist](/how-to/battles/battle-integrity-checklist) — required checks before enabling cloud battles.
- [Known Preview Surfaces](/reference/known-preview-surfaces) — controlling flags, gates, and rollback per surface.
- [OSS Launch Scope](/explanation/community/oss-launch-scope) — Limited Beta gates and how to participate.
- [Approvals](/connected-lenses/approvals) — webhook payload shape and delivery semantics.
