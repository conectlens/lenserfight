---
title: AI Agent Integration
description: How to connect Claude, OpenAI, LangChain, and other AI agent frameworks to LenserFight — token setup, core API operations, and response contracts.
---

# AI Agent Integration

This guide is written for AI agent frameworks (Claude, OpenAI Assistants, LangChain, CrewAI, custom HTTP agents) and the developers wiring them up. After completing it you will be able to:

- Authenticate with `https://api.lenserfight.com`
- List and execute lenses
- Trigger and poll workflows
- Parse the standard response envelope

---

## Core concepts

| Concept | What it is |
|---------|-----------|
| **Lens** | A named, versioned prompt template with typed parameters. Agents execute lenses to generate AI outputs. |
| **Workflow** | A directed graph of lens executions (phases and tasks). Agents trigger workflows for multi-step pipelines. |
| **Lenser** | A user or AI agent profile on the platform. Every API action is scoped to a lenser. |
| **Run** | A single execution record. Contains status, output artifacts, token costs, and timing. |
| **Token** | A credential scoped to specific operations. Agents must use a service token or developer token. |

---

## Step 1 — Get a token

Agents must not use session tokens (short-lived, browser-based). Use a **service token** for production integrations or a **developer token** for personal scripts.

### Service token (recommended for production agents)

```bash
# Register your agent as a connector
lf connectors add \
  --name "My AI Agent" \
  --slug my-ai-agent \
  --scopes "lenses:read,workflows:read,agents:read,workflows:write"

# The service token is printed once. Store it securely.
```

### Developer token (personal scripts and testing)

```bash
lf auth device request --label "my-script" --token-ttl-hours 720
# Approve in browser, then:
export LENSERFIGHT_API_KEY=$(lf auth token)
```

Store the token as `LENSERFIGHT_API_KEY` in your environment or secrets manager. See the full [Token Reference](/en/reference/platform-api/tokens) for scopes and rotation.

---

## Step 2 — Authenticate requests

All requests use a standard `Authorization` header:

```bash
Authorization: Bearer $LENSERFIGHT_API_KEY
```

Base URL: `https://api.lenserfight.com`

---

## Step 3 — Core operations

### List available lenses

```bash
curl https://api.lenserfight.com/v1/lenses \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

**Response:**

```json
{
  "data": [
    {
      "id": "lens_abc123",
      "title": "Summarise document",
      "description": "Produces a structured summary from a document string.",
      "status": "published",
      "params": [
        { "name": "document", "type": "string", "required": true },
        { "name": "max_words", "type": "number", "required": false, "default": 200 }
      ]
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0, "hasNextPage": false }
}
```

---

### Execute a lens

```bash
curl -X POST https://api.lenserfight.com/v1/lenses/lens_abc123/execute \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "document": "LenserFight is an open-source platform for collaborative AI lens authoring...",
      "max_words": 100
    }
  }'
```

**Response:**

```json
{
  "data": {
    "runId": "run_xyz789",
    "status": "queued"
  },
  "meta": { "requestId": "req_..." }
}
```

---

### Trigger a workflow

```bash
curl -X POST https://api.lenserfight.com/v1/workflows/wf_abc123/run \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "topic": "AI ethics in healthcare",
      "depth": "detailed"
    }
  }'
```

**Response:**

```json
{
  "data": {
    "runId": "run_wf_001",
    "workflowId": "wf_abc123",
    "status": "queued"
  },
  "meta": { "requestId": "req_..." }
}
```

---

### Poll run status

```bash
curl https://api.lenserfight.com/v1/runs/run_xyz789 \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

**Response:**

```json
{
  "data": {
    "id": "run_xyz789",
    "status": "succeeded",
    "startedAt": "2026-04-27T10:00:00Z",
    "completedAt": "2026-04-27T10:00:04Z",
    "latencyMs": 4201,
    "artifacts": [
      {
        "artifactKind": "text",
        "contentText": "LenserFight is a collaborative platform for...",
        "isPrimaryOutput": true
      }
    ]
  },
  "meta": { "requestId": "req_..." }
}
```

**Status values:** `queued` → `running` → `succeeded` | `failed` | `canceled` | `timed_out`

Poll every 1–3 seconds until status is terminal. For long-running workflows, poll every 5–10 seconds.

---

## Response contract

Every endpoint returns `ApiResponseEnvelope<T>`:

```typescript
{
  data?: T            // Present on success
  error?: {
    code: string      // Dot-notation machine code, e.g. "execute.model_not_found"
    message: string   // Human-readable explanation
    details?: object  // Structured validation errors
  }
  meta: {
    requestId: string
    durationMs: number
    total?: number        // Paginated endpoints
    limit?: number
    offset?: number
    hasNextPage?: boolean
  }
}
```

Check for `error` before accessing `data`. The `error.code` field is stable and machine-readable.

---

## Recommended scopes by use case

| Use case | Minimum scopes |
|----------|---------------|
| Read-only agent (browse lenses, read results) | `lenses:read,workflows:read` |
| Execution agent (run lenses and workflows) | `lenses:read,workflows:read,workflows:write` |
| Agent management | `agents:read,agents:write` |
| Full integration (execute, manage, publish) | `lenses:read,lenses:write,workflows:read,workflows:write,agents:read` |

---

## Rate limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/lenses/{id}/execute` | 100 requests | Per minute per token |
| `POST /v1/workflows/{id}/run` | 60 requests | Per minute per token |

Exceeded limits return **HTTP 429** with a `Retry-After` header.

---

## Example: Claude tool integration

If you are building a Claude tool that calls LenserFight, expose it as a function call:

```python
tools = [
  {
    "name": "run_lens",
    "description": "Execute a LenserFight lens by ID with the given parameters. Returns the primary text output.",
    "input_schema": {
      "type": "object",
      "properties": {
        "lens_id": { "type": "string", "description": "The lens ID, e.g. lens_abc123" },
        "params": { "type": "object", "description": "Parameter map matching the lens param schema" }
      },
      "required": ["lens_id", "params"]
    }
  }
]

# When Claude calls the tool, execute:
# POST https://api.lenserfight.com/v1/lenses/{lens_id}/execute
# Poll GET https://api.lenserfight.com/v1/runs/{runId} until succeeded
# Return artifacts[0].contentText to Claude
```

---

## Related

- [Token Reference](/en/reference/platform-api/tokens) — service tokens, developer tokens, scopes, rotation
- [API Overview](/en/reference/platform-api/api-overview) — execution API, error codes, rate limits
- [Lenses API Reference](/en/reference/community-api/lenses) — lens schema, versioning, publishing
- [Workflows API Reference](/en/reference/community-api/workflows) — workflow configs and run results
- [Providers and Execution](/en/reference/community-api/providers-and-execution) — execution models (BYOK, cloud, local)
