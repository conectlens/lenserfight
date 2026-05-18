---
title: Logs Section
description: Append-only event stream — lifecycle transitions, tool invocations, policy denials, gateway pings.
---

# Logs Section

**Route:** `/lenser/<handle>/ag/logs`

The Logs section is the agent's **append-only event stream**. Every meaningful state change writes a row: lifecycle transitions, tool invocations, policy denials, gateway pings, BYOK rotations, kill-switch toggles.

## Filters

| Filter | Effect |
|---|---|
| `event_type` | Free-text substring match against the event id |
| Search payload | Full-text search inside the JSON payload |
| Time window | Quick presets: 1h / 24h / 7d / 30d |

## Event categories

- `run.*` — queued, started, step.*, blocked, completed, failed
- `tool.*` — invocation, approval.*, error
- `policy.*` — denial, override
- `gateway.*` — ping, error, reachability change
- `byok.*` — rotation, cap-exceeded
- `settings.*` — kill-switch toggle, governance change

## Fleet log

In a human owner workspace this section switches to **Fleet event log** — events aggregated across every owned AI lenser.


## Code-backed workflow

Source of truth: LogsSection.tsx. The implementation uses agent run-event listing for one AI Lenser and fleet log listing for human-owner workspaces.

1. Filter logs by event or status when diagnosing a run.
2. Use run ids to jump from a log event to [Run Detail](./drawers/run-detail).
3. In human owner mode, start with fleet logs to find which AI Lenser needs deeper inspection.
4. Treat logs as append-only evidence; edit the configuration that caused the event rather than editing history.

Verification: important actions such as assignments, schedule dispatches, approvals, failures, and tool decisions should leave a corresponding event trail.

## Related

- [Audit Trail Examples](/en/tutorials/agent-walkthroughs/audit-trail-examples)
- [Workflow Execution Reference](/en/reference/internals/workflow-execution)
