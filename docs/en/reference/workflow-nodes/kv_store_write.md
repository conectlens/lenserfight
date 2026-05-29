---
title: KV Store Write
description: Writes a value into the workflow key-value store.
---

# KV Store Write

## Overview

The KV Store Write node persists a value under a named key in the workflow's scoped key-value store, making it available to downstream nodes via KV Store Read. Keys are scoped to the workflow run by default, so concurrent runs do not collide. Use this node to cache intermediate results, pass state across branches, or accumulate data across loop iterations. If the key already exists its value is overwritten without error.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | The key under which the value is stored. Supports template expressions (e.g. `battle_&#123;&#123;run.id&#125;&#125;_score`) for dynamic key names. |
| `value` | string | Yes | The value to write. Accepts a literal string, a JSON expression, or a reference to an upstream node output (e.g. `&#123;&#123;nodes.scorer.output.score&#125;&#125;`). |
| `scope` | enum | No | Storage scope: `run` (default, isolated per workflow run), `workflow` (shared across all runs of this workflow), or `global` (shared across all workflows in the project). |
| `ttl` | number | No | Time-to-live in seconds. If set, the key expires automatically after this duration. Omit for indefinite storage within the scope lifetime. |
| `overwrite` | boolean | No | When false, the write is skipped silently if the key already exists. Defaults to true (always overwrite). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal from the upstream node. The node executes when this port receives data. |
| `value` | any | Optional explicit value to write. When connected, overrides the static `value` config field. Accepts strings, numbers, objects, or arrays — objects are serialised to JSON automatically. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Passes the written value downstream unchanged, allowing the result to be consumed immediately without a separate KV Store Read. |
| `error` | object | Emits an error object `{ code, message }` if the write fails (e.g. scope quota exceeded, invalid key format, or a TTL below the minimum). Connect to an error-handling branch to recover gracefully. |

## Example

<div v-pre>

```json
{
  "nodeType": "kv_store_write",
  "config": {
    "key": "battle_{{run.id}}_winner",
    "value": "{{nodes.judge.output.winner_handle}}",
    "scope": "run",
    "ttl": 3600,
    "overwrite": true
  }
}
```

</div>

