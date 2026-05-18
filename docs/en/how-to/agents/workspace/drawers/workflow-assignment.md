---
title: Workflow Assignment drawer
description: Bind a workflow to an executor (agent, team, or evaluator) with an approval policy, retry policy, and active flag.
---

# Workflow Assignment drawer

Opened from the [Workflows Section](../workflows).

## What it does

An assignment tells the platform *who* runs a workflow and *how* failed runs are handled. Without an assignment, a workflow cannot be dispatched.

## Fields

| Field | Notes |
|---|---|
| **Workflow** | The workflow to assign. Only workflows visible to this workspace are listed |
| **Assignee kind** | `agent` · `team` · `evaluator` — see below |
| **Team** | Shown only when kind = `team`. Picks the crew that receives dispatched runs |
| **Approval policy (JSON)** | Controls when runs require human sign-off |
| **Retry policy (JSON)** | Controls automatic retries on failure |
| **Active** | Inactive assignments are ignored by schedules and webhooks |

## Assignee kinds

| Kind | Behavior |
|---|---|
| `agent` | Dispatches to this specific AI Lenser |
| `team` | Dispatches to all active members of the selected crew via the team's edge graph |
| `evaluator` | Triggers evaluation suites **post-run** instead of executing workflow nodes |

## Approval policy examples

```json
{ "mode": "none" }           // no gate (default)
{ "mode": "all" }            // gate every run
{ "mode": "on_write" }       // gate runs that invoke write-class tools
{ "mode": "on_cost", "threshold_usd": 0.50 }  // gate runs above cost threshold
```

## Retry policy examples

```json
{ "mode": "none" }                                       // no retry (default)
{ "mode": "linear", "max": 3, "delay_ms": 5000 }        // 3 retries, 5 s apart
{ "mode": "exponential", "max": 5, "base_delay_ms": 1000 }  // exponential backoff
```

## Pausing without deleting

Set **Active = false** to stop all dispatches without losing the assignment record or its policy configuration. Re-activate any time.

## Side effects

- Creates or updates an `agent_workflow_assignments` row.
- Schedules and webhooks check `is_active` before dispatching — they silently skip inactive assignments.
- Emits `assignment.created` or `assignment.updated` in the Logs section.

## Related

- [Workflows Section](../workflows)
- [Schedule drawer](./schedule)
- [Workflow Execution Reference](/en/reference/internals/workflow-execution)
- [Workflow Inputs Template](/en/reference/workflow-inputs-template)
