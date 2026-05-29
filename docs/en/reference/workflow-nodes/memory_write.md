---
title: Memory Write
description: Writes or upserts a keyed value into a session or long-term memory store.
---

# Memory Write

## Overview

The Memory Write node persists arbitrary JSON values into the platform's memory system under a named namespace and key. If an entry with the same `memory_id` + `key` combination already exists it is overwritten (upsert semantics). Session-scoped entries can optionally carry a TTL after which they are automatically evicted. This node is commonly used to checkpoint conversation history, cache computed results, or accumulate state across the nodes of a multi-turn workflow.

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | Yes | — | Namespace that groups related memory entries. Supports `&#123;&#123;expression&#125;&#125;` template syntax (e.g. `"user:&#123;&#123;run.userId&#125;&#125;:ctx"`). |
| `key` | string | Yes | — | Unique key within the namespace under which the value is stored. |
| `value` | any | No | — | Static JSON value to write. If omitted, the node reads the value from the `value` input port at runtime. |
| `type` | string | No | `"session"` | Memory tier to write to. One of `"session"` (run-scoped) or `"long_term"` (persisted across runs). |
| `ttl_seconds` | integer | No | — | Time-to-live in seconds. Only applicable when `type` is `"session"`. The entry is automatically evicted after this duration. Omit for no expiry within the session. |
| `merge` | boolean | No | `false` | When `true` and the existing value is an object, the incoming value is deep-merged rather than replaced. Arrays are always replaced. |
:::

## Inputs

| Port | Type | Description |
|---|---|---|
| `value` | any | Value to write. Overrides `config.value` when provided at runtime. Accepts any JSON-serialisable type. |
| `memory_id` | string | Optional runtime override for the `memory_id` config field. |
| `key` | string | Optional runtime override for the storage key. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Confirmation object with `memory_id` (string), `key` (string), `type` (string), and `written_at` (ISO-8601 timestamp). |

## Example

<div v-pre>

```json
{
  "nodeType": "memory_write",
  "config": {
    "memory_id": "user:{{run.userId}}:conversation",
    "key": "history",
    "type": "long_term",
    "merge": false
  }
}
```

```json
{
  "nodeType": "memory_write",
  "config": {
    "memory_id": "session:{{run.sessionId}}:cache",
    "key": "search_results",
    "type": "session",
    "ttl_seconds": 300
  }
}
```

</div>

## Notes

- `ttl_seconds` is only honoured for `"session"` type entries; setting it on a `"long_term"` entry has no effect and generates a build-time warning.
- Using `merge: true` is safe only when the stored value is a flat or shallow object; deep merges on large or cyclic structures can produce unexpected results.
- The `output` port confirmation object is useful for audit trails; connect it to a `kv_store_write` or `webhook_sender` node if you need to log every write.
- To implement a rolling conversation window, read the history with `memory_read`, append the new message in a `json_transform` node, then write the result back with this node.
