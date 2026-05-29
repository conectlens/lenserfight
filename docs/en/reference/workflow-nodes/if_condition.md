---
title: If Condition
description: Branches workflow execution based on a true/false expression.
---

# If Condition

## Overview

The If Condition node evaluates a boolean expression against the current workflow data and routes execution down one of two branches: `true` or `false`. Use it to split workflow logic based on dynamic values such as a model score, a status field, or a computed threshold. The expression supports dot-notation field access and common comparison operators. Both output ports always exist; only the matching branch continues execution.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `expression` | string | Yes | Boolean expression evaluated against the workflow data context. Supports dot-notation field access (e.g. `score.total >= 80`), string equality (`status == 'approved'`), and logical operators (`&&`, `||`, `!`). |
| `inputPath` | string | No | JSONPath or dot-notation path to the data object the expression is evaluated against. Defaults to the root payload (`$`). Example: `$.battle.result`. |
| `strictMode` | boolean | No | When true, treats a missing or null field referenced in the expression as an evaluation error rather than coercing it to false. Defaults to false. |
| `label` | string | No | Human-readable label shown on the node in the workflow studio canvas. Does not affect execution. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Workflow data payload passed into the condition. The expression is evaluated against this value (or the sub-path defined by `inputPath`). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `true` | any | Emits the unmodified input payload when the expression evaluates to true. Connect downstream nodes that should run on the positive branch. |
| `false` | any | Emits the unmodified input payload when the expression evaluates to false. Connect downstream nodes that should run on the negative branch. |
| `error` | object | Emits an error object when the expression cannot be evaluated (e.g. syntax error, missing field in strict mode). Contains `message` and `expression` fields. |

## Example

```json
{
  "nodeType": "if_condition",
  "config": {
    "expression": "battle.winner_score >= 75 && battle.status == 'completed'",
    "inputPath": "$.payload",
    "strictMode": true,
    "label": "Score threshold check"
  }
}
```
