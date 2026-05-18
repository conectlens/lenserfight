---
title: Trigger Nodes | Workflow Node Reference
description: Reference for all Trigger nodes in LenserFight Workflow Studio. Every workflow must begin with exactly one active trigger.
---

# Trigger Nodes

Trigger nodes start a workflow. Every workflow must have exactly one active trigger node. Triggers produce a root payload that downstream nodes can reference.

| Node | Type | Output | Environments |
|------|------|--------|-------------|
| [Manual Trigger](#manual-trigger) | `manual_trigger` | `json` | browser, worker |
| [Schedule Trigger](#schedule-trigger) | `schedule_trigger` | `json` | scheduled, worker, server |
| [Webhook Trigger](#webhook-trigger) | `webhook_trigger` | `json` | server, worker |
| [Event Trigger](#event-trigger) | `event_trigger` | `json` | worker, server |
| [Form / Input Trigger](#form-input-trigger) | `form_input_trigger` | `json` | browser |

---

## Manual Trigger {#manual-trigger}

**Type:** `manual_trigger` · **Category:** Trigger

Start a workflow manually with optional root inputs. Used for on-demand runs, ad hoc queries, and development testing.

### When to Use

Use Manual Trigger when you want a human to initiate a workflow from the Studio interface or CLI, optionally supplying a typed payload (e.g. a search query, a document id, a set of parameters).

### Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `trigger` | `void` | No | No upstream input required — this node starts the graph. |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `rootInputs` | `json` | Root inputs supplied by the user: `{ query: text, payload: json }` |

### Optional Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inputSchema` | `json` | — | JSON schema describing the expected input payload. When provided, the Studio renders a typed form. |

### Example

```json
{
  "inputSchema": { "query": { "type": "string", "required": true } }
}
```

**Expected input:** *(empty — user fills the form)*

**Expected output:** `{ "rootInputs": { "query": "Which battle strategy won most often this week?" } }`

**Downstream:** → `rag_retrieval` with `{ "query": "$.rootInputs.query" }`

### Valid Connections

→ Any node that accepts `json` or `any` input: Logic, Data, AI Primitive, Battle, Storage, Communication.

### Invalid Connections

✗ Cannot be a downstream node — triggers must be the graph root.

✗ Cannot connect to another trigger.

### Execution Notes

- The trigger fires once per manual invocation.
- `inputSchema` is validated before the workflow starts; mismatched types fail early.

### Troubleshooting

- **"No input form shown"** — add an `inputSchema` to enable the typed form.
- **"Schema validation failed"** — check that your input matches the declared types and required fields.

### Related Nodes

[Schedule Trigger](#schedule-trigger) · [Webhook Trigger](#webhook-trigger) · [Event Trigger](#event-trigger) · [Workflow Studio](/en/how-to/agents/workspace/workflows) · [Node Catalog](./)

---

## Schedule Trigger {#schedule-trigger}

**Type:** `schedule_trigger` · **Category:** Trigger

Start a workflow on a cron schedule or interval. Used for periodic digest generation, data sync, alerting, and automation.

### When to Use

Use Schedule Trigger for any recurring workflow — weekly digests, hourly data pulls, daily leaderboard refreshes, or monthly reports.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `trigger` | `void` | No — no upstream input |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `schedule` | `json` | `{ firedAt: text, timezone: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `cron` | `string` | Cron expression defining the schedule (e.g. `0 8 * * MON`). |

### Optional Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timezone` | `string` | `UTC` | IANA timezone name (e.g. `Europe/Istanbul`). |

### Example

```json
{
  "cron": "0 8 * * MON",
  "timezone": "Europe/Istanbul"
}
```

**Scenario:** Generate a Monday morning arena digest.

**Expected output:** `{ "firedAt": "2026-05-18T08:00:00+03:00", "timezone": "Europe/Istanbul" }`

**Downstream:** → `supabase_query` with `{ "since": "$.firedAt" }`

### Execution Notes

- Runs in the `scheduled` / `worker` / `server` environment — not available in browser-only execution.
- `$.firedAt` is an ISO 8601 string you can use in downstream date filters.
- Cron uses standard five-field syntax (minute, hour, day-of-month, month, day-of-week).

### Troubleshooting

- **"Invalid cron expression"** — validate with a tool like [crontab.guru](https://crontab.guru).
- **"Workflow did not fire"** — check that the workflow is published and the cron worker is running.

### Related Nodes

[Manual Trigger](#manual-trigger) · [Event Trigger](#event-trigger) · [Wait / Delay](/en/reference/workflows/nodes/logic#wait-delay) · [Workflow Studio](/en/how-to/agents/workspace/workflows)

---

## Webhook Trigger {#webhook-trigger}

**Type:** `webhook_trigger` · **Category:** Trigger

Start a workflow from an inbound HTTP request. Used for GitHub webhooks, CI pipeline hooks, payment events, and any external service that can POST data.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `trigger` | `void` | No |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `request` | `json` | `{ body: json, headers: json, method: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Public webhook path (e.g. `/hooks/github-pr-review`). Must be unique per workflow. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `method` | `select` | `POST` | `POST`, `GET`, `PUT` |

### Example

```json
{
  "path": "/hooks/github-pr-review",
  "method": "POST",
  "secretRef": "github-webhook-secret"
}
```

**Scenario:** Receive a GitHub webhook and route pull request events.

**Expected output:** `{ "body": { "action": "opened", "pull_request": { "number": 42 } }, "headers": { "x-github-event": "pull_request" } }`

**Downstream:** → `github_pr_review` with `{ "prNumber": "$.body.pull_request.number" }`

### Execution Notes

- Runs in `server` / `worker` environments only.
- The webhook URL is exposed after the workflow is published.
- Use `secretRef` to verify HMAC signatures from services like GitHub.

### Troubleshooting

- **"404 on webhook path"** — ensure the workflow is published and the path matches exactly.
- **"Payload not received"** — check `method` setting; GitHub PRs use `POST`.

### Related Nodes

[Event Trigger](#event-trigger) · [HTTP Request](/en/reference/workflows/nodes/storage#http-request) · [Switch](/en/reference/workflows/nodes/logic#switch)

---

## Event Trigger {#event-trigger}

**Type:** `event_trigger` · **Category:** Trigger

Start a workflow from a LenserFight domain event (e.g. `battle.completed`, `lens.published`, `agent.failed`).

### Inputs

| Name | Type | Required |
|------|------|----------|
| `trigger` | `void` | No |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `event` | `json` | `{ eventType: text, entityId: text, payload: json }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | `string` | Domain event name to subscribe to (e.g. `battle.completed`). |

### Example

```json
{
  "eventType": "battle.completed",
  "workspaceId": "{{workspace.id}}"
}
```

**Expected output:** `{ "eventType": "battle.completed", "entityId": "battle_123", "payload": { "winner": "contender-a" } }`

**Downstream:** → `slack_notify` with `{ "text": "$.payload.winner" }`

### Execution Notes

- Runs in `worker` / `server` environments.
- One trigger per event type per workflow.
- The `payload` shape varies by event type — check the event schema for each domain event.

### Related Nodes

[Webhook Trigger](#webhook-trigger) · [Battle Execute](/en/reference/workflows/nodes/battle#battle-execute) · [Slack Notify](/en/reference/workflows/nodes/communication#slack-notify)

---

## Form / Input Trigger {#form-input-trigger}

**Type:** `form_input_trigger` · **Category:** Trigger

Start a workflow from a rendered form and expose submitted fields. The Studio renders a form based on the `fields` schema and passes validated submission data downstream.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `trigger` | `void` | No |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `submission` | `json` | `{ fields: json, submittedBy: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `fields` | `json` | Form fields and validation rules. Each field: `{ key, type, required, label? }`. |

### Example

```json
{
  "fields": [
    { "key": "prompt", "type": "textarea", "required": true },
    { "key": "contenders", "type": "array", "required": true }
  ]
}
```

**Scenario:** Collect contender names before running a judged battle.

**Expected output:** `{ "fields": { "prompt": "Debate RAG answer style", "contenders": ["concise", "thorough"] } }`

**Downstream:** → `battle_execute` with `{ "prompt": "$.fields.prompt", "contenders": "$.fields.contenders" }`

### Troubleshooting

- **"Form not rendering"** — ensure `fields` is valid JSON with at least one field.
- **"Validation error on submit"** — check `required` flags and field types.

### Related Nodes

[Manual Trigger](#manual-trigger) · [Battle Execute](/en/reference/workflows/nodes/battle#battle-execute) · [Workflow Studio](/en/how-to/agents/workspace/workflows)

---

**See also:** [Node Reference Index](./) · [Workflow Concepts](/en/explanation/workflows/workflow-concepts) · [Execution Engine](/en/reference/workflows/execution-engine)
