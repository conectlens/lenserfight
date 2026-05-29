---
title: Sort
description: Sorts a list of items by one or more fields.
---

# Sort

## Overview

The Sort node reorders a list of items by one or more fields in ascending or descending order. It accepts an array on its input port, applies the configured sort criteria in priority order, and emits the sorted array on its output port. Use it to rank battle results by score, order contenders by ELO, or sequence workflow items before passing them to downstream nodes. When the input is not an array or a sort field is missing on all items, the node routes to the error port.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `sortKeys` | array<object> | Yes | Ordered list of sort criteria. Each entry specifies a `field` (dot-path into each item, e.g. `score.total`) and a `direction` (`asc` or `desc`). Criteria are applied in declaration order as a stable multi-key sort. |
| `nullsPosition` | enum | No | Where items whose sort field is null or missing are placed: `first` or `last`. Defaults to `last`. |
| `caseSensitive` | boolean | No | When sorting string fields, whether comparison is case-sensitive. Defaults to `false`. |
| `inputPath` | string | No | Dot-path to the array within the incoming data object. If omitted, the node treats the entire input value as the array. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | array | object | The data to sort. Must be an array, or an object containing an array at the path specified by `inputPath`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | array | The sorted array, preserving the original item shape. Order is stable: items with equal sort keys retain their original relative positions. |
| `error` | object | Emitted when the input is not a resolvable array or a required sort field path is invalid. Carries `message` and `inputSnapshot` for debugging. |

## Example

```json
{
  "nodeType": "sort",
  "config": {
    "sortKeys": [
      {
        "field": "score.total",
        "direction": "desc"
      },
      {
        "field": "createdAt",
        "direction": "asc"
      }
    ],
    "nullsPosition": "last",
    "caseSensitive": false,
    "inputPath": "results"
  }
}
```
