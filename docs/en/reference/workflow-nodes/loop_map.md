---
title: Loop Map
description: Iterates over an array and runs the connected sub-workflow once per item, then collects all results.
---

# Loop Map

## Overview

The `loop_map` node extracts an array from the incoming data, spawns a sub-workflow execution for each element, and collects the results into an output array in the same order as the input. It is the workflow equivalent of `Array.prototype.map`: every item is processed independently and the node waits for all iterations to complete before emitting. Concurrency is bounded by the `concurrency` field to prevent downstream services from being overwhelmed. Use `loop_map` when you need to run the same sequence of nodes (e.g. `lens_execute` + `code`) on each element of a list.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `items_path` | string | Yes | — | JSONPath expression that resolves to the array to iterate over within the `input` object (e.g. `$.contenders` or `$.results.items`). |
| `item_variable` | string | No | `"item"` | The key under which each array element is injected into the iteration's input object. Downstream nodes access it as `$.item` (or whatever name is set). |
| `concurrency` | number | No | `1` | Number of items processed simultaneously. Minimum `1`, maximum `10`. Higher values reduce total wall-clock time but increase load on downstream services. |
| `on_item_error` | string | No | `"fail"` | How to handle a failing iteration: `"fail"` aborts the whole loop immediately; `"skip"` records `null` for that index and continues; `"collect_errors"` adds an error object to the result array and continues. |
| `output_path` | string | No | `"results"` | The key name under which the collected results array is placed in the node's output object. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Data object that contains the array to iterate over, resolved via `items_path`. The full object (plus the current `item_variable`) is available to each iteration's sub-workflow. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains the key named by `output_path` (default `results`), which is an array of each iteration's sub-workflow output, in input order. Also includes `count` (total items), `succeeded` (count), and `failed` (count). |
| `error` | object | Present only when `on_item_error` is `"fail"` and an iteration fails; contains `message`, `failed_index`, and the item that caused the failure. |

## Example

```json
{
  "nodeType": "loop_map",
  "config": {
    "items_path": "$.battle.contenders",
    "item_variable": "contender",
    "concurrency": 3,
    "on_item_error": "collect_errors",
    "output_path": "scores"
  }
}
```

With `input.battle.contenders = [{ id: "a" }, { id: "b" }, { id: "c" }]`, the sub-workflow runs for each contender up to 3 at a time, and `output.scores` is `[resultA, resultB, resultC]`.

## Notes

- The maximum `concurrency` is `10`. Values above `10` are clamped silently. For most external API calls, `concurrency` of `3`–`5` is a safe default to avoid rate limits.
- Output order is always preserved to match input order regardless of which iterations finish first — the node waits for all before emitting.
- Empty arrays (zero items) are valid: the node emits `output.results = []`, `count = 0`, `succeeded = 0` and continues without entering the sub-workflow.
- If `on_item_error` is `"skip"`, the corresponding index in the results array is `null`. Downstream nodes should guard against nulls when consuming the collected results.
