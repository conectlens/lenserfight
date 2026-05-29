---
title: Error Catch
description: Catches errors from upstream nodes and routes them to a handler.
---

# Error Catch

## Overview

The Error Catch node intercepts errors thrown by any upstream node in the workflow and routes execution to a designated error-handling path instead of halting the workflow. Attach it to any node whose failure should be recoverable — for example, a flaky external API call or an AI lens that may time out. It exposes the caught error object on its output so downstream nodes can inspect, log, or remediate the failure.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `catchNodeId` | string | No | ID of the specific upstream node whose errors this node should catch. Leave empty to catch errors from any connected upstream node. |
| `errorTypes` | enum | No | Filter by error category. Accepted values: 'any' (default), 'timeout', 'rate_limit', 'validation', 'execution'. When set, only matching error types are caught; others propagate normally. |
| `passThrough` | boolean | No | When true, the original upstream output (if partially produced before failure) is forwarded alongside the error object. Defaults to false. |
| `maxRetries` | number | No | Number of times to silently retry the failing upstream node before treating it as a caught error and routing to the handler path. Defaults to 0 (no retries). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Receives the output or error signal from any connected upstream node. If the upstream node succeeds, execution passes through unchanged on the 'output' port. If it fails, the error is captured and emitted on the 'error' port. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | Emits the upstream node's result when no error occurred. Execution continues on the normal workflow path. |
| `error` | object | Emits a structured error object when an upstream failure is caught. Shape: { nodeId: string, errorType: string, message: string, timestamp: string, retries: number }. |

## Example

```json
{
  "nodeType": "error_catch",
  "config": {
    "catchNodeId": "lens-run-7f3a",
    "errorTypes": "timeout",
    "passThrough": false,
    "maxRetries": 2
  }
}
```
