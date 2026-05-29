---
title: Try / Catch
description: Wraps a node or group in error-handling logic with a fallback path.
---

# Try / Catch

## Overview

The Try / Catch node wraps one or more downstream nodes in error-handling logic, routing execution to a fallback path when any wrapped node throws an error. Use it to isolate fragile steps — such as external API calls, AI model invocations, or data transformations — so a failure does not abort the entire workflow. The caught error object is forwarded on the `error` output port, giving downstream nodes access to the error message, code, and originating node ID. If no error occurs, execution continues normally on the `output` port and the `error` port emits nothing.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | No | Human-readable name shown in the workflow canvas for this node. |
| `retryCount` | number | No | Number of times to retry the wrapped nodes before routing to the catch path. Defaults to 0 (no retries). |
| `retryDelayMs` | number | No | Milliseconds to wait between retry attempts. Only applies when retryCount > 0. |
| `catchErrorTypes` | enum | No | Filter which error types trigger the catch path. Options: `all` (default), `network`, `timeout`, `validation`, `execution`. |
| `propagateOnUncaught` | boolean | No | When true, errors not matched by catchErrorTypes are re-thrown and halt the workflow instead of being silently swallowed. Defaults to true. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The data payload passed into the wrapped node group. Forwarded unchanged to the first node inside the try block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Emits the result of the wrapped nodes when execution completes without error. |
| `error` | error object | Emits the caught error object when a wrapped node fails. Includes `message`, `code`, `nodeId` (failing node), and `attempt` (after retries are exhausted). |

## Example

```json
{
  "nodeType": "try_catch",
  "config": {
    "label": "Call External Scoring API",
    "retryCount": 2,
    "retryDelayMs": 500,
    "catchErrorTypes": "network",
    "propagateOnUncaught": true
  }
}
```
