---
title: Workflow Integration Nodes
description: Use HTTP request, webhook, and communication integration nodes in LenserFight workflows — configure credentials, handle errors, and connect to external services.
head:
  - - meta
    - name: og:title
      content: Workflow Integration Nodes — LenserFight Advanced
  - - meta
    - name: og:description
      content: Learn how to use HTTP, webhook, Slack, GitHub, and other integration nodes in LenserFight workflows.
---

# Workflow Integration Nodes

## Goal

Add integration nodes (HTTP requests, webhooks, and communication nodes) to a workflow. Understand how to configure credentials, pass data from upstream nodes, handle errors, and keep provider secrets server-side.

## Target Reader

A developer building a LenserFight workflow that needs to call an external API, send a Slack message, read from GitHub, or receive a webhook trigger.

## Prerequisites

- [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow) completed
- [Workflow DAG Data Flow](/en/tutorials/advanced/workflow-dag-data-flow) completed — you understand edge mappings and `sourceOutputKey`
- [Environment Secrets Security](/en/tutorials/advanced/environment-secrets-security) read — you understand the VITE_ boundary rule

---

## Integration Node Categories

The workflow execution engine supports several categories of nodes that interact with external services. This tutorial covers the most commonly used ones.

### HTTP and Webhooks

| Node type | What it does |
|---|---|
| `http_request` | Send an HTTP GET/POST/PUT/PATCH/DELETE to any URL |
| `webhook_trigger` | Start a workflow when an external service POSTs to a generated webhook URL |
| `webhook_sender` | POST a JSON payload to an external webhook URL |
| `graphql_request` | Execute a GraphQL query or mutation against an external endpoint |

### Communication

| Node type | What it does |
|---|---|
| `slack_notify` | Send a message to a Slack channel |
| `discord_notify` | Send a message to a Discord channel |
| `discord_notify` | Send a message to a Telegram chat |
| `email_send` | Send an email via a configured SMTP provider |
| `push_notification` | Send a mobile push notification |

### Code Platform Integration

| Node type | What it does |
|---|---|
| `github_read` | Read a file, repo metadata, or issue from GitHub |
| `github_pr_review` | Post a review comment on a GitHub pull request |
| `github_issue_create` | Create a GitHub issue |

### Productivity and Project Management

These node types are defined in the execution engine. They require external service credentials configured in the platform key store or via BYOK before they will execute successfully.

| Node type | External service |
|---|---|
| `notion_read` | Notion |
| `notion_write` | Notion |
| `google_sheets_read` | Google Sheets |
| `google_sheets_write` | Google Sheets |
| `calendar_create` | Google Calendar |
| `linear_issue_create` | Linear |
| `jira_issue_create` | Jira |
| `asana_task_create` | Asana |
| `monday_item_create` | Monday.com |

**Setup note for productivity integrations:** These node types require OAuth credentials or API tokens for the respective services. Credential configuration is done via the platform key store (`lf keys set`) or Supabase secrets for self-hosted instances. Contact your platform admin if credentials are not yet configured for your community.

---

## Step 1: Add an HTTP request node

The `http_request` node is the most general integration — it calls any HTTP endpoint.

In the workflow canvas:

1. Click **Add Node**
2. Search for **HTTP Request** or type `http_request`
3. Drop it onto the canvas

In the node config panel:

| Field | Description |
|---|---|
| **Method** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| **URL** | The endpoint URL (can reference upstream output via edge) |
| **Headers** | Key-value pairs; reference secrets with <code v-pre>{{ secret:MY_API_KEY }}</code> |
| **Body** | JSON payload (POST/PUT/PATCH only) |
| **Timeout** | Request timeout in milliseconds (default: 30000) |

Example: fetch a JSON response from a public API.

```
Method: GET
URL: https://api.example.com/data/[[topic]]
Headers: { "Accept": "application/json" }
```

The `[[topic]]` parameter is filled by an incoming edge from an upstream node or from a root input.

The node output follows the standard envelope:

```
{
  mediaType: "json",
  data: { ...parsed JSON body },
  text: "stringified body",
  durationMs: 142
}
```

Use `data.someField` or `data` as the `sourceOutputKey` in downstream edges to reference the JSON response.

---

## Step 2: Reference upstream node output in a URL or body

Connect an upstream node's output to the HTTP request node. Example: the upstream node extracts a GitHub repo slug from a user prompt, and you want to use it in the API URL.

**Edge configuration:**

- Source node: "Extract Slug" (upstream text node)
- Source output key: `text`
- Target node: "Fetch Repo" (http_request)
- Target parameter: `repo_slug`

