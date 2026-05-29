---
title: Webhook Sender
description: Sends an HTTP request to an external webhook URL.
---

# Webhook Sender

## Overview

The Webhook Sender node sends an HTTP request to a configured external URL, forwarding workflow data as a JSON payload. Use it to notify third-party services, trigger external pipelines, or push battle results to custom integrations. The node supports configurable HTTP methods, custom headers, and optional authentication credentials. On non-2xx responses or network failures, execution routes to the error output port rather than halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | The fully qualified HTTPS URL to send the request to. |
| `method` | enum (POST, PUT, PATCH) | Yes | HTTP method used for the request. Defaults to POST. |
| `headers` | object | No | Key-value map of HTTP headers to include in the request (e.g. Content-Type, Authorization). |
| `authType` | enum (none, bearer, basic, hmac) | No | Authentication scheme to use. When set, the corresponding credential fields become required. |
| `authSecret` | string | No | Secret token or password used by the selected authType. Stored as an encrypted credential. |
| `timeoutMs` | number | No | Maximum milliseconds to wait for a response before treating the request as failed. Defaults to 5000. |
| `retryOnFailure` | boolean | No | When true, retries the request up to 3 times with exponential backoff before routing to the error port. |
| `bodyTemplate` | string | No | Handlebars template string for the request body. When omitted, the full input payload is serialized as JSON. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The payload to forward. Serialized as JSON and sent as the request body unless bodyTemplate overrides it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emits on a 2xx response. Contains the original input payload merged with a response envelope: { status, headers, body }. |
| `error` | object | Emits on network failure, timeout, or a non-2xx HTTP status. Contains { code, message, attempt } for downstream error handling. |

## Example

<div v-pre>

```json
{
  "nodeType": "webhook_sender",
  "config": {
    "url": "https://hooks.example.com/battle-results",
    "method": "POST",
    "authType": "bearer",
    "authSecret": "{{secrets.RESULTS_WEBHOOK_TOKEN}}",
    "timeoutMs": 8000,
    "retryOnFailure": true
  }
}
```

</div>

