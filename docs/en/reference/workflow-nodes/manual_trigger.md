---
title: Manual Trigger
description: Starts the workflow when a user explicitly clicks a trigger button in the UI.
---

# Manual Trigger

## Overview

The Manual Trigger node starts a workflow on explicit user request rather than automatically. When the workflow is published, LenserFight renders a button (or inline form) in the UI using the configured label and description. If `require_input` is enabled, the user must fill in a form defined by `input_schema` before execution begins. This node is always the first node in the graph and produces no upstream dependencies.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `label` | string | No | `"Run"` | Display text for the trigger button shown in the UI. |
| `description` | string | No | — | Short helper text rendered beneath the button to explain what the workflow does. |
| `require_input` | boolean | No | `false` | When `true`, the user must submit a form before execution starts. |
| `input_schema` | object | No | — | JSON Schema (draft-07) describing the input form. Required when `require_input` is `true`. |

## Inputs

This node has no upstream inputs — it is the workflow entry point.

| Port | Type | Description |
|---|---|---|
| — | — | No inputs; this node initiates the run. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | An object containing `triggered_at` (ISO-8601 timestamp) and, when `require_input` is `true`, a `form_data` key holding the submitted values. |

## Example

```json
{
  "nodeType": "manual_trigger",
  "config": {
    "label": "Generate Weekly Report",
    "description": "Kick off the weekly summary workflow. Takes ~30 seconds.",
    "require_input": true,
    "input_schema": {
      "type": "object",
      "required": ["week_ending"],
      "properties": {
        "week_ending": {
          "type": "string",
          "format": "date",
          "title": "Week Ending Date"
        },
        "include_drafts": {
          "type": "boolean",
          "title": "Include draft battles",
          "default": false
        }
      }
    }
  }
}
```

## Notes

- A workflow may contain only one trigger node. Placing a second trigger node will cause a validation error at publish time.
- When `require_input` is `false`, downstream nodes receive `form_data: null`; guard against this if your graph branches on form values.
- `input_schema` supports any valid JSON Schema draft-07 keywords including `enum`, `minimum`, `pattern`, and `$ref`. Complex nested schemas are fully supported.
- The trigger button is visible to any user who has at least `viewer` permission on the workflow; execution still requires `runner` or higher.
