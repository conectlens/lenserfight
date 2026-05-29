---
title: Schedule Trigger
description: Fires the workflow automatically on a recurring cron schedule.
---

# Schedule Trigger

## Overview

The Schedule Trigger node starts a workflow at fixed intervals defined by a standard five-part cron expression. LenserFight evaluates the expression in the configured timezone and enqueues a run each time the schedule fires. When a scheduled run is already in progress and the next tick arrives, the platform respects `max_concurrent_runs` to decide whether to skip or queue the new run. This node is always the first node in the graph.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `cron` | string | Yes | — | Five-part cron expression (`minute hour day-of-month month day-of-week`). Example: `"0 9 * * 1"` runs every Monday at 09:00. |
| `timezone` | string | No | `"UTC"` | IANA timezone name used to resolve the cron expression. Example: `"America/New_York"`. |
| `enabled` | boolean | No | `true` | Set to `false` to pause the schedule without deleting the node. |
| `max_concurrent_runs` | integer | No | `1` | Maximum number of in-progress runs allowed at the same time. Incoming ticks are dropped when the limit is reached. |

## Inputs

This node has no upstream inputs — it is the workflow entry point.

| Port | Type | Description |
|---|---|---|
| — | — | No inputs; this node initiates the run. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `scheduled_at` (ISO-8601 timestamp of the tick that triggered this run) and `timezone` (the resolved timezone string). |

## Example

```json
{
  "nodeType": "schedule_trigger",
  "config": {
    "cron": "0 9 * * 1",
    "timezone": "Europe/Istanbul",
    "enabled": true,
    "max_concurrent_runs": 1
  }
}
```

## Notes

- Cron expressions follow the POSIX convention: fields are `minute hour day month weekday`. Seconds are not supported.
- If `enabled` is set to `false` the schedule is suspended but all history and configuration is retained; set it back to `true` to resume.
- Setting `max_concurrent_runs` above `1` is useful for idempotent workflows (e.g. read-only reporting) but should be used cautiously for workflows that write state, to avoid race conditions.
- The platform guarantees at-least-once delivery per tick but does not guarantee exactly-once; design downstream nodes to be idempotent.
