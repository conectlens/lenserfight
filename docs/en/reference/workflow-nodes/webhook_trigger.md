---
title: Webhook Trigger
description: Starts the workflow when an HTTP request arrives at the auto-generated webhook URL.
---

# Webhook Trigger

## Overview

The Webhook Trigger node exposes a unique HTTPS endpoint for the workflow. When an external system sends an HTTP request to that URL, LenserFight authenticates the caller according to the configured `auth` method and then starts a workflow run, passing the request body and headers as the initial payload. The endpoint URL is generated at publish time and is stable for the lifetime of the workflow. This node is always the first node in the graph.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `method` | `"POST"` \| `"GET"` | No | `"POST"` | Accepted HTTP method. Requests using any other method receive `405 Method Not Allowed`. |
| `auth` | `"none"` \| `"bearer"` \| `"hmac"` | No | `"none"` | Authentication strategy. `"bearer"` validates the `Authorization: Bearer <secret>` header. `"hmac"` validates an HMAC-SHA256 signature in the `X-LF-Signature` header. |
| `secret` | string | No | — | The token or HMAC key used for validation. Required when `auth` is `"bearer"` or `"hmac"`. Stored encrypted at rest. |
| `response_mode` | `"immediate"` \| `"last_node_output"` | No | `"immediate"` | `"immediate"` returns `202 Accepted` with a run ID straight away. `"last_node_output"` holds the HTTP connection open until the workflow finishes and returns the final node's output as the response body. |

## Inputs

This node has no upstream inputs — it is the workflow entry point.

| Port | Type | Description |
|---|---|---|
| — | — | No inputs; this node initiates the run. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `body` (parsed JSON or raw string from the request body), `headers` (key-value map of request headers), `query` (key-value map of query string parameters), and `received_at` (ISO-8601 timestamp). |

## Example

```json
{
  "nodeType": "webhook_trigger",
  "config": {
    "method": "POST",
    "auth": "hmac",
    "secret": "whsec_your_signing_secret_here",
    "response_mode": "immediate"
  }
}
```

## Notes

- The webhook URL follows the pattern `https://api.lenserfight.io/webhooks/<workflow_id>` and is shown in the Studio after first publish. Rotating the URL requires regenerating the workflow ID, which is a destructive operation.
- HMAC validation computes `HMAC-SHA256(secret, raw_request_body)` and compares it against the hex digest in `X-LF-Signature`. Requests with an invalid or missing signature receive `401 Unauthorized`.
- `response_mode: "last_node_output"` keeps the connection open for up to 30 seconds; workflows that may take longer should use `"immediate"` and poll the run status endpoint instead.
- When `auth` is `"none"`, anyone with the URL can trigger the workflow. Prefer `"bearer"` or `"hmac"` for any production endpoint that triggers writes.
