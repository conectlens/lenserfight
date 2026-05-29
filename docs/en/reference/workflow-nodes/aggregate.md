---
title: Aggregate
description: Aggregates multiple upstream values into a single collection.
---

# Aggregate

## Overview

The Aggregate node collects values from multiple upstream branches and combines them into a single array or keyed object, emitting once all expected inputs have arrived. Use it after fan-out patterns — such as parallel AI model executions or multi-contender battle runs — when downstream nodes need a unified collection rather than individual values. The node waits for every connected input port to receive a value before emitting, acting as a synchronization barrier. If any upstream branch produces an error, the node routes that error to the dedicated error output without blocking the remaining collection.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | enum (`array`, `object`) | Yes | Controls the output shape. `array` produces an ordered list of values; `object` produces a key-value map where each port name becomes a key. |
| `keys` | string[] | No | Explicit key names for each input port when mode is 'object'. Must match the number of connected inputs. Defaults to port names if omitted. |
| `allowPartial` | boolean | No | When true, emits with whatever values have arrived if any input port times out instead of routing to the error output. Defaults to false. |
| `timeout` | number | No | Maximum milliseconds to wait for all inputs before timing out. Applies per-execution. Defaults to the workflow-level execution timeout. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input_1`, `input_2`, … | any | Dynamically numbered input ports (one per upstream branch). Each port receives a value from its branch; all connected ports must emit before the node proceeds. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | array or keyed object | The aggregated collection. Shape is an ordered array when mode is `array`, or a string-keyed object map when mode is `object`. |
| `error` | error object | Emits if any upstream input delivers an error and allowPartial is false. Payload includes `message`, `port`, and `cause` from the failing input. |

## Example

```json
{
  "nodeType": "aggregate",
  "config": {
    "mode": "object",
    "keys": [
      "gpt4o_result",
      "claude_result",
      "gemini_result"
    ],
    "allowPartial": false,
    "timeout": 15000
  }
}
```