**Node URL field:**
```
https://api.github.com/repos/[[repo_slug]]
```

At execution time, `[[repo_slug]]` is replaced with the text output from "Extract Slug" before the HTTP call is made.

---

## Step 3: Secure credentials in headers

**Never put API keys directly in the URL or body field.** Use the secret reference syntax:

```
Headers:
  Authorization: Bearer {{ secret:GITHUB_API_TOKEN }}
  X-API-Key: {{ secret:MY_SERVICE_KEY }}
```

The <code v-pre>{{ secret:NAME }}</code> syntax resolves at execution time from the platform key store. Secrets are:
- Never included in workflow definitions stored in the database
- Never visible in workflow editor UI (only the reference name is shown)
- Only resolved server-side by the execution engine — never sent to the browser

To register a secret in the key store:
```bash
lf keys set GITHUB_API_TOKEN ghp_your_token_here
```

For self-hosted deployments, secrets are stored in Supabase's encrypted secrets store and set via:
```bash
pnpm supabase secrets set GITHUB_API_TOKEN=ghp_your_token_here
```

**Critical rule:** `SUPABASE_SERVICE_ROLE_KEY` and AI provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc.) must never be placed in workflow node config fields directly. They belong in the key store and referenced via <code v-pre>{{ secret:NAME }}</code>.

---

## Step 4: Add a webhook trigger

A `webhook_trigger` node generates a unique URL that starts the workflow when an external service POSTs to it.

1. Add a `webhook_trigger` node as the first node in your workflow (no incoming edges — it is always a root node)
2. The node generates a webhook URL after you save the workflow
3. Click the node to copy the URL — register it with your external service

The node output envelope passes the full webhook payload as `data`:

```
{
  mediaType: "json",
  data: { ...webhook POST body }
}
```

Downstream nodes can access the payload fields via edge mappings:
- Source output key: `data.eventType` → passes only the `eventType` field
- Source output key: `data` → passes the full payload object

**Signature verification:** The platform signs each webhook delivery with an HMAC-SHA256 signature in the `X-LenserFight-Signature` header. Validate it in your receiving service if you need to verify origin — see [Connectors](/en/tutorials/agent-walkthroughs/connectors) for the verification pattern.

---

## Step 5: Send a Slack notification

The `slack_notify` node sends a message to a Slack channel.

**Prerequisites:** A Slack Bot Token must be registered in the key store:
```bash
lf keys set SLACK_BOT_TOKEN xoxb-your-token
```

**Node config:**

| Field | Description |
|---|---|
| **Channel** | Slack channel ID (e.g., `C01234ABCDE`) or `#channel-name` |
| **Text** | Message content — supports upstream output references via `[[param]]` |
| **Token key** | Secret reference name — e.g., `SLACK_BOT_TOKEN` |

Example: notify a Slack channel when a workflow run produces a result.

Wire the upstream node's `text` output to the `slack_notify` node's `text` parameter:

```
Edge: Summarizer → text → Slack Notifier → text
```

Node config:
```
Channel: #lenserfight-alerts
Text: [[text]]
Token key: SLACK_BOT_TOKEN
```

When the summarizer completes, the Slack message is sent automatically.

---

## Step 6: Read from GitHub

The `github_read` node reads a file, issue, or repo metadata from GitHub.

**Node config:**

| Field | Description |
|---|---|
| **Operation** | `file`, `issue`, `repo` |
| **Owner** | GitHub org or user (e.g., `conectlens`) |
| **Repo** | Repository name |
| **Path** | File path for `file` operation |
| **Token key** | Secret reference name — e.g., `GITHUB_API_TOKEN` |

Example: read the contents of `README.md` from a repo and pass it to a summarizer node.

```
Operation: file
Owner: [[repo_owner]]
Repo: [[repo_name]]
Path: README.md
Token key: GITHUB_API_TOKEN
```

The node output:
```
{
  mediaType: "text",
  text: "...file contents...",
  data: { sha, size, path }
}
```

Use `text` as the `sourceOutputKey` to pass the file content downstream.

---

## Step 7: Handle integration errors

Integration nodes can fail in ways that differ from AI model failures. Configure error handling explicitly.

### Retry policy

For transient failures (network blips, rate limits), configure retries on the node:

```
Retry attempts: 2
Backoff: 1000ms
Max backoff: 10000ms
Retry on: ['timeout', 'rate_limit', 'provider_error']
```

In the node config panel, find the **Retry** section and set these values.

### Error catch node

For non-retryable failures, add an `error_catch` node:

