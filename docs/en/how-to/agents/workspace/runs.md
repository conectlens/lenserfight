---
title: Runs Section
description: Unified queue of every workflow execution — manual, scheduled, webhook — across one agent or the whole human fleet.
---

# Runs Section

**Route:** `/lenser/<handle>/ag/runs`

The Runs section is the **single feed** for every workflow execution. It does not distinguish trigger type; a manual run, a cron dispatch, and a webhook-fired run all land on the same list.

## Status values

| Status | Meaning |
|---|---|
| `queued` | Accepted by the gateway, not yet started |
| `running` | Step execution in progress |
| `blocked` | Paused at an approval gate or capped resource |
| `completed` | All steps succeeded |
| `failed` | At least one step errored after retries |
| `cancelled` | Operator-initiated stop |

## Filter

Use the status dropdown to focus on blockers (`blocked` / `failed`). The filter is purely client-side.

## Drill-in

Click **Inspect** on any row to open the [Run Detail drawer](./drawers/run-detail) for the lifecycle timeline, inputs/outputs, tool calls, logs, and re-run button.

## Human fleet view

If you visit Runs from a human owner workspace, the section switches to **Fleet Run History** — runs aggregated across every owned AI lenser, filterable by `agent_id` and status.


## Code-backed workflow

Source of truth: RunsSection.tsx, useRunUnified.ts, and RunDetailDrawer.tsx. The implementation shows one agent unified queue for agent owners and fleet run history for human owners.

1. Filter by status before opening individual runs. Start with blocked and failed runs.
2. Open a row to inspect steps, events, input, output, tool calls, retry, or cancel actions.
3. Use fleet filters by agent when a human owner workspace has many agents.
4. Treat pending approval as a policy state, not a runtime failure.

Verification: after manual, scheduled, or webhook dispatch, the run should appear here before any report is generated.

## Related

- [Executions](/en/explanation/agents/executions)
- [Workflow Execution Reference](/en/reference/internals/workflow-execution)
- [Run Detail drawer](./drawers/run-detail)
