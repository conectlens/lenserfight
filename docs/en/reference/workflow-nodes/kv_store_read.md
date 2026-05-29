---
title: KV Store Read
description: Reads a value from the workflow key-value store.
---

# KV Store Read

## Overview

The KV Store Read node retrieves a value from the workflow's shared key-value store by key. Use it to pass persistent state between workflow runs or share data across branches within a single run. If the key does not exist, the node routes to the `not_found` output rather than failing, allowing explicit handling of missing entries. No external credentials are required — the store is scoped to the workflow's own namespace.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | The key to look up in the KV store. Supports template expressions (e.g. `battle_&#123;&#123;run.id&#125;&#125;_score`). |
| `namespace` | string | No | Optional namespace prefix to scope the key. Defaults to the workflow's own namespace if omitted. |
| `default_value` | string | No | Value to emit on the `output` port when the key is not found, instead of routing to `not_found`. Leave blank to use the `not_found` branch. |
| `parse_json` | boolean | No | When true, parses the stored string value as JSON before emitting it. Fails with a parse error if the value is not valid JSON. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the read operation. The payload is passed through to the output unchanged. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Emits the retrieved value merged with the incoming payload under the key `kv_value`. Also emits if `default_value` is set and the key is absent. |
| `not_found` | any | Emits the original input payload when the key does not exist and no `default_value` is configured. |
| `error` | error | Emits on read failures such as a JSON parse error (when `parse_json` is true) or a store access error. |

## Example

<div v-pre>

```json
{
  "nodeType": "kv_store_read",
  "config": {
    "key": "battle_{{run.id}}_judge_score",
    "namespace": "arena",
    "parse_json": true,
    "default_value": ""
  }
}
```

</div>

