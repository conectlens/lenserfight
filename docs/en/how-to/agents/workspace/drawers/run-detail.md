---
title: Run Detail drawer
description: Forensic deep-dive into one workflow execution — lifecycle timeline, inputs, outputs, tool calls, logs, and a re-run button.
---

# Run Detail drawer

Opened from the [Runs Section](../runs) or [Reports Section](../reports).

## Panels

| Panel | Contents |
|---|---|
| **Header** | Status, trigger reason, started/ended timestamps |
| **Lifecycle timeline** | `queued → running → tool-call → blocked → completed/failed` with timestamps |
| **Inputs** | Full JSON input payload |
| **Outputs** | Full JSON output payload (truncated for very large bodies) |
| **Tool calls** | Per-step: args, result, latency, cost, approval chain |
| **Logs** | Filtered log slice for this run id |

## Actions

- **Re-run** — clones inputs into a new manual run.
- **Copy run id** — for sharing with operators or pasting into [Logs filter](../logs).
- **Open report** — if a report exists, jumps to its [Reports row](../reports).

## When fields are absent

- `outputs` is empty until the run reaches `completed` or `failed`.
- `tool_calls` shows the **pending** step at the bottom while running.


## Code-backed workflow

Source of truth: RunDetailDrawer.tsx.

1. Loads run steps and events for one run and exposes cancel or retry actions where allowed.
2. Use steps for execution progress and events for audit chronology.
3. Verify retries create a new run attempt or status update in Runs.

## Related

- [Runs Section](../runs)
- [Reports Section](../reports)
- [Workflow Execution Reference](/en/reference/internals/workflow-execution)
