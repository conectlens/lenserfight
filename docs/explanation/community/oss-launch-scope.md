---
title: OSS Launch Scope
description: What is and is not part of the LenserFight Community Edition OSS launch. Covers stable surfaces, preview surfaces, private alpha, and explicitly out-of-scope items.
---

# OSS Launch Scope

This page defines what LenserFight Community Edition commits to at OSS launch — and what it deliberately does not. Read it before evaluating the project, contributing, or deploying self-hosted.

## In scope for OSS launch

These surfaces ship enabled (or preview-flagged) in Community Edition. A self-hosted install can reach all of them.

| Surface | Status | Notes |
|---------|--------|-------|
| Core workflow execution (manual) | **Stable** | DAG engine, node retries, contract validation |
| Lenses and lens library | **Stable** | Create, version, publish, clone |
| CLI (`lf run exec`, `lf execution wait`) | **Stable** | Local and BYOK model experiments |
| Social graph (follow / unfollow) | **Stable** | |
| Notifications (bell, badge) | **Stable** | Requires Supabase |
| CRON scheduling | **Preview** | Requires `FEATURE_CRON_SCHEDULING=true` + pg_cron. Default approval-gated. |
| Approval gates | **Preview** | Blocks scheduled runs and write-class tool calls until a human resolves |
| Tool invocation (read-only and write-class) | **Preview** | Write-class tools always require approval |
| Memory (profiles, entries, injection) | **Preview** | Write-on-success gate enforced |
| SSE run event replay | **Preview** | `GET /v1/runs/:id/events` — requires Supabase |
| Kill switch (per-agent + platform) | **Preview** | `lf kill-switch on/off/status`, `platform.system_flags` |
| Local battles (CLI) | **Preview** | `lf battle local init/run/vote` — no cloud infra needed |

**What "Preview" means for self-hosters:** the feature is implemented and tested. It requires a feature flag or a full Supabase instance. It may have rough edges. It is not implied to be production-ready for every workload.

## Limited Beta (gated)

These surfaces exist in the codebase and have passed the integrity checks needed to invite outside operators. They still require an explicit access grant or a hosted environment, and are subject to the gates below.

| Surface | Gate |
|---------|------|
| Cloud battles arena | **Limited Beta** — `FEATURE_PUBLIC_BATTLES=true` + hosted Supabase + access grant |
| Battle BYOK streaming | Cloud battles gate + BYOK key reference |
| ELO leaderboard | Cloud battles gate |
| Tournament scoring | Cloud battles gate |
| Public arena and discovery | Cloud battles gate |

**What "Limited Beta" means:** the surface has the integrity checks required to be operated outside the core team. Public access is still gated by invitation. There is no general-availability SLA. Operators must complete the [Limited Beta status runbook](/explanation/battles/limited-beta-status) and meet the gates listed below before turning the surface on.

### Limited Beta gates

The cloud battles surface only enters Limited Beta after the following ship items pass verification on a deployment. Each gate is backed by a pgTAP test that the [`coverage-gate.yml`](https://github.com/conectlens/lenserfight/blob/main/.github/workflows/coverage-gate.yml) CI workflow keeps green on every PR (Phase BV).

- **K4 — `/health` probe.** `public.fn_health()` returns `ok` and the platform-api `/health` route reports green. Verified by `pnpm announcement:dashboard --once`. See [Known Preview Surfaces](/reference/known-preview-surfaces#feature-surface-table).
- **J1 — Rate limit on battle creation.** `fn_battles_create` enforces the per-creator rolling 24h cap. Verified by [`supabase/tests/59_battles_create_rate_limit.sql`](https://github.com/conectlens/lenserfight/blob/main/supabase/tests/59_battles_create_rate_limit.sql) plan(3).
- **J2 — Moderation override.** Battle creators can override an automated moderation flag via `fn_decide_moderation_override`. Verified by [`supabase/tests/60_moderation_admin_override.sql`](https://github.com/conectlens/lenserfight/blob/main/supabase/tests/60_moderation_admin_override.sql) plan(2).
- **O1 — Approval / moderation webhook outbox.** `audit.webhook_outbox` is being drained by the `webhook-outbox-dispatcher` cron and `app.webhook_signing_secret` is configured. Verified by [`supabase/tests/61_webhook_outbox_drain.sql`](https://github.com/conectlens/lenserfight/blob/main/supabase/tests/61_webhook_outbox_drain.sql) plan(3); end-to-end smoke step 14 in `scripts/smoke.sh`.
- **O3 — ELO change log.** Every leaderboard mutation writes a row to `reputation.elo_battle_log` so disputes can be resolved without replaying matches. Verified by [`supabase/tests/62_elo_change_log.sql`](https://github.com/conectlens/lenserfight/blob/main/supabase/tests/62_elo_change_log.sql) plan(2).

### How to participate

1. Read the [Limited Beta status runbook](/explanation/battles/limited-beta-status) and the [Battle Integrity Checklist](/how-to/battles/battle-integrity-checklist).
2. Open a GitHub Discussion under the **"Limited Beta access"** category describing the deployment, scale, and contact email.
3. The core team reviews requests within 5 business days. Approved operators receive the env vars and GUC values they need to wire `FEATURE_PUBLIC_BATTLES=true` plus the webhook outbox dispatcher.
4. Operators agree to surface bugs and incidents through GitHub Issues with the `limited-beta` label.

## Out of scope — not yet implemented

These are tracked in the roadmap but **no production-ready surface** exists yet. Do not reference them as stable LenserFight capabilities at launch.

| Surface | Why out of scope |
|---------|-----------------|
| **Stable** public client SDK on npm (`@lenserfight/sdk` v1.0) | Alpha line `0.1.0-alpha.1` is published (Phase BW); v1.0 contract follows 4–6 weeks of feedback. See [SDK reference](/reference/sdk). |
| **Stable** connector SDK on npm (`@lenserfight/adapter-connector` v1) | Adapter code and RFC exist in-repo (Phase 10); v1 contract and npm promotion are Phase 16 — see [Connectors](/reference/connectors/index). |
| Connector marketplace | Depends on stable public SDK and governance |
| Billing and credits | Handled by Chainabit (private commercial API) — not part of OSS |
| Benchmark suite | Evaluation harness not yet merged |
| Advanced analytics | Beyond creator analytics already in preview |
| Fully autonomous schedules (no per-run approval) | Explicitly deferred until moderation and audit infrastructure matures |

## What this means for contributors

- Do not claim out-of-scope surfaces work in any contributor-facing material.
- Do not promote private alpha surfaces as generally available.
- When writing docs, use `::: warning Private Alpha` or `::: warning Preview` callouts on any surface in this list.
- If a feature you are implementing touches a private alpha surface, request an access grant before testing end-to-end.

## Related

- [Known Preview Surfaces](/reference/known-preview-surfaces) — controlling flags and rollback instructions
- [Known Limitations](/reference/known-limitations) — honest list of current constraints
- [Open Core Model](/explanation/community/open-core-model) — what Community Edition is and is not
