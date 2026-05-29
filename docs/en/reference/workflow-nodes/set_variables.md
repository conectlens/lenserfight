---
title: Set Variables
description: Sets one or more workflow-scoped variables.
---

# Set Variables

## Overview

The Set Variables node writes one or more named values into the workflow's shared variable scope, making them accessible to downstream nodes by reference. Use it to initialize counters, store intermediate results, build dynamic strings, or pass computed values across branches without hardcoding them in each node. Variables set here follow workflow-scoped lifetime — they persist for the duration of the run but are not persisted to external storage. Values can be static literals or expressions referencing upstream node outputs.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `variables` | array<object> | Yes | List of variable assignments. Each entry has a `name` (string, the variable key) and a `value` (any scalar or expression). Names must be unique within the node; duplicates are resolved in order (last wins). |
| `variables[].name` | string | Yes | The variable key written into workflow scope. Must be a valid identifier (alphanumeric and underscores, no spaces). Referenced downstream as `{{variables.name}}`. |
| `variables[].value` | string | number | boolean | Yes | The value to assign. Accepts static literals or expression syntax (e.g. `{{nodes.fetch.output.count}}`) to reference upstream outputs. |
| `variables[].overwrite` | boolean | No | When false, skips assignment if the variable already exists in scope. Defaults to true. Useful for setting defaults early in a workflow without clobbering values set by earlier branches. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal and upstream execution context. The node reads this context to resolve any expression-based variable values before writing to scope. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Passes the incoming execution context downstream, augmented with the newly set variables. The original payload is forwarded unchanged; variable writes are side-effects on workflow scope. |

## Example

```json
{
  "nodeType": "set_variables",
  "config": {
    "variables": [
      {
        "name": "round_limit",
        "value": 3,
        "overwrite": false
      },
      {
        "name": "judge_model",
        "value": "gpt-4o",
        "overwrite": true
      },
      {
        "name": "battle_label",
        "value": "{{nodes.config_fetch.output.label}}",
        "overwrite": true
      }
    ]
  }
}
```
