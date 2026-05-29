---
title: Memory Read
description: Reads one or more keyed values from a session or long-term memory store.
---

# Memory Read

## Overview

The Memory Read node retrieves previously stored data from the platform's memory system. Memory is scoped to a named namespace (`memory_id`) and can be either session-scoped (tied to a single workflow run and discarded when the run ends) or long-term (persisted across runs for the same user or context). Use this node at the start of a workflow to restore state from a prior run, or mid-workflow to look up facts written by an earlier `memory_write` node in the same session.

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | Yes | — | Namespace that groups related memory entries. Typically matches a user ID, session ID, or logical context name (e.g. `"user:&#123;&#123;userId&#125;&#125;:prefs"`). Supports template expressions. |
| `key` | string | No | `"*"` | Specific memory key to retrieve. Use `"*"` to return all keys within the namespace up to `limit`. |
| `type` | string | No | `"session"` | Memory tier to read from. One of `"session"` (run-scoped) or `"long_term"` (persistent across runs). |
| `limit` | integer | No | `10` | Maximum number of entries to return when `key` is `"*"`. Range: 1–100. Ignored when a specific key is requested. |
| `default_value` | any | No | `null` | Value emitted on the `output` port when the key is not found, instead of routing to `not_found`. |
:::

## Inputs

| Port | Type | Description |
|---|---|---|
| `memory_id` | string | Optional runtime override for the `memory_id` config field. |
| `key` | string | Optional runtime override for the lookup key. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The retrieved value (or `default_value` if the key was absent and a default is configured). When `key` is `"*"`, emits an array of `{ key, value, updated_at }` objects. |
| `not_found` | null | Emitted when the key does not exist and no `default_value` is set. Use to branch workflows on a cache-miss. |

## Example

<div v-pre>

```json
{
  "nodeType": "memory_read",
  "config": {
::: v-pre
    "memory_id": "user:{{run.userId}}:conversation",
:::
    "key": "history",
    "type": "long_term",
    "limit": 10,
    "default_value": []
  }
}
```

</div>

## Notes

- Session memory is automatically purged when the workflow run completes; long-term memory persists until explicitly deleted or overwritten by a `memory_write` node.
- Reading all keys (`"*"`) is useful for debugging but should be avoided in production for namespaces with many entries; use a specific key and paginate via `limit` instead.
::: v-pre
- `memory_id` supports `&#123;&#123;expression&#125;&#125;` template syntax, allowing the namespace to be parameterised by run context variables such as `run.userId` or `run.sessionId`.
:::
- The `not_found` output port allows clean cache-miss handling; connect it to an `if_condition` node or directly to a node that generates the missing value.
