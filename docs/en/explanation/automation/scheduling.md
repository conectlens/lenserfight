---
title: Scheduling
description: Full scheduling reference for LenserFight — creating, managing, and monitoring scheduled workflow runs, with timezone support, pause/resume, and conflict avoidance.
---

# Scheduling

Scheduling lets you run a Workflow automatically on a recurring cron expression. The LenserFight scheduler creates a new run at each scheduled time, passes in a pre-configured set of root inputs, and records the run in your history like any other run.

## Creating a schedule

```bash
lf schedule create \
  --workflow <workflow-slug> \
  --cron "<cron-expression>" \
  --timezone "<tz-name>" \
  --name "My daily digest"
```

| Flag | Required | Default | Description |
|------|---------|---------|-------------|
| `--workflow` | Yes | — | Slug of the Workflow to schedule |
| `--cron` | Yes | — | Standard 5-field cron expression |
| `--timezone` | No | `UTC` | IANA timezone name (e.g. `Europe/Istanbul`) |
| `--name` | No | — | Human-readable label for the schedule |
| `--input key=value` | No | Workflow defaults | Root inputs to pass to each run |
| `--enabled` | No | `true` | Whether the schedule is active after creation |

### Example: daily digest at 09:00 Istanbul time

```bash
lf schedule create \
  --workflow daily-digest \
  --cron "0 9 * * *" \
  --timezone "Europe/Istanbul" \
  --name "Morning digest" \
  --input audience="tech community" \
  --input tone="conversational"
```

## Cron expression reference

LenserFight uses standard 5-field cron syntax:

```
┌───── minute (0–59)
│ ┌───── hour (0–23)
│ │ ┌───── day of month (1–31)
│ │ │ ┌───── month (1–12)
│ │ │ │ ┌───── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Common patterns:

| Expression | Fires |
|-----------|-------|
| `0 9 * * *` | Every day at 09:00 |
| `0 9 * * 1-5` | Weekdays at 09:00 |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 */6 * * *` | Every 6 hours |
| `0 0 1 * *` | First of every month at midnight |
| `*/30 * * * *` | Every 30 minutes |
| `0 9,18 * * *` | At 09:00 and 18:00 daily |

## Managing schedules

```bash
# List all schedules
lf schedule list

# Show details for a specific schedule
lf schedule show <schedule-id>

# Pause a schedule (stops future runs, does not delete)
lf schedule pause <schedule-id>

# Resume a paused schedule
lf schedule resume <schedule-id>

# Update cron expression or inputs
lf schedule update <schedule-id> \
  --cron "0 10 * * 1-5" \
  --timezone "America/New_York"

# Delete a schedule (does not delete the workflow or its runs)
lf schedule delete <schedule-id>
```

## Scheduled run behaviour

Each scheduled run is treated identically to a manual run:

- It produces a `workflow_runs` record with `trigger = 'scheduled'`
- It generates node results, artifacts, and run history
- It is subject to the same retry, timeout, and failure policies as manual runs
- It can be cancelled while in progress: `lf run cancel <run-id>`

### Idempotency

Scheduled runs carry an `idempotency_key` derived from `(workflow_id, scheduled_at, rootInputsHash)`. If a run with the same key already exists, the scheduler does not create a duplicate. This prevents double-firing if the scheduler is briefly inconsistent.

### Missed runs

If the scheduler is unavailable during a scheduled window, the run is **not retried automatically**. The schedule resumes at the next cron interval. Missed runs are logged in the schedule's history with status `missed`.

```bash
# View the firing history of a schedule
lf schedule history <schedule-id>
```

## Conflict avoidance

By default, if the previous run for a schedule is still in progress when the next interval fires, the new run is **skipped** (not queued). This prevents an accumulating backlog of runs for slow workflows.

To change this behaviour:

```bash
lf schedule update <schedule-id> \
  --overlap-policy allow  # or: skip (default), queue
```

| Policy | Behaviour |
|--------|-----------|
| `skip` (default) | New run is dropped if previous is still running |
| `allow` | New run starts regardless of previous run status |
| `queue` | New run is queued and starts as soon as the previous finishes |

## Monitoring scheduled runs

```bash
# Stream logs from the most recent scheduled run
lf run logs --workflow <workflow-slug> --trigger scheduled --latest --stream

# List all runs for a workflow, filtered by trigger
lf run list --workflow <workflow-slug> --trigger scheduled

# Show run details
lf run show <run-id>
```

In the web app, the **Automation** section of your workspace shows a calendar view of past and upcoming scheduled runs, with status indicators and quick links to run details.

## Timezone support

LenserFight uses IANA timezone names (e.g. `Europe/Istanbul`, `America/New_York`, `Asia/Tokyo`). Cron expressions are evaluated in the specified timezone, including correct handling of daylight saving time transitions.

```bash
# A schedule in Istanbul time (UTC+3) at 09:00
lf schedule create \
  --workflow morning-brief \
  --cron "0 9 * * *" \
  --timezone "Europe/Istanbul"
```

> During a DST spring-forward, the 02:00 → 03:00 hour is skipped. Schedules that would have fired in the skipped hour are treated as `missed`. During a DST fall-back, the 02:00 hour repeats; the scheduler fires exactly once per wall-clock occurrence.

## Related

- [Automation Triggers](/en/explanation/automation/triggers) — All trigger types: manual, scheduled, event, API
- [Automation Workspace Overview](/en/explanation/automation/index) — Workspace structure and product layers
- [Workflow Concepts](/en/explanation/workflows/workflow-concepts) — DAG model, nodes, edges, and runs
- [Workflow Types](/en/explanation/workflows/workflow-types) — Sequential, parallel, conditional, and scheduled patterns
