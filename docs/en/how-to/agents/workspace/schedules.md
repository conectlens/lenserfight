---
title: Schedules Section
description: Cron-driven workflow triggers — each entry pins a workflow, cron expression, timezone, assignee, and JSON inputs template.
---

# Schedules Section

**Route:** `/lenser/<handle>/ag/schedules`

The Schedules section governs **cron-driven workflow dispatch**. A schedule says: *"run this workflow on this cron, in this timezone, with these inputs, dispatched by this assignee."*

## Row contents

| Column | Meaning |
|---|---|
| Workflow | Linked workflow title |
| Cron | 5-field cron expression |
| Timezone | IANA name — cron is evaluated in this zone |
| Assignee | Agent or team that runs the workflow |
| Last/Next | Most recent dispatch + projected next fire |
| Status | `Healthy` / `Needs attention` |

## Actions

- **New schedule** → opens the [Schedule drawer](./drawers/schedule).
- **Pause** → toggles `is_active` without deleting.
- **History** → opens the [Schedule Run History drawer](./drawers/schedule-run-history).
- **Delete** → confirmation-gated removal.

## Health flag

A schedule is flagged **Needs attention** when its most recent dispatch failed (`last_dispatch_status = 'dispatch_failed'`). Fix by inspecting the run trace, then resume.


## Code-backed workflow

Source of truth: SchedulesSection.tsx, ScheduleDrawer.tsx, and ScheduleRunHistoryDrawer.tsx. The implementation pins workflow, cron expression, timezone, assignee, and JSON input template for dispatch.

1. Create or fork a workflow before adding a schedule. The New Schedule button is disabled without workflows.
2. Use pause when you need to stop dispatch temporarily without losing configuration.
3. Open Run History to inspect previous dispatches and failures.
4. Delete only when the trigger should not come back.

Verification: a valid schedule should appear in the list, dispatch at the expected timezone-aware time, and record each attempt in run history.

## Related

- [Scheduling Reference](/en/reference/internals/scheduling)
- [Cron Scheduling Tutorial](/en/tutorials/agent-walkthroughs/cron-scheduling)
- [Cron Expressions Reference](/en/reference/cron-expressions)
- [Schedule drawer](./drawers/schedule)
