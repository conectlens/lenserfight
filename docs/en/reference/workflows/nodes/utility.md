---
title: Utility Nodes | Workflow Node Reference
description: Reference for all Utility nodes in LenserFight Workflow Studio — logging, debugging, caching, rate limiting, secret resolution, and no-op placeholders.
---

# Utility Nodes

Utility nodes handle cross-cutting concerns: logging, debugging, rate limiting, caching, secret resolution, retry policies, and placeholder steps during workflow design.

| Node | Type | Output |
|------|------|--------|
| [Logger](#logger) | `logger` | `json` |
| [Debug Inspector](#debug-inspector) | `debug_inspector` | `json` |
| [Secret Resolver](#secret-resolver) | `secret_resolver` | `json` |
| [Rate Limit](#rate-limit) | `rate_limit` | `json` |
| [Cache Read](#cache-read) | `cache_read` | `json` |
| [Cache Write](#cache-write) | `cache_write` | `json` |
| [Retry](#retry) | `retry` | `json` |
| [No-Op](#noop) | `noop` | `any` |

---

## Logger {#logger}

**Type:** `logger` · **Category:** Utility

Write a structured log entry for debugging and audit trails. Use as the final node of any important branch to capture the result.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `input` | `any` | No |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `result` | `json` | `{ logged: true, level: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Log message template. Supports <code v-pre>{{variable}}</code> interpolation. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `level` | `select` | `info` | `debug` · `info` · `warn` · `error` |
| `includeInput` | `boolean` | `false` | When `true`, attaches the upstream payload to the log entry. |

### Example

```json
{
  "level": "info",
  "message": "Digest delivered: {{$.messageId}}",
  "includeInput": true
}
```

**Scenario:** Audit an email delivery at the end of the weekly digest workflow.

**Expected output:** `{ "logged": true, "level": "info" }`

### When to Use

- At the end of any branch to capture final state.
- After communication nodes to record delivery status.
- After write operations (KV, storage, leaderboard) to confirm success.
- As the downstream of `stop_return` or `error_catch` for terminal logging.

### Common Mistakes

- Placing Logger before the final delivery node — Logger should be the last step, not before `email_send`.
- Using `includeInput: true` in high-volume pipelines — this writes the full payload to the log; omit it for rate-limited or large-array workflows.

### Related Nodes

[Debug Inspector](#debug-inspector) · [Error Catch](./logic#error-catch) · [Email Send](./communication#email-send)

---

## Debug Inspector {#debug-inspector}

**Type:** `debug_inspector` · **Category:** Utility

Expose upstream payload shape in manual executions. Use during workflow design to inspect what data is available at each step.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `capturePaths` | `json` | Array of paths to capture (e.g. `["$", "$.documents[0].metadata"]`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `redactSecrets` | `boolean` | `true` |

### Example

```json
{
  "capturePaths": ["$", "$.documents[0].metadata"],
  "redactSecrets": true
}
```

**Expected output:** `{ "inspection": { "keys": ["documents", "summary"] } }`

### When to Use

- During workflow design to verify path names before writing downstream config.
- Before an `embedding` or `rag_retrieval` node to check that `documents` has the expected shape.

### Execution Notes

- Debug Inspector is a no-op in production executions — it only emits detailed inspection data in manual/development mode.
- Always remove or replace Debug Inspector before publishing a production workflow.

### Related Nodes

[Logger](#logger) · [No-Op](#noop)

---

## Secret Resolver {#secret-resolver}

**Type:** `secret_resolver` · **Category:** Utility

Resolve a named secret reference for downstream server-side nodes. Use when a node's configuration cannot use <code v-pre>{{secrets.keyName}}</code> inline syntax and needs the resolved value as a payload field.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `secretRef` | `string` | Secret name registered in workspace secret storage. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `exposeAs` | `string` | Output key name (e.g. `githubToken`). Defaults to `secretRef`. |

### Example

```json
{
  "secretRef": "github-api-token",
  "exposeAs": "githubToken"
}
```

**Expected output:** <code v-pre>{ "githubToken": "{{resolved-secret-ref}}" }</code> (value is masked in logs)

### Execution Notes

- Resolved values are never logged, even with `logger` and `includeInput: true`.
- Runs in `server` / `worker` environments only — secrets are not available in browser-only executions.

### Related Nodes

[HTTP Request](./storage#http-request) · [Logger](#logger)

---

## Rate Limit {#rate-limit}

**Type:** `rate_limit` · **Category:** Utility

Throttle workflow items by key and limit. Use before high-volume API calls to avoid hitting external rate limits.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `limit` | `number` | Maximum requests allowed within the window. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `key` | `string` | Rate limit key (e.g. `github-api`). Defaults to the workflow id. |
| `windowSeconds` | `number` | `60` |

### Example

```json
{
  "key": "github-api",
  "limit": 30,
  "windowSeconds": 60
}
```

**Expected output:** `{ "allowed": true, "remaining": 29 }`

### When to Use

- Before `github_read`, `http_request`, or any integration that has per-minute quotas.
- In `loop_map` workflows processing many items against an external API.

### Common Mistakes

- Setting `windowSeconds` too low for bursty loops — items will be dropped or delayed.
- Not using `key` — without a key, the limit applies globally to all workflows.

### Related Nodes

[Retry](#retry) · [Loop / Map](./logic#loop-map) · [HTTP Request](./storage#http-request)

---

## Cache Read {#cache-read}

**Type:** `cache_read` · **Category:** Utility

Read cached data by key. Use to avoid redundant expensive operations (API calls, AI generations, DB queries) within a time window.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Cache key (e.g. `rss:github-blog:last-summary`). |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `result` | `json` | `{ hit: boolean, value: any }` |

### Example

```json
{ "key": "rss:github-blog:last-summary" }
```

**Expected output:** `{ "hit": true, "value": { "summary": "..." } }`

### When to Use

- Before an RSS fetch or API call to return cached results when fresh data is not needed.
- Pair with `if_condition` to skip expensive steps on cache hit: `$.hit === true`.

### Related Nodes

[Cache Write](#cache-write) · [If / Condition](./logic#if-condition) · [KV Read](./storage#kv-store-read)

---

## Cache Write {#cache-write}

**Type:** `cache_write` · **Category:** Utility

Write data to cache by key with an optional TTL.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Cache key. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `valuePath` | `string` | `$` | Path to the value to cache. |
| `ttlSeconds` | `number` | `3600` |

### Example

```json
{
  "key": "rss:github-blog:last-summary",
  "valuePath": "$.summary",
  "ttlSeconds": 3600
}
```

**Expected output:** `{ "written": true }`

### Related Nodes

[Cache Read](#cache-read) · [KV Write](./storage#kv-store-write)

---

## Retry {#retry}

**Type:** `retry` · **Category:** Utility

Retry an upstream operation branch with a configured backoff policy.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `attempts` | `number` | Maximum retry attempts. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `backoffMs` | `number` | `2000` |
| `retryOn` | `json` | `["timeout", "rate_limit"]` | Error types to retry on. |

### Example

```json
{
  "attempts": 3,
  "backoffMs": 2000,
  "retryOn": ["timeout", "rate_limit"]
}
```

**Expected output:** `{ "attempts": 2, "succeeded": true }`

### When to Use

- Around `http_request`, `rss_feed`, or any integration node that may transiently fail.
- Around AI generation nodes (`text_to_image`, `text_to_video`) that have provider-side queuing.

### Related Nodes

[Error Catch](./logic#error-catch) · [Rate Limit](#rate-limit) · [Wait / Delay](./logic#wait-delay)

---

## No-Op {#noop}

**Type:** `noop` · **Category:** Utility

Pass input through unchanged. Use as a placeholder node while designing a workflow graph.

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Human-readable label describing intent (e.g. `"placeholder while designing PR review workflow"`). |

### Example

```json
{ "label": "placeholder while designing PR review workflow" }
```

**Expected output:** `{ "output": "unchanged" }` *(upstream payload passes through)*

### When to Use

- As a placeholder to complete a graph edge during design before the real node is decided.
- As a bypass node in A/B testing branches where one branch intentionally does nothing.

### Related Nodes

[Debug Inspector](#debug-inspector) · [Stop / Return](./logic#stop-return)

---

**See also:** [Node Catalog Index](./) · [Logic Nodes](./logic) · [Storage Nodes](./storage) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
