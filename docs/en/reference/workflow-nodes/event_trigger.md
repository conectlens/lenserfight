---
title: Event Trigger
description: Triggers workflow execution in response to a platform event.
---

# Event Trigger

## Overview

The Event Trigger node starts a workflow run automatically when a named platform event fires (e.g. `battle.completed`, `vote.cast`, `lens.published`). The platform event dispatcher injects the full event payload into `__event__` before execution, which the node surfaces as the `event` output port for downstream nodes. An optional `filterExpression` is evaluated against the event object; if it returns falsy the run is silently skipped. When triggered manually or in test mode, the node falls back to a typed stub containing an empty `data` object and the configured `eventType` string.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `eventType` | enum | Yes | The platform event that activates this workflow. One of: `battle.completed`, `lens.published`, `workflow.failed`, `vote.cast`, `leaderboard.updated`. Determines which internal event bus subscription is registered at workflow publish time. |
| `filterExpression` | string | No | JavaScript-like expression evaluated against the `event` object. Must return truthy for the run to proceed. If omitted, all occurrences of the event type trigger a run. Example: `event.data.winner_id === ctx.lenserId`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `—` | void | No upstream inputs. This node is always the entry point of the workflow graph. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `event` | json | The matched platform event object. Shape: `{ type: string, data: Record<string, unknown>, timestamp: string (ISO-8601) }`. In manual/test runs a stub with an empty `data` object is emitted instead. |

## Example

```json
{
  "nodeType": "event_trigger",
  "config": {
    "nodeType": "event_trigger",
    "config": {
      "eventType": "battle.completed",
      "filterExpression": "event.data.winner_id === ctx.lenserId"
    }
  }
}
```
