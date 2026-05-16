---
title: Storage & I/O Nodes | Workflow Node Reference
description: Reference for all Storage and I/O nodes in LenserFight Workflow Studio — Supabase, SQL, KV store, file I/O, HTTP, webhook, and GraphQL.
---

# Storage & I/O Nodes

Storage nodes read and write data from databases, file storage, KV caches, and external HTTP services.

| Node | Type | Output |
|------|------|--------|
| [Supabase Query](#supabase-query) | `supabase_query` | `json` |
| [SQL Query](#sql-query) | `sql_query` | `json` |
| [KV Read](#kv-store-read) | `kv_store_read` | `json` |
| [KV Write](#kv-store-write) | `kv_store_write` | `json` |
| [File Reader](#file-reader) | `file_reader` | `file` |
| [File Writer](#file-writer) | `file_writer` | `file` |
| [Object Storage Upload](#object-storage-upload) | `object_storage_upload` | `file` |
| [Object Storage Download](#object-storage-download) | `object_storage_download` | `file` |
| [Webhook Send](#webhook-sender) | `webhook_sender` | `json` |
| [HTTP Request](#http-request) | `http_request` | `json` |
| [GraphQL Request](#graphql-request) | `graphql_request` | `json` |

---

## Supabase Query {#supabase-query}

**Type:** `supabase_query` · **Category:** Storage & I/O

Run an allowed Supabase RPC or table query using server-side credentials.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `rpcName` | `string` | RPC name or table identifier (e.g. `workflows.fn_recent_battle_results`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `params` | `json` | — | RPC parameters. |
| `timeoutMs` | `number` | `15000` |

### Example

```json
{
  "rpcName": "workflows.fn_recent_battle_results",
  "params": { "window": "7d" }
}
```

**Expected output:** `{ "rows": [{ "battleId": "battle_123", "winner": "sourced" }] }`

**Downstream:** → `aggregate`

### Execution Notes

- Only RPCs and tables allowed by the workflow execution security policy are accessible.
- Runs in `worker` / `server` environment.

---

## SQL Query {#sql-query}

**Type:** `sql_query` · **Category:** Storage & I/O

Run a parameterized SQL query in an approved environment.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `query` | `template` | Parameterized SQL with `:param` placeholders. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `params` | `json` | — | Query parameters. |
| `timeoutMs` | `number` | `15000` |

### Example

```json
{
  "query": "select title, winner from arena.battles where created_at >= :since",
  "params": { "since": "$.firedAt" }
}
```

**Downstream:** → `data_mapper`

---

## KV Read {#kv-store-read}

**Type:** `kv_store_read` · **Category:** Storage & I/O

Read a value from workflow KV storage by key.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Storage key (e.g. `digest:lastSuccessfulRun`). |

### Example

```json
{ "key": "digest:lastSuccessfulRun" }
```

**Expected output:** `{ "value": "2026-05-09T08:00:00Z" }`

**Downstream:** → `supabase_query` with `{ "since": "$.value" }`

---

## KV Write {#kv-store-write}

**Type:** `kv_store_write` · **Category:** Storage & I/O

Write a value to workflow KV storage with an optional TTL.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Storage key. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `valuePath` | `string` | — | Path to the value to store (e.g. `$.completedAt`). |
| `ttlSeconds` | `number` | — | Time-to-live in seconds. |

### Example

```json
{ "key": "digest:lastSuccessfulRun", "valuePath": "$.completedAt", "ttlSeconds": 604800 }
```

---

## File Reader {#file-reader}

**Type:** `file_reader` · **Category:** Storage & I/O

Read text or binary file content from a URL or object storage.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | Source type: `url` or `object-storage`. |

### Example

```json
{
  "source": "object-storage",
  "bucket": "workflow-inputs",
  "objectKey": "$.fileKey"
}
```

**Expected output:** `{ "file": { "url": "https://storage.example.com/report.pdf", "mimeType": "application/pdf" } }`

**Downstream:** → `media_convert`

---

## File Writer {#file-writer}

**Type:** `file_writer` · **Category:** Storage & I/O

Write text, JSON, or binary output to a file destination.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `destination` | `string` | Destination type: `object-storage` or `local`. |

### Example

```json
{
  "destination": "object-storage",
  "bucket": "workflow-outputs",
  "objectKeyTemplate": "digests/{{runId}}.md",
  "contentPath": "$.summary"
}
```

**Downstream:** → `email_send`

---

## Object Storage Upload {#object-storage-upload}

**Type:** `object_storage_upload` · **Category:** Storage & I/O

Upload a file to object storage and return a public or signed URL.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `file` | `file` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `bucket` | `string` | Storage bucket name. |

### Example

```json
{
  "bucket": "workflow-artifacts",
  "objectKeyTemplate": "media/{{runId}}/{{filename}}",
  "filePath": "$.file.url"
}
```

**Downstream:** → `slack_notify`

---

## Object Storage Download {#object-storage-download}

**Type:** `object_storage_download` · **Category:** Storage & I/O

Download a file from object storage.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `bucket` | `string` | Storage bucket name. |

### Example

```json
{ "bucket": "workflow-artifacts", "objectKey": "$.objectKey" }
```

**Downstream:** → `image_analyze`

---

## Webhook Send {#webhook-sender}

**Type:** `webhook_sender` · **Category:** Storage & I/O

Send an outbound webhook request to an external service.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Target webhook URL or mapping. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `method` | `string` | `POST` | `POST` · `PUT` |
| `bodyPath` | `string` | `$` | — |

### Example

```json
{
  "url": "https://hooks.example.com/lenserfight",
  "method": "POST",
  "bodyPath": "$"
}
```

**Expected output:** `{ "status": 202, "responseBody": { "accepted": true } }`

---

## HTTP Request {#http-request}

**Type:** `http_request` · **Category:** Storage & I/O

Call an HTTP endpoint and return response data. Use for REST API calls, authentication flows, and external service integration.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Endpoint URL or mapping. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `method` | `string` | `GET` | `GET` · `POST` · `PUT` · `PATCH` · `DELETE` |
| `headers` | `json` | — | Request headers. |
| `body` | `json` | — | Request body. |

### Example

```json
{
  "url": "https://api.github.com/repos/org/repo/pulls/42",
  "method": "GET",
  "headers": { "Authorization": "Bearer {{secrets.github}}" }
}
```

**Expected output:** `{ "status": 200, "body": { "title": "Add catalog" } }`

**Downstream:** → `github_pr_review`

### Execution Notes

- Secrets referenced with `{{secrets.keyName}}` are resolved at runtime.
- `timeoutMs` defaults to `15000` ms.

---

## GraphQL Request {#graphql-request}

**Type:** `graphql_request` · **Category:** Storage & I/O

Call a GraphQL endpoint with a query and variables.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `query` | `string` | GraphQL query document. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `endpoint` | `string` | — |
| `variables` | `json` | — |

### Example

```json
{
  "endpoint": "https://api.github.com/graphql",
  "query": "query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){pullRequests(first:5){nodes{title}}}}",
  "variables": { "owner": "ofcskn", "repo": "lenserfight-web" }
}
```

**Downstream:** → `summarizer`

---

**See also:** [Node Catalog Index](./) · [Integration Nodes](./integration) · [Utility Nodes](./utility) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