1. Add an `error_catch` node
2. Draw an edge from the integration node to the `error_catch` node
3. The `error_catch` node receives the error details when the integration node fails
4. Connect downstream handling (e.g., a Slack notification for the failure, or a fallback value setter)

The `error_catch` output:
```
{
  data: {
    error: "Request failed: 401 Unauthorized",
    nodeId: "...",
    nodeType: "http_request"
  }
}
```

### Status codes to handle

| Status | Meaning | Recommended action |
|---|---|---|
| `401` | Invalid or missing credential | Check secret reference name and key store value |
| `403` | Insufficient permission | Verify the token has required scopes |
| `404` | Resource not found | Check URL, repo name, or resource ID |
| `429` | Rate limited | Enable retry with backoff; reduce request frequency |
| `5xx` | External service error | Enable retry; consider a fallback node |

---

## Step 8: Inspect integration node output

During development, use the **dry run** feature to test without executing the full workflow:

```bash
lf workflow dry-run <workflow-id> --inputs '{"repo_owner":"conectlens","repo_name":"lenserfight"}'
```

The dry run executes the workflow in a sandbox and returns each node's output. Inspect the integration node output to verify the response structure before wiring downstream edges.

After a live run:
```bash
lf execution inspect <run-id>
```

This shows per-node status, output, duration, and any error messages.

---

## Credential Security Checklist

Before publishing a workflow that uses integration nodes:

- [ ] All API keys use <code v-pre>{{ secret:NAME }}</code> syntax — no hardcoded values in node fields
- [ ] Secrets are registered with `lf keys set` or `pnpm supabase secrets set`
- [ ] No `VITE_`-prefixed secrets are used in workflow node config (VITE_ variables go to the browser)
- [ ] The workflow definition (stored in the database) does not contain any credential strings
- [ ] `lf security audit` passes without credential warnings
- [ ] If the workflow is public, no secret references reveal internal naming conventions

---

## Common Issues

### Issue: <code v-pre>{{ secret:MY_KEY }}</code> resolves to an empty string

**Cause:** The secret is not registered in the key store for the current environment.

**Fix:**
```bash
lf keys list        # confirm the key name exists
lf keys set MY_KEY value
```
For self-hosted deployments:
```bash
pnpm supabase secrets list    # confirm the secret name
pnpm supabase secrets set MY_KEY=value
```

---

### Issue: HTTP node returns `401 Unauthorized`

**Cause:** The `Authorization` header is missing or the token is invalid.

**Fix:**
1. Verify the secret name in <code v-pre>{{ secret:NAME }}</code> matches exactly what is in the key store
2. Test the credential independently: `curl -H "Authorization: Bearer $(lf keys get MY_KEY)" https://api.example.com`

---

### Issue: Slack node executes but no message appears

**Cause:** The Slack Bot Token does not have `chat:write` permission for the target channel, or the channel ID is incorrect.

**Fix:**
1. In your Slack app settings, confirm the bot has `chat:write` scope
2. Confirm the channel ID (not just the name — use the channel's Settings > Copy link to get the ID)
3. Confirm the bot is invited to the channel: `/invite @your-bot-name` in Slack

---

### Issue: Webhook trigger URL is not shown after saving

**Cause:** The workflow must be saved before the platform generates the unique webhook URL.

**Fix:** Save the workflow first, then reopen the `webhook_trigger` node config. The URL appears in the **Webhook URL** field. Copy it and register it with your external service.

---

### Issue: Integration node output format is unexpected

**Cause:** Dot-path edge mappings like `data.items[0]` only work when the upstream node produces structured JSON in `data`. If the node produced a text response, use `text` instead.

**Fix:** Run `lf execution inspect <run-id>` and check the raw output envelope of the node. Use the actual field names you see there in your edge `sourceOutputKey`.

---

## Related Docs

- [Workflow DAG Data Flow](/en/tutorials/advanced/workflow-dag-data-flow) — Node wiring, edge mappings, variable scope
- [Environment Secrets Security](/en/tutorials/advanced/environment-secrets-security) — Secret placement and bundle auditing
- [Connectors](/en/tutorials/agent-walkthroughs/connectors) — Platform connectors (scoped API tokens for external services)
- [Debugging the CLI](/en/tutorials/advanced/debugging-the-cli) — Diagnose execution failures
- [Workflow Issues](/en/tutorials/troubleshooting/workflow-issues) — Common workflow troubleshooting
- [Workflow Node Catalog](/en/reference/workflows/workflow-node-catalog) — Full node type reference

## Next Tutorial

[Agent Orchestration](/en/tutorials/advanced/agent-orchestration) — Coordinate multi-agent teams with workflows.
