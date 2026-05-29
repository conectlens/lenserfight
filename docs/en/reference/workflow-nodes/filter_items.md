---
title: Filter Items
description: Filters a list of items based on a condition expression.
---

# Filter Items

## Overview

The Filter Items node takes a list and emits only the elements that satisfy a condition expression, discarding the rest. Use it to narrow down arrays — such as battle results, lens outputs, or API response items — before passing data to downstream nodes. The condition is evaluated per item using a JSONPath or template expression; items that evaluate to truthy are routed to the `matched` output, and those that do not are routed to `unmatched`. An empty input list passes through without error, producing empty outputs on both ports.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `condition` | string | Yes | Expression evaluated against each item to determine inclusion. Supports JSONPath (e.g. `$.score >= 0.8`) and template syntax (e.g. `{{item.status}} === 'passed'`). Items where the expression is truthy go to `matched`; falsy items go to `unmatched`. |
| `inputPath` | string | No | JSONPath into the incoming payload that resolves to the array to filter (e.g. `$.results`). Defaults to the root value when omitted, which must itself be an array. |
| `stopOnError` | boolean | No | When true, a runtime evaluation error on any item halts the node and routes the error to the `error` output. When false (default), items that throw evaluation errors are treated as non-matching and sent to `unmatched`. |
| `limit` | number | No | Maximum number of matched items to emit. Once the limit is reached, evaluation stops and remaining items are discarded. Useful for capping downstream load. No limit is applied when omitted. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any[] | The payload containing the array to filter. If `inputPath` is set, the node extracts the target array from this object; otherwise the value itself must be an array. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `matched` | any[] | Array of items for which the condition evaluated to truthy, in original order. Empty array when no items match. |
| `unmatched` | any[] | Array of items for which the condition evaluated to falsy (or threw when `stopOnError` is false), in original order. |
| `error` | object | Emitted when `stopOnError` is true and an item causes a condition evaluation error. Contains `message`, `item`, and `index` fields identifying the failure. |

## Example

```json
{
  "nodeType": "filter_items",
  "config": {
    "condition": "{{item.score}} >= 0.75",
    "inputPath": "$.battle_runs",
    "stopOnError": false,
    "limit": 50
  }
}
```
