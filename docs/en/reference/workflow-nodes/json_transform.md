---
title: JSON Transform
description: Transforms a JSON object using a jq-style or template expression.
---

# JSON Transform

## Overview

The JSON Transform node applies a jq-style or template expression to reshape, filter, or extract fields from an incoming JSON object. Use it to normalize data between workflow steps, project only the fields a downstream node expects, or construct new objects from existing values. If the expression is invalid or the input does not match the expected shape, execution routes to the error output rather than halting the workflow. No external credentials are required.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `expression` | string | Yes | A jq-style or template expression applied to the input object. Examples: `.results[0].score`, `{id: .battle_id, score: .metrics.score}`. |
| `expressionLanguage` | enum | No | Selects the expression dialect. Options: `jq` (default) or `template`. Use `template` for simple string interpolation; use `jq` for full structural transforms. |
| `outputKey` | string | No | When set, wraps the transform result under this key in the output object instead of replacing the root. Useful when merging results into the existing context. |
| `strict` | boolean | No | When true, routes to the error output if the expression yields null or undefined. Defaults to false, which passes null through the output port. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | The JSON object to transform. Any valid JSON object from a prior workflow step. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The transformed JSON object produced by the expression. |
| `error` | object | Emitted when the expression fails to parse, throws at runtime, or strict mode is enabled and the result is null. Contains `message` and `expression` fields. |

## Example

```json
{
  "nodeType": "json_transform",
  "config": {
    "expression": "{battleId: .battle_id, winner: .result.winner, finalScore: .result.scores.total}",
    "expressionLanguage": "jq",
    "outputKey": "summary",
    "strict": true
  }
}
```
