---
title: Known Preview Surfaces
description: Complete list of LenserFight Community Edition features that are behind a feature flag, cloud-only, or not yet implemented. Includes controlling environment variables and rollback instructions.
---

# Known Preview Surfaces

This page lists every feature in LenserFight that is **not available by default** in a self-hosted Community Edition install. Use it to set accurate expectations, configure deployments, and communicate scope to contributors.

## Status definitions

| Status | Meaning |
|--------|---------|
| **Stable** | Ships enabled in Community Edition. No flag required. |
| **Preview** | Implemented but requires a feature flag or a specific environment. |
| **Cloud only** | Requires the hosted LenserFight platform. Not enabled for self-hosted installs. |
| **Not yet implemented** | Tracked in the roadmap but not yet shipped. |

## Feature surface table

| Feature | Status | Controlling env var / requirement | Rollback |
|---------|--------|-----------------------------------|---------|
| Core workflow execution (manual) | **Stable** | — | — |
| Lenses and lens library | **Stable** | — | — |
| CLI (`lf run exec`, `lf execution wait`) | **Stable** | — | — |
| Notification bell and badge | **Stable** | Supabase | — |
| Wallet balance badge | **Stable** | Supabase + Chainabit | — |
| Social graph (follow / unfollow) | **Stable** | Supabase | — |
| CRON scheduling | **Preview** | `FEATURE_CRON_SCHEDULING=true` + Supabase | Set flag to `false`; run `SELECT cron.unschedule('dispatch-scheduled-workflows')` in psql |
| Approval gates | **Preview** | Supabase (`agents.*` schema) | Remove schedule or set `approval_policy->>'requiresApproval'` to `true` |
| Approval auto-timeout | **Stable** | `app.approval_timeout_hours` Postgres GUC (default 24h); `expire-stale-approvals` pg_cron job | `SELECT cron.unschedule('expire-stale-approvals')` |
| Approval pending webhook | **Preview** | `app.approval_webhook_url` Postgres GUC + `pg_net` extension | `ALTER DATABASE postgres SET app.approval_webhook_url = ''` |
| Moderation flagged webhook | **Preview** | `app.moderation_webhook_url` Postgres GUC + `pg_net` extension | `ALTER DATABASE postgres SET app.moderation_webhook_url = ''` |
| Platform-api `/health` probe | **Stable** | `public.fn_health()` RPC; unauthenticated GET | — |
| SSE run event replay (`GET /v1/runs/:id/events`) | **Preview** | Supabase (`lenses.workflow_run_events`) | Use polling via `lf execution inspect` |
| Marketplace (`/marketplace`) | **Preview** | Supabase (`lenses.lenses.visibility` column) | Route is unauthenticated; disable via reverse-proxy path block |
| Tool invocation logs | **Preview** | Supabase (`platform.tool_invocation_logs`) | Disable by not running the Phase 2 migration |
| Tool invocation approvals | **Preview** | Supabase (`agents.*` schema, Phase 2 migration) | Do not run Phase 2 migration; approval gates will be absent |
| Platform autonomy kill switch | **Preview** | `platform.system_flags.autonomy_dispatch_enabled` | `UPDATE platform.system_flags SET value = 'false' WHERE key = 'autonomy_dispatch_enabled'` |
| Chainabit execution bridge | **Preview** | `FEATURE_CHAINABIT_EXECUTION=true` + `CHAINABIT_API_URL` | Set flag to `false` |
| Local battles (CLI) | **Preview** | No flag required — `lf battle local` commands work without cloud infra | `n/a` |
| Cloud battles arena | **Preview** | `FEATURE_PUBLIC_BATTLES=true` + hosted Supabase + `app.webhook_signing_secret` GUC + `webhook-outbox-dispatcher` cron healthy. Limited beta surface; see [Cloud Battles runbook](/en/explanation/battles/limited-beta-status). | Set `FEATURE_PUBLIC_BATTLES=false`; `SELECT cron.unschedule('webhook-outbox-dispatcher')`; local battles continue to work |
| Battle moderation admin console | **Preview** | `FEATURES.PUBLIC_BATTLES=true` + admin-or-creator gating on the route. Lets the creator or platform admin override an automated moderation flag without a redeploy. | Set `FEATURES.PUBLIC_BATTLES=false`; the route returns 404 |
| Battle BYOK streaming | **Preview** | `FEATURE_PUBLIC_BATTLES=true` + BYOK key ref + hosted Supabase | Set flag to `false` |
| ELO leaderboard | **Preview** | `FEATURE_PUBLIC_BATTLES=true` + Supabase | Set flag to `false` |
| Connector marketplace | **Not yet implemented** | — | — |
| Billing and credits | **Not yet implemented** | — | — |
| Benchmark suite | **Not yet implemented** | — | — |
| AI judge (battle) | **Preview** | Supabase + `ANTHROPIC_API_KEY` in edge function env | Disable AI judge flag on individual battles |
| Tournament system | **Preview** | Supabase | Do not call `fn_create_tournament` |
| Creator analytics (timeseries, head-to-head) | **Preview** | Supabase + Phase 3 migration | Remove the Phase 3 analytics migration |

## How to disable CRON scheduling (full rollback)

```sql
-- Step 1: Stop pg_cron from dispatching scheduled workflows
SELECT cron.unschedule('dispatch-scheduled-workflows');

-- Step 2: Disable the UI (set this in your .env)
-- FEATURE_CRON_SCHEDULING=false

-- Step 3: Re-enable later (expression must match original migration)
SELECT cron.schedule(
  'dispatch-scheduled-workflows',
  '*/5 * * * *',
  'SELECT public.fn_dispatch_scheduled_workflows_with_approval()'
);
```

## How to activate the platform autonomy kill switch

```sql
-- Halt all autonomous workflow dispatches immediately
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';

-- Re-enable
UPDATE platform.system_flags
SET value = 'true', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';
```

## Related

- [Kill Switch](/en/how-to/kill-switch) — per-agent and platform-level kill switch guide
- [Release Checklist](/en/how-to/contributors/release-checklist) — checklist for verifying flag state before shipping
