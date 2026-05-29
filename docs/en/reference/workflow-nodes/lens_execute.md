---
title: Lens Execute
description: Runs a saved Lens (AI function) by ID and returns its output.
---

# Lens Execute

## Overview

The `lens_execute` node invokes any published Lens on LenserFight by its ID, passing structured parameters and receiving the Lens's output as workflow data. Use it to compose reusable AI functions into larger pipelines without duplicating model configuration. The node resolves the `latest` published version by default, but you can pin to a specific version for reproducible runs. Execution is synchronous within the workflow step; timeouts are governed by the Lens itself.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `lens_id` | string | Yes | — | The UUID of the Lens to run. Find this in the Lens detail page or via the API. |
| `input_map` | object | No | `{}` | Maps upstream output paths to Lens parameter names. Keys are Lens param names; values are JSONPath expressions (e.g. `$.step1.output.text`). |
| `version` | string | No | `"latest"` | Pinned version string (e.g. `"3"`) or `"latest"`. Pinning is recommended for production workflows. |
| `timeout_ms` | number | No | `30000` | Maximum milliseconds to wait for the Lens to respond before the node fails. |
| `on_error` | string | No | `"fail"` | How to handle Lens errors: `"fail"` halts the workflow; `"continue"` passes `null` output and sets the `error` port. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Arbitrary upstream data available for `input_map` expressions. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The raw output returned by the Lens (type depends on the Lens definition). |
| `metadata` | object | Execution metadata: `run_id`, `version_used`, `duration_ms`, `model_key`. |
| `error` | object | Present only when `on_error` is `"continue"` and the Lens failed; contains `message` and `code`. |

## Example

```json
{
  "nodeType": "lens_execute",
  "config": {
    "lens_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "version": "latest",
    "input_map": {
      "topic": "$.trigger.output.topic",
      "language": "$.set_vars.output.language"
    },
    "timeout_ms": 20000,
    "on_error": "fail"
  }
}
```

## Notes

- `input_map` values are JSONPath expressions evaluated against the full workflow state object. An unresolvable path injects `null` for that parameter.
- If the Lens requires parameters that are not covered by `input_map`, their default values defined in the Lens schema are used; missing required parameters cause a validation error before execution starts.
- Pinning `version` to an explicit number prevents silent behaviour changes when a Lens author publishes a new version mid-campaign.
- Each `lens_execute` invocation counts against your plan's Lens run quota; use `loop_map` with a single `lens_execute` child rather than fan-out copies to keep quota usage predictable.
