---
title: Schedule drawer
description: Create or edit a cron-driven workflow schedule — workflow, cron expression, timezone, assignee, inputs template.
---

# Schedule drawer

Opened from the [Schedules Section](../schedules).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Workflow** | yes | Picker of workflows owned by this workspace |
| **Cron expression** | yes | 5-field standard cron, validated client-side |
| **Timezone** | yes | IANA name (`Europe/London`, …); cron evaluated in this zone |
| **Assignee type** | yes | `agent` or `team` |
| **Assignee id** | yes | The agent or team that runs the workflow |
| **Inputs template** | no | JSON merged into every dispatch — see [Workflow Inputs Template](/en/reference/workflow-inputs-template) |
| **Active** | yes (default ✓) | Toggle to pause without deleting |

## Cron tips

| You want | Expression |
|---|---|
| Every 5 minutes | `*/5 * * * *` |
| Every weekday at 09:00 | `0 9 * * 1-5` |
| First of the month | `0 0 1 * *` |

Full syntax: [Cron Expressions Reference](/en/reference/cron-expressions).

## Side effects

- Upserts a `workflow_schedules` row.
- Recomputes `next_fire_at` from the cron + timezone.
- Invalidates schedules cache.


## Code-backed workflow

Source of truth: ScheduleDrawer.tsx.

1. Create or edit workflow, cron expression, timezone, assignee, active state, and JSON input template.
2. The drawer validates cron, timezone, and JSON before save.
3. Verify dispatch attempts in Schedule Run History and Runs.

## Related

- [Schedules Section](../schedules)
- [Schedule Run History drawer](./schedule-run-history)
- [Scheduling Reference](/en/reference/internals/scheduling)
- [Cron Scheduling Tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling)
