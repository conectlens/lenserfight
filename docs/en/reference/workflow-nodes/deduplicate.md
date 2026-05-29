---
title: Deduplicate
description: Removes duplicate items from a list based on a key.
---

# Deduplicate

## Overview

The Deduplicate node removes duplicate items from an incoming list, emitting only unique entries based on a specified key path. It preserves the first occurrence of each unique value by default, discarding subsequent duplicates. Use it after merge or aggregation steps where repeated entries may appear — for example, deduplicating battle results by model ID before scoring. Items that cannot be resolved against the key (missing key, null value) are routed to the `unresolved` output port rather than silently dropped.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Dot-notation path to the field used to determine uniqueness (e.g. `id`, `model.id`, `result.runId`). Two items are considered duplicates when this field resolves to the same value. |
| `strategy` | enum | No | Which occurrence to keep when duplicates are found. `first` (default) keeps the earliest item; `last` keeps the latest item in the list. |
| `caseSensitive` | boolean | No | When `true` (default), string key comparisons are case-sensitive. Set to `false` to treat `ModelA` and `modela` as the same key. |
| `emitUnresolved` | boolean | No | When `true` (default), items where the key path cannot be resolved are forwarded to the `unresolved` output port. When `false`, they are silently discarded. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | array<object> | The list of items to deduplicate. Each element should be an object; primitive arrays are not supported. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | array<object> | The deduplicated list, containing only the kept occurrence of each unique key value, in original order. |
| `unresolved` | array<object> | Items for which the configured key path could not be resolved (missing field or null value). Only emitted when `emitUnresolved` is `true`. |

## Example

```json
{
  "nodeType": "deduplicate",
  "config": {
    "key": "model.id",
    "strategy": "first",
    "caseSensitive": false,
    "emitUnresolved": true
  }
}
```
