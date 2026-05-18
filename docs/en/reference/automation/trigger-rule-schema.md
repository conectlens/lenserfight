---
title: Trigger rule schema
description: Canonical JSON schema for LenserFight automation trigger rules — match event types, filter operators, and action configurations.
---

# Trigger rule schema

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


A trigger rule is a JSON object stored in `automation.trigger_rules`. The CLI accepts the same shape via `lf automation create --file <path>.json`.

## Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human label shown in `lf automation list` and the web UI. |
| `match_event_type` | string | yes | One of the producer event types (e.g. `battle.finalized`). |
| `match_filter` | object | no | Filter DSL. Default `{}` matches every event of the configured type. |
| `action_kind` | enum | yes | One of `dispatch_workflow`, `webhook`, `notify`. |
| `action_config` | object | yes | Schema depends on `action_kind` (below). |
| `is_active` | boolean | no | Default `true`. Disabled rules are not evaluated by the dispatcher. |

## Filter DSL

`match_filter` is a JSON object mapping a [JSON Pointer (RFC 6901)](https://datatracker.ietf.org/doc/html/rfc6901) path to a single matcher object. Multiple top-level keys combine with logical AND.

```json
{
  "/winner_contender_id": { "eq": "<uuid>" },
  "/finalized_at": { "gt": "2026-08-01T00:00:00Z" }
}
```

The path is resolved against the event's `payload` JSONB. Reserved characters in path segments must be escaped per RFC 6901 (`~0` for `~`, `~1` for `/`).

| Operator | Argument type | Semantics |
|---|---|---|
| `eq` | scalar | Strict JSONB equality |
| `neq` | scalar | Strict JSONB inequality |
| `gt` | number or ISO-8601 string | Strictly greater-than |
| `lt` | number or ISO-8601 string | Strictly less-than |
| `contains` | string or array element | LIKE for strings, JSONB `?` containment for arrays |

Unknown operators reject the rule at create time and fail closed at evaluation time.

## Action schemas

### `dispatch_workflow`

Inserts a row into `lenses.workflow_runs` for the configured workflow.

```json
{
  "action_kind": "dispatch_workflow",
  "action_config": {
    "workflow_id": "<uuid>",
    "input_overrides": {
      "topic": "battle aftermath"
    }
  }
}
```

| Key | Required | Notes |
|---|---|---|
| `workflow_id` | yes | The workflow you own. |
| `input_overrides` | no | Merged with the workflow's default inputs. |

### `webhook`

Enqueues into `audit.webhook_outbox`. The Phase P3 outbox handles HMAC signing, retries, and dead-lettering.

```json
{
  "action_kind": "webhook",
  "action_config": {
    "url": "https://hooks.example.com/lenserfight",
    "headers": {
      "X-Custom": "value"
    }
  }
}
```

| Key | Required | Notes |
|---|---|---|
| `url` | yes | HTTPS only. |
| `headers` | no | Extra request headers. The HMAC signature header `X-LF-Signature` is added by the outbox. |

The delivered payload is:

```json
{
  "event_type": "battle.finalized",
  "event_id": "<uuid>",
  "payload": { "...": "..." },
  "rule_id": "<uuid>",
  "webhook_version": 1
}
```

### `notify`

Creates an in-app notification for the rule owner.

```json
{
  "action_kind": "notify",
  "action_config": {
    "title": "Battle finished",
    "body": "Your battle just finalized — review the result.",
    "payload": {
      "deeplink": "/battles/<slug>"
    }
  }
}
```

| Key | Required | Notes |
|---|---|---|
| `title` | yes | Short headline. |
| `body` | no | Longer text shown in the notification card. |
| `payload` | no | Free-form JSONB merged into `notifications.payload`. |

## Validation

The CLI rejects invalid rules client-side before INSERT:

- `action_kind` not in the allowed set.
- `match_filter` clauses whose value object has zero or multiple keys.
- `match_filter` clauses whose operator is not in the frozen set.

Server-side validation is enforced by `CHECK` constraints and the `automation.fn_eval_filter` evaluator, which fails closed on unknown operators.

## Related

- [Event bus architecture](/en/explanation/automation/event-bus-architecture)
- [Build your first trigger](/en/how-to/automation/build-your-first-trigger)
- [`lf automation` CLI](/en/reference/cli/automation-rules)
