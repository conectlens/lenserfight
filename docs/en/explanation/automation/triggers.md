---
title: Automation Triggers
description: How LenserFight automation can be triggered — manually, on a schedule, by an event, or via the API — and which trigger type fits each use case.
---

# Automation Triggers

A trigger is what starts a Workflow run or automation job. LenserFight supports four trigger types: **manual**, **scheduled**, **event-based**, and **API**. Each type has different guarantees, latency characteristics, and configuration requirements.

## Manual triggers

A manual trigger starts a run immediately on demand. This is the default and is available for every Workflow.

```bash
# Run a workflow manually from the CLI
lf run workflow <workflow-slug>

# Provide root inputs at run time
lf run workflow <workflow-slug> \
  --input topic="AI in healthcare" \
  --input tone="formal"

# Run and stream results to stdout
lf run workflow <workflow-slug> --stream
```

**Use when**: you want to run a Workflow on demand, test a pipeline, or trigger a one-off task without setting up a schedule.

## Scheduled triggers

A scheduled trigger fires on a **cron expression**. The scheduler creates a new run at each interval and passes a pre-configured set of root inputs.

```bash
# Create a scheduled trigger
lf schedule create \
  --workflow daily-digest \
  --cron "0 9 * * 1-5" \
  --timezone "Europe/Istanbul"

# List all scheduled triggers
lf schedule list

# Pause a schedule
lf schedule pause <schedule-id>

# Resume a schedule
lf schedule resume <schedule-id>

# Delete a schedule (does not delete the workflow)
lf schedule delete <schedule-id>
```

**Cron syntax reference**:

```
┌───── minute (0–59)
│ ┌───── hour (0–23)
│ │ ┌───── day of month (1–31)
│ │ │ ┌───── month (1–12)
│ │ │ │ ┌───── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Common examples:

| Expression | Meaning |
|-----------|---------|
| `0 9 * * 1-5` | Every weekday at 09:00 |
| `0 */6 * * *` | Every 6 hours |
| `0 0 1 * *` | First day of each month at midnight |
| `*/15 * * * *` | Every 15 minutes |

**Use when**: the task should run on a recurring, time-based schedule without manual intervention.

## Event-based triggers

An event trigger fires when a specific platform event occurs. LenserFight emits events from user actions, workflow completions, and external webhooks.

| Event type | Fires when |
|-----------|-----------|
| `workflow.completed` | A workflow run finishes successfully |
| `workflow.failed` | A workflow run fails after all retries |
| `lens.published` | A Lens is published to the directory |
| `community.joined` | A Lenser joins a community |
| `webhook.received` | An external HTTP POST arrives at your webhook endpoint |

```bash
# Register a webhook endpoint
lf webhook create \
  --url https://your-service.com/hooks/lenserfight \
  --events workflow.completed,workflow.failed

# List registered webhooks
lf webhook list

# View recent webhook delivery logs
lf webhook logs <webhook-id>
```

Event triggers are configured in the Automation Workspace and can be chained: a `workflow.completed` event from Workflow A can trigger Workflow B automatically.

**Use when**: downstream actions should happen automatically in response to platform activity, without polling or manual intervention.

## API triggers

An API trigger fires a Workflow run via a REST or CLI call from an external system. This is how SaaS integrations, CI pipelines, and third-party automations start runs on LenserFight.

```bash
# Trigger a run via the REST API
curl -X POST https://api.lenserfight.com/v1/runs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_slug": "my-workflow",
    "inputs": {
      "topic": "product launch",
      "tone": "marketing"
    }
  }'
```

API triggers require an **organisation token** or **personal access token** with `runs:write` scope. They return a `run_id` that you can poll for status.

```bash
# Check run status via CLI
lf run status <run-id>

# Stream logs for a run in progress
lf run logs <run-id> --stream
```

**Use when**: an external system needs to initiate a workflow run — CI/CD pipelines, SaaS hooks, Zapier-style automations, or custom integrations.

## Trigger comparison

| Trigger | Latency | Recurring | External access | Config required |
|---------|---------|-----------|----------------|----------------|
| Manual | Immediate | No | No | None |
| Scheduled | Cron-based | Yes | No | Cron expression + inputs |
| Event | Near-real-time | Yes | Optional | Event type + subscription |
| API | Immediate | No (per call) | Yes | Token + endpoint |

## Related

- [Scheduling](/en/explanation/automation/scheduling) — Full scheduling configuration and management
- [Automation Workspace Overview](/en/explanation/automation/index) — Product layers and workspace structure
- [Workflow Concepts](/en/explanation/workflows/workflow-concepts) — DAG model, nodes, edges, and runs
- [Platform API: Tokens](/en/reference/platform-api/tokens) — API token scopes and management
