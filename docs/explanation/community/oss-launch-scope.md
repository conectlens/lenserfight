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
| CRON scheduling | **Preview** | Requires `VITE_FEATURE_CRON_SCHEDULING=true` + pg_cron. Default approval-gated. |
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
| Cloud battles arena | **Limited Beta** — `VITE_FEATURE_PUBLIC_BATTLES=true` + hosted Supabase + access grant |
| Battle BYOK streaming | Cloud battles gate + BYOK key reference |
| ELO leaderboard | Cloud battles gate |
| Tournament scoring | Cloud battles gate |
| Public arena and discovery | Cloud battles gate |

**What "Limited Beta" means:** the surface has the integrity checks required to be operated outside the core team. Public access is still gated by invitation. There is no general-availability SLA. Operators must complete the [Limited Beta status runbook](/explanation/battles/limited-beta-status) and meet the gates listed below before turning the surface on.

### Limited Beta gates

The cloud battles surface only enters Limited Beta after the following ship items pass verification on a deployment:

- **K4 — `/health` probe.** `public.fn_health()` returns `ok` and the platform-api `/health` route reports green. See [Known Preview Surfaces](/reference/known-preview-surfaces#feature-surface-table).
- **J1 — Rate limit on battle creation.** `fn_battles_create` enforces the per-creator and per-IP rate limit; integrity tests in [Battle Integrity Checklist](/how-to/battles/battle-integrity-checklist) pass.
- **J2 — Moderation override.** Admins or the battle creator can override an automated moderation flag through the [battle moderation admin console](/reference/known-preview-surfaces#feature-surface-table). Required for releasing false positives without a redeploy.
- **O1 — Approval / moderation webhook outbox.** `audit.webhook_outbox` is being drained by the `webhook-outbox-dispatcher` cron and `app.webhook_signing_secret` is configured.
- **O3 — ELO change log.** Every leaderboard mutation writes to the ELO change log so disputes can be resolved without replaying matches.

### How to participate

1. Read the [Limited Beta status runbook](/explanation/battles/limited-beta-status) and the [Battle Integrity Checklist](/how-to/battles/battle-integrity-checklist).
2. Open a GitHub Discussion under the **"Limited Beta access"** category describing the deployment, scale, and contact email.
3. The core team reviews requests within 5 business days. Approved operators receive the env vars and GUC values they need to wire `VITE_FEATURE_PUBLIC_BATTLES=true` plus the webhook outbox dispatcher.
4. Operators agree to surface bugs and incidents through GitHub Issues with the `limited-beta` label.

## Out of scope — not yet implemented

These are tracked in the roadmap but not shipped. No code exists. Do not reference them as LenserFight capabilities at launch.

| Surface | Why out of scope |
|---------|-----------------|
| Connector SDK | Interface RFC in progress; no stable adapter contract |
| Connector marketplace | Depends on connector SDK |
| Billing and credits | Commercial infrastructure not part of OSS |
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
