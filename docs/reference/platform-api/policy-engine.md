---
title: "Policy Engine"
description: "Reference for the pre-run policy gate — evaluation points, policy types, verdict semantics, the fn_evaluate_pre_run_policy RPC, and the audit log."
---

# Policy Engine

The policy engine is a **pre-run gate**. Before any team run dispatches, `fn_evaluate_pre_run_policy` reads `workspace_settings` for the AI lenser's workspace, walks a priority-ordered list of conditions, and emits a verdict. If the verdict is not `allow`, no agent step executes and the denial is recorded in `agents.policy_evaluations`.

All `policy_evaluations` rows are **INSERT-only**. They are an audit log — existing rows are never updated or deleted.

---

## Evaluation points

| Point | When it fires | Triggered by |
|-------|-------------|-------------|
| `pre_run` | Before a team run is dispatched | `useTeamRunDispatch`, CLI `lf run exec` |
| `pre_tool_invocation` | Before a write-class tool call executes | `fn_invoke_tool` (write egress only) |
| `budget_check` | Periodically during a long run to detect mid-run overruns | Internal scheduler, configurable interval |

---

## Policy types

| Policy type | Trigger condition | Verdict |
|-------------|-----------------|---------|
| `kill_switch` | `workspace_settings.kill_switch_active = true` for this lenser | `deny` |
| `runner_pause` | `workspace_settings.runner_paused = true` for this lenser | `pause` |
| `budget_ceiling` | `SUM(cost_estimate) for period >= workspace_settings.budget_ceiling_usd` | `deny` |
| `max_parallel_runs` | `COUNT(active team_runs) >= workspace_settings.max_parallel_runs` | `deny` |
| `dark_launch` | Dark launch enabled AND `md5(workflow_id)::int % 100 >= dark_launch_percentage` | `deny` |
| `require_approval` | A pending approval record exists for this lenser or workflow | `require_approval` |
| `allow` | No condition matched | `allow` |

---

## PolicyEvaluationRecord DTO

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | Immutable row identifier |
| `ai_lenser_id` | `uuid` | The AI lenser being evaluated |
| `team_run_id` | `uuid \| null` | The team run being checked, if applicable |
| `tool_invocation_id` | `uuid \| null` | The tool invocation being checked, if applicable |
| `evaluation_point` | `text` | `pre_run`, `pre_tool_invocation`, or `budget_check` |
| `policy_type` | `text` | The policy that produced this verdict (see table above) |
| `verdict` | `text` | `allow`, `deny`, `pause`, or `require_approval` |
| `reason` | `text` | Human-readable reason string (e.g. `kill_switch_active`) |
| `context` | `jsonb` | Snapshot of relevant settings values at evaluation time |
| `evaluated_at` | `timestamptz` | When the evaluation ran |

---

## Verdicts

| Verdict | Meaning |
|---------|---------|
| `allow` | All checks passed. Run proceeds normally. |
| `deny` | A blocking condition was found. The run is not started. A `policy_evaluations` row is inserted with the reason. |
| `pause` | The lenser's lenser is paused. New dispatch is halted; active runs complete. |
| `require_approval` | A human approval step must complete before the run can proceed. The run enters `pending_approval` status. |

---

## RPC: `fn_evaluate_pre_run_policy`

```sql
SELECT verdict, reason
FROM fn_evaluate_pre_run_policy(
  p_ai_lenser_id := '<lenser-uuid>',
  p_workflow_id  := '<workflow-uuid>',
  p_context      := '{"source": "cli"}'::jsonb
);
```

**Returns:** `TABLE(verdict text, reason text)`

The function also inserts a `policy_evaluations` row for every call, regardless of verdict. This ensures that `allow` decisions are also auditable.

**Signature:**

```sql
CREATE OR REPLACE FUNCTION fn_evaluate_pre_run_policy(
  p_ai_lenser_id  uuid,
  p_workflow_id   uuid,
  p_context       jsonb DEFAULT '{}'
)
RETURNS TABLE(verdict text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER;
```

### CLI equivalent

```bash
lf policy check <handle> --workflow <workflow-id>
```

Example output:

```
Policy check for lenser @my-lenser, workflow wf_abc123
  ✓ kill_switch    not active
  ✓ runner_pause   not paused
  ✓ budget_ceiling $12.40 / $100.00
  ✓ parallel_runs  2 / 5 active
  ✓ dark_launch    not configured
─────────────────────────────────────
  verdict: allow
```

---

## Immutability

`policy_evaluations` rows are written once and never modified. The table does not have `UPDATE` or `DELETE` grants for the `authenticated` role. Operators can read the full evaluation history to reconstruct exactly what the engine saw at any given dispatch time.

---

## Related

- [Autonomous Agent OS](/explanation/agents/autonomous-agent-os) — evaluation priority order and governance controls
- [Run Reports & Incidents](/reference/platform-api/run-reports) — what happens after a deny verdict
- [Agent Lifecycle Commands (Phase 8)](/reference/cli/agent-lifecycle) — `lf policy log` and `lf policy stats`
- [Using the Kill Switch](/how-to/kill-switch) — operator guide for immediate shutdown
