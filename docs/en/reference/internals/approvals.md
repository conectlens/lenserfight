---
title: Approvals
description: How owner approval gates work for autonomous agent teams. The queue is materialized from agents.team_runs into agents.approval_requests_v and resolved through fn_decide_approval.
---

# Approvals

Approvals keep the human Lenser authoritative over autonomous agent execution. Whenever a team run touches a sensitive action — publishing output, spending credits, sending external messages, modifying schedules, deleting data — the engine pauses and creates a pending entry that the owner resolves.

The **queue is not a separate table**. It is a projection of [`agents.team_runs`](./domain-model#agents-team-runs) with `approval_status='pending'`, materialized as `agents.approval_requests_v` and resolved through `fn_decide_approval`.

## Approval shape

Today, every approval gate is one row in `agents.team_runs`:

| Column                       | Approval semantics                                                           |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `id`                         | Approval request id                                                          |
| `ai_lenser_id`               | Whose ownership applies                                                      |
| `team_id`                    | Which team produced the request                                              |
| `workflow_id`                | Which workflow                                                               |
| `workflow_run_id`            | Underlying workflow run (when one exists)                                    |
| `workflow_assignment_id`     | Which assignment dispatched this run                                         |
| `status`                     | `queued / running / completed / failed / cancelled / blocked`                |
| `approval_status`            | `'pending' \| 'approved' \| 'rejected' \| 'not_required'`                    |
| `metadata`                   | jsonb — gate `kind`, requested permission, requester agent id, action target |
| `started_at`, `completed_at` | Run timing                                                                   |

The decision is mutated atomically through `fn_decide_approval`: the RPC updates `approval_status`, appends the decision metadata, and writes `agents.agent_run_events` for the approval outcome.

## Mandatory gates

These actions **always require owner approval** regardless of the team's autonomy level:

| Gate                 | Triggers when                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `create_agent`       | A team proposes spawning a new Agent Lenser                                                    |
| `add_team_member`    | A team proposes adding a member to itself or another team                                      |
| `grant_lens`         | A team proposes binding a new lens to an agent (`agents.lens_bindings`)                        |
| `grant_tool`         | A team proposes adding to a `tool_profile.allow_tools` set                                     |
| `grant_model`        | A team proposes binding a new model to an agent                                                |
| `publish_output`     | A team proposes publishing content publicly (`visibility='public'`)                            |
| `external_message`   | A team proposes sending email / Slack / webhook to an outside system                           |
| `paid_provider_call` | A team proposes calling a paid model when `support_level='byok_only'` and no key is configured |
| `spend_threshold`    | Run-level cost projection exceeds `agents.policies.spending_limit_credits`                     |
| `delete_data`        | A team proposes deleting a lens / workflow / run / asset                                       |
| `modify_schedule`    | A team proposes editing or pausing/resuming a CRON schedule                                    |
| `expand_permissions` | A team proposes broadening `permission_scope` on `agents.ownerships`                           |

The list above is the **default**. Owners can extend gates per-assignment via `approval_policy.gates: string[]`, but they cannot remove the default set.

## Approval flow

```mermaid
sequenceDiagram
    participant C as CRON / Caller
    participant E as Engine
    participant H as Human Owner
    participant DB as agents.* + lenses.*

    C->>E: dispatch run
    E->>DB: insert workflow_run + team_run<br/>approval_status='pending'
    E->>H: surface in approval queue (UI / email)
    alt Owner approves
      H->>DB: UPDATE team_runs SET approval_status='approved'
      DB->>E: row event
      E->>E: claim run; execute nodes
      E->>DB: agent_run_events: 'approval_granted'
    else Owner rejects
      H->>DB: UPDATE team_runs SET approval_status='rejected'
      DB->>E: row event
      E->>DB: workflow_run.status='failed', team_run.status='failed'
      E->>DB: agent_run_events: 'approval_rejected'
    else Timeout (configurable)
      E->>DB: workflow_run.status='timed_out', team_run.status='cancelled'
      E->>DB: agent_run_events: 'approval_timed_out'
    end
```

## Decision audit fields

Today, an approval decision writes:

1. `agents.team_runs.approval_status` — final state.
2. `agents.team_runs.metadata` — append `decision_at`, `decision_by_lenser_id`, `decision_reason` (free text), `decision_modifications` (jsonb diff).
3. `agents.agent_run_events` — one row with `event_type IN {approval_granted, approval_rejected, approval_modified}`, `payload` carrying the snapshot above.

Combined, these answer the audit questions:

- **Who approved?** `metadata.decision_by_lenser_id`.
- **When?** `metadata.decision_at`.
- **Why?** `metadata.decision_reason`.
- **Did the approver modify the request?** `metadata.decision_modifications`.

## Approve / reject / modify

Three decision types are supported:

| Decision               | Effect                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Approve**            | `approval_status='approved'`. Engine claims the run with the original payload.                                                                      |
| **Reject**             | `approval_status='rejected'`. Run terminates with status `failed`.                                                                                  |
| **Modify and approve** | `approval_status='approved'` plus an inputs override on `team_runs.metadata.decision_modifications`. Engine claims the run with the merged payload. |

The modify path is how owners safely scope an over-broad request (e.g., reduce token budget, narrow audience, swap model).

## Decision walkthrough

### Approve

```bash
lf approval approve <approval-id>
```

What happens in the database:

1. `agents.team_runs.approval_status` → `'approved'`
2. `agents.team_runs.metadata` receives `decision_at`, `decision_by_lenser_id`
3. `agents.agent_run_events` gets one row with `event_type='approval_granted'`
4. The engine picks up the run on its next poll cycle (within seconds) and begins node execution

The run proceeds with the **original dispatch inputs**.

---

### Reject

```bash
lf approval reject <approval-id> --reason "Holiday — skip today"
```

What happens in the database:

1. `agents.team_runs.approval_status` → `'rejected'`
2. `agents.team_runs.status` → `'failed'`
3. `agents.team_runs.metadata` receives `decision_at`, `decision_by_lenser_id`, `decision_reason`
4. `lenses.workflow_runs.status` → `'failed'`
5. `agents.agent_run_events` gets one row with `event_type='approval_rejected'`

The run terminates. No nodes execute. No memory is written.

---

### Modify and approve

Use this when the dispatch inputs are correct in shape but wrong in value — for example, the scheduled run would use a stale topic or an overly broad audience.

```bash
lf approval approve <approval-id> \
  --modifications '{"inputs": {"topic": "revised topic for today"}}'
```

What happens in the database:

1. `agents.team_runs.approval_status` → `'approved'`
2. `agents.team_runs.metadata` receives `decision_at`, `decision_by_lenser_id`, `decision_modifications` (the JSON diff)
3. `agents.agent_run_events` gets one row with `event_type='approval_modified_and_approved'`
4. The engine merges `decision_modifications` into the run's input payload before claiming the run — the original `inputs_template` from the schedule is overridden by the modification

The run proceeds with the **merged inputs**. The override is recorded in the audit trail and is visible in the run's event log.

---

## CRON-triggered runs

A scheduled dispatch follows the same flow. The schedule's `approval_policy` is the source of truth — even if the team's default policy is `autonomous_with_gates`, a schedule with `requiresApproval=true` blocks on approval.

This makes the rule **CRON cannot bypass approvals** mechanically true: the engine never reads the trigger source when deciding to gate.

## Timeout behavior

Approval timeout is enforced by the `expire-stale-approvals` pg_cron job, which runs every 5 minutes. Pending `team_runs` older than the configured threshold are atomically transitioned:

- `agents.team_runs.approval_status` → `'timed_out'`
- `agents.team_runs.status` → `'cancelled'`
- `lenses.workflow_runs.status` → `'timed_out'` (when the run was created)
- `agents.agent_run_events` row appended with `event_type='approval_timed_out'`
- `agents.team_runs.metadata` receives `timed_out_at` and the effective `timeout_hours`

The threshold is set via the `app.approval_timeout_hours` Postgres GUC. Default is 24 when unset:

```sql
ALTER DATABASE postgres SET app.approval_timeout_hours = 12;
```

No auto-approval mode is offered. Timeout means the run is abandoned, not self-approved.

The expiry job uses `FOR UPDATE SKIP LOCKED` so concurrent firings cannot double-write the same row, and rows already in a terminal state are skipped on subsequent passes.

To force-expire stale items between cron firings, an operator can call the function directly:

```sql
SELECT public.fn_expire_stale_approvals();
```

To reject a specific stale request manually before the timeout fires:

```bash
lf approval list --status pending
lf approval reject <stale-request-id> --reason "Holiday — skip today"
```

## Pending-approval webhook

When `app.approval_webhook_url` is configured, every newly-created pending approval fires a best-effort POST to that URL via `pg_net`. The payload version is `1`:

```json
{
  "webhook_version": 1,
  "event": "approval_pending",
  "team_run_id": "…",
  "ai_lenser_id": "…",
  "team_id": "…",
  "workflow_id": "…",
  "workflow_run_id": "…",
  "workflow_assignment_id": "…",
  "gate_kind": "publish_output",
  "requested_action": "…",
  "pending_since": "2026-05-08T14:32:01Z"
}
```

Headers: `Content-Type: application/json`, `X-Lenserfight-Webhook: approval_pending`, `X-Lenserfight-Version: 1`.

Configure with:

```sql
ALTER DATABASE postgres SET app.approval_webhook_url = 'https://example.com/approvals';
```

**Delivery semantics:** Best-effort, single-attempt, fire-and-forget through `pg_net`. The authoritative state is the database; the webhook is a notification courtesy. Operators who need at-least-once delivery should poll `agents.approval_requests_v` and reconcile against their own state.

## What approvals do NOT cover today

- **Pre-emptive approval of an entire schedule** — there is no row to approve before the first run dispatches. Owners express this intent by configuring the schedule with `is_active=false` until they are ready, then activating.
- **Sliding-window approvals** — there is no "approve any run in the next 24h" surface. Each run is approved individually.
- **Multi-approver workflows** — a single owner / co-owner decision is final. M-of-N is not modelled.

## RLS posture

[`agents.can_manage_ai_lenser()`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L92) gates every read and write of approval data. Only the owner or co-owner of the AI workspace can:

- See pending requests (read via `agents.approval_requests_v` or the bootstrap/fleet views).
- Resolve requests through `fn_decide_approval`.

## Future work

The following are **Proposed (not yet implemented)**:

- **Queue enrichment** — extend `agents.approval_requests_v` with more derived fields, filters, and notification-ready payloads:

  ```sql
  CREATE OR REPLACE VIEW agents.approval_requests_v AS
  SELECT
    tr.id AS request_id,
    tr.ai_lenser_id,
    tr.team_id,
    tr.workflow_id,
    tr.workflow_assignment_id,
    tr.metadata->>'gate_kind' AS gate_kind,
    tr.metadata->>'requested_action' AS requested_action,
    tr.metadata->>'requester_agent_id' AS requester_agent_id,
    tr.created_at AS requested_at,
    wa.assignee_kind,
    wa.approval_policy,
    w.title AS workflow_title
  FROM agents.team_runs tr
  LEFT JOIN agents.workflow_assignments wa ON wa.id = tr.workflow_assignment_id
  LEFT JOIN lenses.workflows w ON w.id = tr.workflow_id
  WHERE tr.approval_status = 'pending'
    AND agents.can_manage_ai_lenser(tr.ai_lenser_id);
  ```

- **Approval UI refinement** — the dedicated `/lenser/:handle/ag/approvals` section ships today, but still needs richer diffing, filtering, and queue analytics.
- **Notification fan-out** — an `agents.agent_run_events` listener that pushes pending requests to the human owner via the notification service ([libs/data/repositories/src/lib/services/notificationService.ts](../../libs/data/repositories/src/lib/services/notificationService.ts)).
- **Per-schedule approval timeout override** — `approval_policy.timeoutMinutes` on a single workflow assignment to override the database-wide `app.approval_timeout_hours` GUC. The global timeout ships in Phase K1; per-assignment overrides remain proposed.
- **Audit event for bypass attempts** — ✓ Shipped (Phase G). When `requiresApproval=false` is set on an active schedule, an `approval_bypass_attempted` row is inserted into `agents.action_logs`.
