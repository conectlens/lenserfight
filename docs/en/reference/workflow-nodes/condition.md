---
title: Condition
description: Evaluates a boolean expression and routes execution to the true or false branch.
---

# Condition

## Overview

The Condition node evaluates a boolean expression against the current execution context and routes the workflow to one of two branches: true or false. Use it to implement branching logic such as threshold checks, flag guards, or value comparisons without writing custom code. The expression is evaluated against the data payload available at that point in the workflow; if the expression throws or cannot be evaluated, execution is halted and an error is emitted. No credentials are required.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `expression` | string | Yes | A boolean expression evaluated against the execution context. Supports dot-notation property access and standard comparison operators (e.g. `data.score >= 0.8`, `context.votes.length > 0`). Evaluated in a sandboxed environment — no side effects. |
| `label` | string | No | Human-readable label displayed on the node in the workflow canvas. Does not affect evaluation. |
| `strict` | boolean | No | When true, evaluation errors (e.g. missing property, type mismatch) route to the false branch instead of halting execution. Defaults to false (errors halt the workflow). |
| `inputPath` | string | No | Optional dot-notation path to a sub-object of the incoming payload to use as the expression root. If omitted, the full payload is available as `data`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | The execution context payload passed from the previous node. Made available to the expression as `data` (or the sub-object at `inputPath` if configured). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `true` | object | Receives the unmodified input payload when the expression evaluates to true. |
| `false` | object | Receives the unmodified input payload when the expression evaluates to false, or when `strict` is true and evaluation throws. |
| `error` | object | Emitted when the expression throws and `strict` is false. Payload includes `message` and `expression` fields describing the failure. |

## Example

```json
{
  "nodeType": "condition",
  "config": {
    "expression": "data.judgeScore >= 0.75 && data.votesCount > 3",
    "label": "Score threshold check",
    "strict": false,
    "inputPath": "battleResult"
  }
}
```
