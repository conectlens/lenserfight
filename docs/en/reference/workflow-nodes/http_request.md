---
title: HTTP Request
description: Makes an outbound HTTP call to any URL and returns the status, headers, and body.
---

# HTTP Request

## Overview

The `http_request` node sends a single HTTP request to an external endpoint and passes the response into the workflow. It supports all common methods (GET, POST, PUT, PATCH, DELETE), custom headers, and an arbitrary body. Use it to call third-party REST APIs, push events to webhooks, or fetch remote data that feeds downstream nodes. The node does not retry automatically; wrap it in a `try_catch` node if resilience is needed.

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | Yes | — | The full URL to call, including scheme and path. Supports `&#123;&#123;variable&#125;&#125;` interpolation from workflow variables. |
| `method` | string | Yes | `"GET"` | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`. |
| `headers` | object | No | `{}` | Key-value map of request headers. Use this for `Authorization`, `Content-Type`, and other standard headers. |
| `body` | string | No | — | Request body as a raw string. For JSON payloads set `Content-Type: application/json` in `headers` and stringify the object. Ignored for GET and DELETE. |
| `timeout_ms` | number | No | `10000` | Maximum milliseconds to wait for a response before the node fails with a timeout error. |
| `follow_redirects` | boolean | No | `true` | Whether to automatically follow HTTP 3xx redirects. Set to `false` to capture the redirect response directly. |
| `response_encoding` | string | No | `"utf-8"` | Character encoding for the response body: `"utf-8"` or `"base64"`. Use `"base64"` for binary responses. |
:::

## Inputs

::: v-pre
| Port | Type | Description |
|---|---|---|
| `input` | object | Upstream data available for `&#123;&#123;variable&#125;&#125;` interpolation in `url`, `headers`, and `body`. |
:::

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `status` (number), `headers` (object), and `body` (string or parsed JSON if response `Content-Type` is `application/json`). |
| `error` | object | Present on network failure or timeout; contains `message`, `code`, and `status` (when the server responded with a 4xx/5xx). |

## Example

<div v-pre>

```json
{
  "nodeType": "http_request",
  "config": {
    "url": "https://api.example.com/v1/summarise",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
::: v-pre
      "Authorization": "Bearer {{env.API_KEY}}"
:::
    },
::: v-pre
    "body": "{\"text\": \"{{input.content}}\", \"max_words\": 100}",
:::
    "timeout_ms": 15000,
    "follow_redirects": true
  }
}
```

</div>

## Notes

- HTTP 4xx and 5xx responses are **not** automatically treated as errors — the node succeeds and the status code is available in `output.status`. Add a `switch` or `if_condition` node downstream to branch on status if needed.
::: v-pre
- Environment secrets (API keys, tokens) should be stored as workflow environment variables and referenced via `&#123;&#123;env.VARIABLE_NAME&#125;&#125;` rather than hardcoded in `headers` or `body`.
:::
- The node enforces a hard ceiling of 60 000 ms regardless of `timeout_ms` to prevent a single step from blocking the worker indefinitely.
- Response bodies larger than 10 MB are truncated; for large file transfers use `object_storage_upload` / `object_storage_download` nodes instead.
