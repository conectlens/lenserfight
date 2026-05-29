---
title: Extract Field
description: Extracts a single field from an object using a dot-path expression.
---

# Extract Field

## Overview

The Extract Field node reads a single value from an incoming object using a dot-path expression (e.g. `user.profile.displayName`) and passes that value downstream. It is used to narrow a large object down to one field before passing it to a node that expects a scalar or a simpler shape. When the path does not exist or the input is not an object, execution is routed to the `error` output so downstream nodes can handle missing-field cases explicitly.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Dot-path expression that identifies the field to extract (e.g. `result.scores[0].value`). Supports bracket notation for array indices. |
| `fallback` | string | No | Value returned on the `output` port when the path resolves to `undefined`. When omitted and the path is missing, execution routes to `error` instead. |
| `strict` | boolean | No | When `true`, a `null` value at the resolved path is also treated as missing and routes to `error`. Defaults to `false`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | The source object from which the field is extracted. Must be a JSON-serialisable object; primitives and arrays at the root level cause an error. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The extracted field value. Type matches whatever is stored at the resolved path (string, number, boolean, object, or array). |
| `error` | object | Emitted when the path cannot be resolved and no `fallback` is configured, or when `strict` is `true` and the resolved value is `null`. Contains `message` and `path` fields describing the failure. |

## Example

```json
{
  "nodeType": "extract_field",
  "config": {
    "path": "battle.result.winner.handle",
    "fallback": "unknown",
    "strict": false
  }
}
```
