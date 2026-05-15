---
title: Schedule Run History drawer
description: Recent dispatches for one schedule — timestamp, status, duration, trigger reason, and a run-id link.
---

# Schedule Run History drawer

Opened from the [Schedules Section](../schedules).

## Columns

| Column | Source |
|---|---|
| Timestamp | dispatch time |
| Status | `succeeded` / `failed` / `dispatch_failed` |
| Duration | wall-clock seconds |
| Trigger | `cron` / `manual` / `retry` |
| Run id | back-link → [Run Detail drawer](./run-detail) |

## `dispatch_failed` vs `failed`

| Status | Meaning |
|---|---|
| `dispatch_failed` | The gateway couldn't enqueue the run (assignee gone, workflow disabled, etc.) |
| `failed` | The run was enqueued and ran, but ended unsuccessfully |

When `dispatch_failed` appears, the schedule is flagged **Needs attention** in the parent list.


## Code-backed workflow

Source of truth: ScheduleRunHistoryDrawer.tsx.

1. Shows recent dispatch attempts for one schedule with status and timestamps.
2. Use it to distinguish cron timing problems from workflow execution failures.
3. Verify failed dispatches against Logs before editing workflow logic.

## Related

- [Schedules Section](../schedules)
- [Schedule drawer](./schedule)
- [Run Detail drawer](./run-detail)
