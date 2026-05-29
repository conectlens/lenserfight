---
title: MCP Server Setup
description: Step-by-step guide to connecting Claude Code, Cursor, or Claude.ai to the LenserFight MCP server — locally or via LF Cloud.
---

# MCP Server Setup

The **LenserFight MCP server** exposes your lenses, battles, workflows, and AI Lensers as callable tools that any [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) client can use. Once connected, you can ask Claude things like:

- *"Search my lenses for a code review template, then run it on this file."*
- *"List my open battles and rank them by votes."*
- *"Create an AI Lenser called @reviewer and assign it the code-review tool."*

Three connection modes are supported. Pick the one that matches your client and environment:

| Mode | Client | Setup time | Requires local repo? |
|---|---|---|---|
| [LF Cloud](#mode-1-lf-cloud-claudeai-web-any-http-client) | Claude.ai web, any HTTP MCP client | ~2 min | No |
| [stdio](#mode-2-stdio-claude-code-cursor-desktop) | Claude Code CLI, Cursor, any child-process MCP client | ~3 min | Yes |
| [HTTP + tunnel](#mode-3-http--tunnel-claudeai-web-local-dev) | Claude.ai web (local dev) | ~8 min | Yes |

---

## Mode 1: LF Cloud (Claude.ai web, any HTTP client)

**Use this when:** you want to connect Claude.ai or another HTTP MCP client to LenserFight without running anything locally.

The LenserFight MCP server runs as a **Cloudflare Worker** at a stable public endpoint:

```
https://mcp.lenserfight.com/mcp
```

> This URL is stable and does not require a tunnel, a running local server, or any environment variables on your machine.

### Step 1 — Add the connector in Claude.ai

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Fill in:
   - **Name:** `LenserFight`
   - **Remote MCP server URL:** `https://mcp.lenserfight.com/mcp`
   - **OAuth Client ID (optional):** leave blank — the server registers a client automatically.
   - **OAuth Client Secret (optional):** leave blank — PKCE only, no secret required.
3. Click **Add**.

### Step 2 — Authorize

Claude.ai opens an authorization popup. You are redirected to **auth.lenserfight.com** — the LenserFight sign-in page — where you can sign in with any method (email/password, Google, GitHub, magic link, etc.).

After signing in you land on the consent screen. Click **Allow** to grant the connector access to your lenses, battles, workflows, and AI Lensers.

Your account must have completed the onboarding flow (choosing a handle) before you can authorize.

If authorization fails:

| Error | Cause | Fix |
|---|---|---|
| **No Lenser profile found** | Account exists but onboarding was never completed | The auth app automatically redirects to onboarding and completes authorization on return — no manual navigation needed. |
| **Authorization failed** | Session expired or was already used | Start the connector flow again from Claude.ai settings |

### Step 3 — Test the connection

Back in Claude.ai, start a new chat and ask:

> "Use the LenserFight connector to list my lenses."

Claude calls `list_lenses` and responds. If it works, the integration is healthy.

### Cursor / other HTTP MCP clients

```json
{
  "mcpServers": {
    "lenserfight": {
      "url": "https://mcp.lenserfight.com/mcp"
    }
  }
}
```

The client must support OAuth 2.1 PKCE. Authorization follows the same flow as Claude.ai above.

---

## Mode 2: stdio (Claude Code, Cursor desktop)

**Use this when:** you are working inside the LenserFight repository and your MCP client can spawn a child process (Claude Code CLI, Cursor, etc.). No network exposure needed.

### How it works

The client reads `.mcp.json` at the repo root and starts `node dist/apps/mcp-server/main.js` as a child process. Communication happens over stdin/stdout. The service role key bypasses RLS, so the server can read and write on behalf of any lenser.

### Prerequisites

1. A running local Supabase instance: `supabase start`
2. Node.js 22+ and pnpm 9+
3. The MCP server built: `pnpm nx build mcp-server`

### Step 1 — Fill in `.env.mcp.local`

The repo ships `apps/mcp-server/.env.mcp.local` as a template. Fill in your local credentials:

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<from: supabase status>
export SUPABASE_ANON_KEY=<from: supabase status>
export SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
export MCP_TRANSPORT=stdio
# export LENSERFIGHT_LENSER_ID=<your-lenser-uuid>
```

> **Local credentials are safe to commit.** Every `supabase start` produces the same well-known keys and JWT secret. Do not reuse these values in production.

Source it before launching your client:

```bash
source apps/mcp-server/.env.mcp.local
```

### Step 2 — Confirm `.mcp.json` exists

The repo ships [`.mcp.json`](../../../../.mcp.json) at the root:

```json
{
  "mcpServers": {
    "lenserfight": {
      "command": "node",
      "args": ["dist/apps/mcp-server/main.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "SUPABASE_JWT_SECRET": "${SUPABASE_JWT_SECRET}",
        "LENSERFIGHT_LENSER_ID": "${LENSERFIGHT_LENSER_ID}",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Step 3 — Open Claude Code in the repo

Launch Claude Code from inside the repo root. It auto-discovers `.mcp.json` and registers the `lenserfight` server. Type `/mcp` to confirm the server is listed.

### Step 4 — Try a tool

```
Use the lenserfight MCP server to list my lenses.
```

> **Security note:** stdio mode runs with the service role key, which bypasses RLS. Keep `.env.mcp.local` out of version control and do not share your shell session.

---

## Mode 3: HTTP + tunnel (Claude.ai web, local dev)

**Use this when:** you are developing locally and want Claude.ai to connect to your local MCP server — for example, to test changes before deploying to LF Cloud.

> **Why a tunnel is mandatory:** Claude.ai's OAuth token exchange happens server-side from Anthropic's cloud. Your browser can reach `localhost`, but Anthropic's servers cannot — you need a public HTTPS URL that forwards to your local server.

### Step 1 — Start a tunnel

```bash
ngrok http 3001
```

The server auto-detects the ngrok URL from its local API on startup.

### Step 2 — Build and start the MCP server

```bash
source apps/mcp-server/.env.mcp.local
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
pnpm nx build mcp-server --skip-nx-cache
node dist/apps/mcp-server/main.js
```

On success the startup banner shows the connector URL:

```
[lenserfight-mcp] auto-detected public tunnel: https://<your-tunnel>.ngrok-free.app
[lenserfight-mcp] HTTP transport ready on http://localhost:3001/mcp

  ┌─ Local dev OAuth credentials ──────────────────────────────────┐
  │  OAuth Client ID : lf_mcp_client_localdev                      │
  │  Server base URL : https://<your-tunnel>.ngrok-free.app        │
  │  Claude.ai URL   : https://<your-tunnel>.ngrok-free.app/mcp    │
  └─────────────────────────────────────────────────────────────────┘
```

### Step 3 — Add the connector in Claude.ai

1. **Remote MCP server URL:** `https://<your-tunnel>.ngrok-free.app/mcp`
2. **OAuth Client ID (optional):** `lf_mcp_client_localdev`
3. **OAuth Client Secret:** leave blank.

### Step 4 — Authorize via the local auth app

The local auth app must be running:

```bash
pnpm nx serve auth
```

Sign in at `http://localhost:3004` with any account that has a Lenser profile, then click **Allow**.

### Reconnecting after a restart

ngrok free tier assigns a new URL on every restart. After restarting ngrok:

1. Restart the MCP server — it auto-detects the new URL.
2. In Claude.ai, delete and re-add the connector with the updated URL.

---

## Deploying LF Cloud (contributors)

If you have Cloudflare access to the `lenserfight-mcp` Worker:

### Step 1 — Fill in `apps/mcp-server/.env.local`

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

This file is gitignored. Never commit it.

### Step 2 — Push secrets

```bash
pnpm nx run mcp-server:"secrets:push"
```

This reads `.env.local` and pushes each key as a Wrangler secret to the `lenserfight-mcp` Worker — equivalent to running `wrangler secret put` for each variable.

### Step 3 — Build and deploy

```bash
pnpm nx run mcp-server:deploy
```

This builds the Worker bundle (`src/worker.ts` → `dist/apps/mcp-server/worker.js` via esbuild) then runs `wrangler deploy`. The Cloudflare dashboard build pipeline runs the same steps automatically on push to `main`.

### Step 4 — Verify

```bash
curl https://mcp.lenserfight.com/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## What you can do once connected

Available tool families — 42 tools total:

- **[Lens tools](./tools-lens)** — `list_lenses`, `search_lenses`, `get_lens`, `run_lens`, `find_and_run_lens`, `create_lens`, `update_lens`, `fork_lens`, `list_lens_versions`, `get_lens_version`, `archive_lens`, `delete_lens`, `set_lens_visibility`, `validate_lens_params`, `extract_lens_params`
- **[Battle tools](./tools-battle)** — `list_battles`, `get_battle`, `create_battle`, `add_battle_contender`, `submit_battle_run`, `get_battle_score`, `set_battle_status`, `get_battle_history`
- **[Workflow tools](./tools-workflow)** — `list_workflows`, `get_workflow`, `create_workflow`, `run_workflow`, `get_workflow_run_status`, `get_workflow_run_logs`, `retry_workflow`, `summarize_workflow`
- **[Agent tools](./tools-agent)** — `list_ai_lensers`, `get_ai_lenser`, `create_ai_lenser`, `update_ai_lenser`, `archive_ai_lenser`, `list_agent_tools`, `assign_agent_tool`, `revoke_agent_tool`, `run_agent_action`, `start_agent_team_run`, `cancel_agent_run`, `list_agent_run_events`

### Daily usage examples

**Discover and run a lens by topic:**
> "Use `find_and_run_lens` with query='logo brief'. Ask me for any missing parameters."

**Run a known lens with parameters:**
> "Call `run_lens` with `lens_id=<uuid>` and `param_values={Topic: 'TypeScript', Language: 'English'}`."

**Browse your battles:**
> "List my last 10 battles."

**Create and run an AI Lenser:**
> "Create an AI Lenser called @reviewer, then start a team run with task 'Review this PR description'."

---

## Troubleshooting

### `mcp_token_exchange_failed` in Claude.ai

Almost always means the discovery document advertises a localhost URL that Anthropic's cloud cannot reach.

1. Confirm the startup banner shows your **tunnel URL**, not `http://localhost:…`.
2. Confirm the connector URL in Claude.ai matches the tunnel URL exactly — with `/mcp` at the end.
3. If you restarted ngrok, the URL changed — **delete and re-add** the connector.

### `401 Unauthorized` on `POST /mcp`

The bearer token is not being recognised. Re-authorize the connector in Claude.ai settings.

### Consent page shows a blank page or 404 (local tunnel mode)

The local auth app is not running. Start it with `pnpm nx serve auth`.

### `No Lenser profile found`

The auth account exists but never completed the onboarding flow. The auth app automatically redirects to onboarding and completes authorization on return.

### `PUBLIC URL REQUIRED` warning at startup

The tunnel was not detected. Either start ngrok first (`ngrok http 3001`) or set `MCP_OAUTH_BASE_URL=https://your-public-url` before running the server.

### `WARN: environment variable is unset`

You forgot to source your env file. Run `source apps/mcp-server/.env.mcp.local` before starting the server.

---

## Verifying the end-to-end connection

After connecting in any mode:

```bash
# LF Cloud
curl https://mcp.lenserfight.com/health

# Local HTTP mode
curl https://<your-tunnel>/health

# Expected
{"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

Then in Claude.ai:
> "List my lenses using the LenserFight connector, then describe the first result in detail."

Claude should call `list_lenses`, then `get_lens` on the first ID. If both succeed, the integration is healthy.

---

## Reference

- MCP specification: <https://modelcontextprotocol.io/docs/getting-started/intro>
- Claude.ai custom connectors: <https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp>
- OAuth 2.1 + PKCE (RFC 7636): <https://datatracker.ietf.org/doc/html/rfc7636>
- Dynamic client registration (RFC 7591): <https://datatracker.ietf.org/doc/html/rfc7591>
- Protected resource metadata (RFC 9728): <https://datatracker.ietf.org/doc/html/rfc9728>
