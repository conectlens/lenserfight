# LenserFight MCP Server

A custom [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI assistants like Claude direct access to LenserFight's Lenses, Workflows, and Battles — without copy-pasting IDs, without switching apps.

---

## What is MCP?

Think of MCP as USB-C for AI: a single, open standard that lets any AI assistant talk to any data source or tool. Instead of pasting lens IDs into chat messages, you say *"run the `code-reviewer` lens with Topic=TypeScript"* and Claude calls `run_lens` directly.

MCP separates **servers** (tools that expose capabilities) from **clients** (the AI that uses them). This server is a **Resource Server** — it wraps LenserFight's Supabase database and exposes 30 typed tools.

> **This vs the generic Supabase MCP**: `mcp.supabase.com` gives an AI generic SQL access to any Supabase project. This server wraps LenserFight's *business logic* — `run_lens` resolves `[[Parameter]]` tokens from the database, `get_battle_score` fetches vote aggregates and AI judge verdicts, `summarize_workflow` calculates cost and duration. You get typed, safe, purpose-built tools, not raw SQL access.

---

## 30 Tools Across 3 Groups

| Group | Count | Purpose |
|---|---|---|
| **Lens** | 14 | Create, run, fork, version, and search prompt templates |
| **Battle** | 8 | Create battles, add contenders, submit runs, read scores |
| **Workflow** | 8 | Create, run, monitor, retry, and summarize workflow executions |

---

## Three Transport Modes

| Mode | Use Case | Auth | URL |
|---|---|---|---|
| **stdio** | Claude Code CLI, Cursor desktop | Service role key from env | No URL (process pipes) |
| **HTTP local** | Claude.ai web connector via ngrok | Bearer JWT (Supabase) | `http://localhost:3001/mcp` |
| **HTTP deployed** | Claude.ai web connector (production) | Bearer JWT (Supabase) | `https://<PROJECT>.supabase.co/functions/v1/lenserfight-mcp` |

---

## OAuth Architecture

LenserFight's **Supabase Auth** is the OAuth Authorization Server. This MCP server is the Resource Server. Claude.ai and Cursor are public OAuth clients (no client_id / client_secret needed — PKCE only).

```
Claude.ai / Cursor
    │  1. GET /.well-known/oauth-authorization-server
    ▼
MCP Server exposes discovery document pointing at Supabase Auth
    │  2. Redirect to Supabase Auth
    ▼
https://<PROJECT>.supabase.co/auth/v1/authorize
    │  3. User logs in via LenserFight auth app
    │  4. Supabase issues JWT (access token)
    ▼
Claude.ai / Cursor holds:  Authorization: Bearer <supabase-jwt>
    │  5. All tool calls include this header
    ▼
MCP Server validates JWT → sb.auth.getUser(token) → extracts lenser profile
```

**No client secret needed.** The discovery document advertises `token_endpoint_auth_methods_supported: ["none"]`, which tells clients PKCE is sufficient.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — bypasses RLS; keep secret |
| `SUPABASE_JWT_SECRET` | Yes (HTTP mode) | Used to validate Bearer JWTs in HTTP transport |
| `LENSERFIGHT_LENSER_ID` | No | Scopes list operations to a specific lenser in stdio mode |
| `MCP_TRANSPORT` | No | `stdio` (default) or `http` |
| `MCP_HTTP_PORT` | No | HTTP port (default: `3001`) |

---

## Setup — Transport 1: stdio (Claude Code CLI)

The simplest and most secure option. No network, no auth tokens, no browser.

**1. Build the server:**

```bash
pnpm nx build mcp-server
```

This produces `dist/apps/mcp-server/main.js`.

**2. Set environment variables** in your shell (add to `~/.bashrc` or `~/.zshrc`):

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
export SUPABASE_JWT_SECRET=your-jwt-secret
export LENSERFIGHT_LENSER_ID=your-lenser-uuid
```

**3. `.mcp.json`** in the repo root registers the server with Claude Code:

```json
{
  "mcpServers": {
    "lenserfight": {
      "command": "node",
      "args": ["dist/apps/mcp-server/main.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "SUPABASE_JWT_SECRET": "${SUPABASE_JWT_SECRET}",
        "LENSERFIGHT_LENSER_ID": "${LENSERFIGHT_LENSER_ID}",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Claude Code reads `.mcp.json` from the workspace root automatically. After reloading, the `lenserfight` server appears in the tool list.

**Test it:**
```
> List my lenses
> Run the code-reviewer lens with Topic=TypeScript Language=English
> Create a new battle: "Claude vs GPT on system design"
```

---

## Setup — Transport 2: HTTP Local + ngrok (Claude.ai Web Connector)

Use this when you want to connect Claude.ai (the web app) to your local machine.

**1. Build and start the HTTP server:**

```bash
pnpm nx build mcp-server
MCP_TRANSPORT=http SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=... \
  node dist/apps/mcp-server/main.js
# → [lenserfight-mcp] HTTP transport ready on port 3001
```

**2. Expose it with ngrok:**

```bash
ngrok http 3001
# → Forwarding https://xxxx-xxxx.ngrok-free.app → localhost:3001
```

**3. Add the ngrok URL as an allowed redirect URI** in Supabase Auth:
- Go to your Supabase project → Authentication → URL Configuration
- Add `https://xxxx-xxxx.ngrok-free.app/auth/callback` to Redirect URLs

**4. Add a custom connector in Claude.ai:**
- Claude.ai → Settings → Integrations → Add custom connector
- MCP server URL: `https://xxxx-xxxx.ngrok-free.app/mcp`
- Authentication: OAuth 2.0 (Claude.ai will discover the Supabase endpoints automatically via `/.well-known/oauth-authorization-server`)
- Authorize with your LenserFight account

Claude.ai now has access to all 30 LenserFight tools via OAuth.

---

## Setup — Transport 3: Supabase Edge Function (Deployed)

Use this for a permanent, public MCP endpoint — no local server, no ngrok.

**1. Set Edge Function secrets** (one-time):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set SUPABASE_JWT_SECRET=your-jwt-secret
# SUPABASE_URL is injected automatically in Edge Functions
```

**2. Deploy:**

```bash
supabase functions deploy lenserfight-mcp
```

**3. Add a custom connector in Claude.ai:**
- MCP server URL: `https://<PROJECT_REF>.supabase.co/functions/v1/lenserfight-mcp/mcp`
- Authentication: OAuth 2.0

> **Edge Function limitation:** Sessions are held in Deno isolate memory. A cold start loses active sessions; the MCP client reconnects automatically on the next call. This is transparent for tool calls.

---

## All 30 Tools

### Lens Tools (14)

#### `list_lenses`
List lenses with pagination and optional filters.

```json
{ "limit": 10, "offset": 0, "visibility": "public", "status": "published" }
```

#### `search_lenses`
Full-text search by query string.

```json
{ "query": "code review", "limit": 5 }
```

#### `get_lens`
Get a lens including its head version body and all parameters.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: lens metadata, `versions.template_body`, `version_parameters[{id, label, optional}]`.

#### `create_lens`
Create a new lens. Use `[[ParamName]]` for required parameters, `[[ParamName!]]` for optional ones.

```json
{
  "title": "Code Reviewer",
  "template_body": "Review the following [[Language]] code for [[ReviewType]] issues:\n\n[[Code]]",
  "visibility": "public",
  "params": [
    { "label": "Language", "optional": false },
    { "label": "Code", "optional": false },
    { "label": "ReviewType", "optional": true }
  ]
}
```

#### `update_lens`
Create a new immutable version of an existing lens. LenserFight uses immutable versioning — editing creates a new version and updates `head_version_id`.

```json
{
  "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "template_body": "Updated template: review [[Language]] code...",
  "params": [{ "label": "Language" }],
  "changelog": "Simplified parameter set"
}
```

#### `archive_lens`
Archive a lens. Archived lenses are hidden from default listings but not deleted.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

#### `delete_lens`
Soft-delete a lens. Requires `confirm: true` — this cannot be undone via the API.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "confirm": true }
```

#### `set_lens_visibility`
Change a lens's visibility tier.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "visibility": "community" }
```

Values: `public` (anyone can run), `community` (logged-in users), `private` (owner only).

#### `validate_lens_params`
Check whether a set of param values satisfies a lens version's schema. Useful before calling `run_lens`.

```json
{
  "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "param_values": { "Language": "TypeScript", "Code": "function foo() {}" }
}
```

Returns: `{ valid, missing, unknown }`.

#### `extract_lens_params`
Inspect a lens version to see its `[[Parameter]]` tokens and the parameter schema stored in the database.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `{ params[{id, label, optional}], tokens_in_template }`.

#### `run_lens`
**The key tool.** Resolves `[[:uuid]]` tokens in a lens template with provided values and returns the ready-to-use prompt. **Does NOT call an LLM** — the calling AI (Claude) executes the resolved prompt naturally.

Token resolution flow:
1. Fetch `head_version_id` from `lenses.lenses` (unless `version_id` given)
2. Fetch `template_body` from `lenses.versions`
3. Fetch `version_parameters` — `[{id, label, optional}]`
4. For each param: substitute `[[:uuid]]` with `values[label]` (case-insensitive)
5. Required param missing → return `MISSING_PARAMS` error with `missing` list
6. Optional param missing → replace token with `''`
7. If `workflow_id` provided: insert `workflow_runs` record (status=`pending`)

```json
{
  "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "param_values": {
    "Language": "TypeScript",
    "Code": "const x = 1",
    "ReviewType": "security"
  },
  "workflow_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

Returns: `{ resolved_prompt, run_id, lens_id, version_id, params_used, estimated_input_tokens, persisted }`.

#### `fork_lens`
Fork a lens into a new one, copying the template and parameter schema. The fork is linked to the source via `parent_lens_id`.

```json
{
  "source_lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "Code Reviewer — TypeScript Only",
  "visibility": "private"
}
```

#### `list_lens_versions`
List all versions of a lens, newest first.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `[{id, semver, created_at, changelog}]`.

#### `get_lens_version`
Get a specific version by `version_id` or `semver` string.

```json
{ "lens_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "semver": "1.2.0" }
```

---

### Battle Tools (8)

#### `list_battles`
List battles with filters.

```json
{ "limit": 10, "status": "voting", "battle_type": "ai_vs_ai" }
```

#### `get_battle`
Get full battle details: contenders, vote aggregates, entity maps.

```json
{ "battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

#### `create_battle`
Create a new battle. The `task_prompt` is what all competitors respond to.

```json
{
  "title": "System Design: Rate Limiter",
  "task_prompt": "Design a distributed rate limiter for 1M RPS. Include architecture, data store choice, and failure modes.",
  "battle_type": "ai_vs_ai",
  "judging_mode": "ai_judge",
  "max_contenders": 3
}
```

#### `add_battle_contender`
Add an AI model, lenser, or workflow as a contender. Slots are auto-assigned A, B, C, ...

```json
{
  "battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "contender_type": "ai_model",
  "display_name": "Claude Opus 4",
  "entity_id": "model-uuid",
  "entity_type": "model"
}
```

#### `submit_battle_run`
Submit a contender's output for scoring by the AI judge.

```json
{
  "battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "contender_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "output": "Here is my rate limiter design: ...",
  "model_key": "claude-opus-4",
  "tokens_used": 1842
}
```

#### `get_battle_score`
Read vote aggregates and AI judge verdicts for a battle.

```json
{ "battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `{ vote_aggregates, ai_judge_verdicts }`.

#### `set_battle_status`
Change a battle's status. The database enforces valid state transitions. Closing or archiving requires `confirm: true`.

```json
{ "battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "status": "open" }
```

Status progression: `draft → open → executing → voting → scoring → closed/published`.

#### `get_battle_history`
Get battles created by a lenser.

```json
{ "lenser_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "limit": 20 }
```

---

### Workflow Tools (8)

#### `list_workflows`
List workflows with pagination.

```json
{ "lenser_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "limit": 10 }
```

#### `get_workflow`
Get workflow details.

```json
{ "workflow_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

#### `create_workflow`
Create a new workflow.

```json
{
  "name": "Code Review Pipeline",
  "description": "Multi-step code review: lint, security, style",
  "lenser_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### `run_workflow`
Start a workflow run. Returns a `run_id` for polling.

```json
{
  "workflow_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "context_inputs": { "Language": "Go", "Code": "..." }
}
```

#### `get_workflow_run_status`
Poll the status and cost of a running workflow.

```json
{ "run_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `{ id, status, started_at, completed_at, spent_credits, budget_credits, cost_metadata }`.

Status values: `pending → running → completed | failed | cancelled`.

#### `get_workflow_run_logs`
Get node-level execution logs ordered by start time.

```json
{ "run_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `{ run, node_results[{node_id, status, output, tokens_used, cost_credits, ...}] }`.

#### `retry_workflow`
Retry a failed or cancelled run with the same inputs. Creates a new run linked via `parent_run_id`.

```json
{ "run_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

#### `summarize_workflow`
Aggregate run metrics: status, duration, credit cost, and node result counts.

```json
{ "run_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Returns: `{ status, duration_ms, spent_credits, budget_credits, cost_metadata, nodes: {total, completed, failed, skipped} }`.

---

## Token Resolution: How `run_lens` Works

LenserFight stores lens templates with `[[ParameterLabel]]` tokens (user-facing) that get translated to `[[:uuid]]` format in the database via `fn_replace_param_label_token`. The MCP server resolves these using TypeScript, not an LLM:

```
Template stored in DB:
  "Review [[:aaaaaaaa-0000-...]] code for [[:bbbbbbbb-0000-...]] issues: [[:cccccccc-0000-...]]"

Parameters:
  [{id: "aaaaaaaa-...", label: "Language", optional: false},
   {id: "bbbbbbbb-...", label: "ReviewType", optional: true},
   {id: "cccccccc-...", label: "Code", optional: false}]

Input: { Language: "TypeScript", Code: "const x = 1" }

Resolved:
  "Review TypeScript code for  issues: const x = 1"
  (ReviewType is optional, replaced with '')
```

The resolution is a **pure function** (`resolveTemplate`) with unit tests in `src/__tests__/lens-run.spec.ts`. No LLM is called — the calling AI (Claude) executes the resolved prompt naturally.

---

## Security Model

- **Service role key**: The Node.js server uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. This is intentional — the MCP server acts on behalf of the authenticated user or the configured `LENSERFIGHT_LENSER_ID`. Do not expose the service role key publicly.
- **JWT validation** (HTTP mode): Every `/mcp` request must carry `Authorization: Bearer <supabase-jwt>`. The token is validated via `sb.auth.getUser(token)`. Invalid tokens get `401 Unauthorized`.
- **Soft deletes**: `delete_lens` and battle archiving are soft-deletes. Data is never physically removed via these tools.
- **Confirmation guards**: `delete_lens` requires `confirm: true`. `set_battle_status` to `closed` or `archived` requires `confirm: true`.
- **Dev project only**: Do not point this server at a production Supabase project without additional access controls. The service role key has full database access.

---

## Audit Logging

The server writes to `audit.mcp_tool_calls` if the table exists. Schema:

```sql
create table audit.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  duration_ms int,
  success bool not null,
  error_code text,
  called_at timestamptz default now()
);
```

If the table does not exist, audit logging silently falls back to `process.stderr`.

---

## Architecture (GRASP/OOAD)

| Pattern | Applied |
|---|---|
| **Information Expert** | Each tool file owns its own Supabase query |
| **Controller** | `McpServer` is the system controller; tool groups are use-case controllers |
| **Creator** | `registerLensTools/registerBattleTools/registerWorkflowTools` own their registrations |
| **High Cohesion** | One file = one tool; one module = one transport |
| **Low Coupling** | Tools depend only on `getServiceClient()` + `types.ts` |
| **Protected Variation** | JWT middleware shields tools from transport/auth changes |
| **Pure Fabrication** | `audit.ts` is a cross-cutting service, not in the domain model |
| **Indirection** | `getServiceClient()` indirects tools from Supabase connection details |

---

## Troubleshooting

**`lenserfight` server doesn't appear in Claude Code**
- Confirm `pnpm nx build mcp-server` succeeded and `dist/apps/mcp-server/main.js` exists
- Confirm all three required env vars are set in your shell
- Reload Claude Code (`.mcp.json` is read on startup)

**`stdout contamination: framing error`**
- The server must never write to `stdout` (only `stderr`). If a tool uses `console.log`, replace with `process.stderr.write()`
- `audit.ts` logs to stderr automatically if the DB table is missing

**`schema "lenses" not found`**
- The service role key must be for the correct Supabase project
- Run `supabase status` to confirm the URL matches

**`MISSING_PARAMS` from `run_lens`**
- Call `extract_lens_params` first to see which parameters the lens needs
- Keys are case-insensitive: `"language"` matches `"Language"`

**`401 Unauthorized` (HTTP mode)**
- The Bearer token must be a valid Supabase JWT from the LenserFight auth app
- OAuth flow: authenticate at the `/auth/callback` URL, then use the returned access token

**`CONFIRM_REQUIRED`**
- `delete_lens` and `set_battle_status` to `closed`/`archived` need `"confirm": true` in the input

**Edge Function cold start**
- Sessions are in Deno isolate memory. Cold starts lose sessions; the MCP client reconnects automatically. This is normal behavior.
