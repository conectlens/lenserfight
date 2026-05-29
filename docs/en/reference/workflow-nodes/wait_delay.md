---
title: Wait / Delay
description: Pauses workflow execution for a specified duration.
---

# Wait / Delay

## Overview

The Wait / Delay node pauses workflow execution for a fixed duration before passing data to the next node. Use it to rate-limit downstream calls, introduce cooldown periods between battle rounds, or align execution timing with external system constraints. Execution resumes automatically after the delay elapses; the input payload is forwarded unchanged to the output port. No credentials are required.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `duration` | number | Yes | How long to pause execution, in the unit specified by `unit`. Must be a positive integer. |
| `unit` | enum | Yes | Time unit for the duration value. Accepted values: `milliseconds`, `seconds`, `minutes`, `hours`. |
| `label` | string | No | Human-readable label shown in the workflow studio canvas. Does not affect execution. |
| `skip_on_error` | boolean | No | When true, if the delay cannot be honored (e.g. workflow timeout imminent), execution continues immediately rather than failing. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The data payload to hold during the delay. Forwarded unchanged to the output port after the duration elapses. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The original input payload, emitted after the configured delay has elapsed. |
| `error` | object | Emitted if the delay cannot be completed (e.g. workflow timeout exceeded and `skip_on_error` is false). Contains `message` and `code` fields. |

## Example

```json
{
  "nodeType": "wait_delay",
  "config": {
    "duration": 30,
    "unit": "seconds",
    "label": "Cooldown between rounds",
    "skip_on_error": false
  }
}
```
