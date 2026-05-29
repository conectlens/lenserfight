---
title: Data Mapper
description: Maps and reshapes data fields from one schema to another.
---

# Data Mapper

## Overview

The Data Mapper node transforms an incoming data object by selecting, renaming, reshaping, and optionally type-casting its fields into a new schema. Use it between integration nodes when the upstream payload structure does not match what a downstream node expects — for example, flattening a nested API response before feeding it into a battle contender input. Unmapped fields are dropped by default; enabling passthrough retains them. If a required source field is missing at runtime, execution is routed to the error output.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `mappings` | array<object> | Yes | Ordered list of field mapping rules. Each rule specifies a source field path (dot-notation), a target field name, an optional type cast (string | number | boolean | json), and an optional default value used when the source path resolves to null or undefined. |
| `passthroughUnmapped` | boolean | No | When true, fields not referenced by any mapping rule are copied as-is to the output object. Defaults to false (unmapped fields are dropped). |
| `strictMode` | boolean | No | When true, any source field path that cannot be resolved (and has no default) routes execution to the error output instead of silently skipping the field. Defaults to false. |
| `outputRoot` | string | No | Optional dot-notation path to nest the entire mapped result under in the output object (e.g. 'payload.data'). Useful when a downstream node expects the result inside a wrapper key. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | The source data object to be mapped. Accepts any JSON-serialisable object; nested paths are accessible via dot-notation in mapping rules. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The reshaped object containing only the mapped fields (plus any passthrough fields if enabled), optionally nested under outputRoot. |
| `error` | object | Emitted when strictMode is true and a required source path is missing. Carries the original input object and a 'missingFields' array listing each unresolvable path. |

## Example

```json
{
  "nodeType": "data_mapper",
  "config": {
    "mappings": [
      {
        "source": "response.model.id",
        "target": "modelId",
        "cast": "string"
      },
      {
        "source": "response.model.score",
        "target": "score",
        "cast": "number",
        "default": 0
      },
      {
        "source": "response.meta.finishedAt",
        "target": "completedAt",
        "cast": "string"
      }
    ],
    "passthroughUnmapped": false,
    "strictMode": true,
    "outputRoot": "payload"
  }
}
```
