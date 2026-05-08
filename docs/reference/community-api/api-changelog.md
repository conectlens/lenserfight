---
title: API Changelog
description: Reverse-chronological log of changes to the LenserFight public RPC API surface.
---

# API Changelog

Public RPC surface changes are recorded here in reverse-chronological order.

---

## v0.2 — Reliability + ecosystem (2026-05-08)

Phases F–K. Operator and developer-ecosystem additions; no removals.

### New RPCs

| Function | Description |
|---|---|
| `fn_expire_stale_approvals` | Phase K1. pg_cron target. Expires `agents.team_runs` rows with `approval_status='pending'` older than `app.approval_timeout_hours` (default 24). Sets `approval_status='timed_out'`, cancels the workflow run, emits an `approval_timed_out` event. Concurrency-safe (`FOR UPDATE SKIP LOCKED`). |
| `fn_health` | Phase K4. Returns `1`. Used by the platform-api `GET /health` route to probe database reachability. |
| `fn_decide_moderation_override` | Phase J2. Atomic moderation owner-override RPC. Writes the override decision and audit row. |

### Trigger and DB-level additions

| Trigger | Description |
|---|---|
| `trg_team_runs_approval_pending_webhook` | Phase K2. AFTER INSERT trigger on `agents.team_runs`. Posts a `webhook_version=1` payload to `app.approval_webhook_url` via `pg_net` when a row is created with `approval_status='pending'`. Best-effort, non-blocking. |
| `team_runs_approval_status_check` | Phase K1. Constraint extended to allow `'timed_out'` in addition to `'pending'`, `'approved'`, `'rejected'`, `'not_required'`. |

### HTTP API additions

| Endpoint | Description |
|---|---|
| `GET /health` | Phase K4. Returns 200 `{status:'ok',db:true,uptime_s,version,checked_at}` or 503 `{status:'degraded',db:false,reason}` with a 1500 ms probe budget. Unauthenticated. |
| `POST /v1/battles/*` | Phase J1. Per-day battle-creation rate limit. Sixth call within 24h returns HTTP 429 with `code='BATTLE_RATE_LIMIT'`. |
| Documented in [OpenAPI 3.1 spec](/reference/platform-api/openapi.yaml) | Phase L1. Hand-authored against `libs/api/contracts/`; CI lints with `redocly`. |

### Behavior changes (non-breaking)

- **`fn_upsert_workflow_schedule`** (Phase G2): activating with `requiresApproval=false` now writes an `approval_bypass_attempted` row to `agents.action_logs`. The new value is added to the `action_logs_type_check` constraint. Existing call sites are unchanged.
- **Schedule activation gate** (Phase F): activating a schedule with `requiresApproval=false` AND no `policies.spending_limit_credits` raises Postgres `ERRCODE 23514`. CLI maps this to a friendly error.

### CLI surface additions

| Command | Description |
|---|---|
| `lf schedule history <id>` | Phase K3. Shows the most recent N runs dispatched by the schedule (default 10, `--limit 1..50`). |
| `lf memory search <query>` | Phase N1. Full-text search over `agents.memories.content` (English tsvector, GIN index). |
| `lf memory list-entries --workflow <id>` | Phase N3. Cross-run memory rollup for a workflow. |

### Configuration

| GUC | Default | Purpose |
|---|---|---|
| `app.approval_timeout_hours` | `24` | Hours before pending approvals are auto-expired by `fn_expire_stale_approvals`. |
| `app.approval_webhook_url` | unset | Best-effort POST target for approval-pending events (Phase K2). |
| `app.moderation_webhook_url` | unset | Best-effort POST target for flagged moderation decisions (Phase O1). |

### Deprecations

None. Phases F–K are additive.

---

## v0.1 — Initial public API (2026-05-01)

The following Supabase RPC functions were promoted to the public API surface.

| Function | Description |
|---|---|
| `fn_upsert_workflow_schedule` | Creates or updates a scheduled workflow entry for a given agent and trigger configuration. |
| `fn_dispatch_scheduled_workflows_with_approval` | Dispatches all pending scheduled workflows that have passed their approval and budget gates. |
| `fn_get_workflow_schedules` | Returns all workflow schedules visible to the calling user, respecting RLS. |
| `fn_decide_tool_invocation` | Records a human or system approve/reject decision on a pending tool invocation request. |
| `fn_update_team_member_role` | Updates the role of an existing team member; restricted to team owners. |
| `fn_lensers_update_profile` | Upserts whitelisted profile fields for the authenticated lenser. |
| `fn_invoke_tool` | Initiates a tool invocation for an agent, subject to approval policy. |
| `fn_complete_tool_invocation` | Marks a tool invocation as completed and records its output. |
| `fn_approve_tool_invocation` | Grants approval for a pending tool invocation; triggers dispatch. |
| `fn_reject_tool_invocation` | Rejects a pending tool invocation and records the rejection reason. |

---

_Breaking changes to any function above will increment the minor version and appear as a new section here._
