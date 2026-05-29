---
title: MCP Server Setup
description: Step-by-step guide to connecting Claude Code, Cursor, or Claude.ai to the LenserFight MCP server — locally or via LF Cloud.
---

# MCP Server Setup

The **LenserFight MCP server** exposes your lenses, battles, workflows, and runs as callable tools that any [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) client can use. Once connected, you can ask Claude things like:

- *"Search my lenses for a code review template, then run it on this file."*
- *"List my open battles and rank them by votes."*
- *"Start a workflow run for workflow X with inputs {topic: React}."*

Three connection modes are supported. Pick the one that matches your client and environment:

| Mode | Client | Setup time | Requires local repo? |
|---|---|---|---|
| [LF Cloud](#mode-1-lf-cloud-claude-ai-web-any-http-client) | Claude.ai web, any HTTP MCP client | ~2 min | No |
| [stdio](#mode-2-stdio-claude-code-cursor-desktop) | Claude Code CLI, Cursor, any child-process MCP client | ~3 min | Yes |
| [HTTP + tunnel](#mode-3-http--tunnel-claude-ai-web-local-dev) | Claude.ai web (local dev) | ~8 min | Yes |

---

## Mode 1: LF Cloud (Claude.ai web, any HTTP client)

**Use this when:** you want to connect Claude.ai or another HTTP MCP client to LenserFight without running anything locally.

The LenserFight MCP server is available at a stable public endpoint proxied through Cloudflare:

**MCP Endpoint URL:**

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

### Step 2 — Sign in

Claude.ai opens an authorization popup served by the LF Cloud MCP server.

Sign in with your **LenserFight account** (the same email and password you use at [lenserfight.com](https://lenserfight.com)). Your account must have completed the onboarding flow (choosing a handle) before you can authorize.

If sign-in fails:

| Error | Cause | Fix |
|---|---|---|
| **Sign-in failed** | Wrong email or password | Try signing in at lenserfight.com first to confirm your credentials |
| **No Lenser profile found** | Account exists but onboarding was never completed | Sign in at lenserfight.com, complete the handle selection step, then retry |

### Step 3 — Test the connection

Back in Claude.ai, start a new chat and ask:

> "Use the LenserFight connector to list my lenses."

Claude calls `lens_list` and responds. If it works, the integration is healthy.

### Cursor / other HTTP MCP clients

Add a remote MCP entry pointing to the same URL:

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

Before starting:

1. **A running local Supabase instance.** From the repo root:
   ```bash
   supabase start
   ```
   Verify with `supabase status` — Studio should appear at `http://127.0.0.1:54323`.

2. **The database seed loaded.** The seed runs automatically on the first `supabase start`. It creates sample lenses, battles, and the `@lenserfight` profile.

3. **Node.js 22+** and **pnpm 9+** installed.

4. **The MCP server built:**
   ```bash
   pnpm nx build mcp-server
   ```
   Output lands at `dist/apps/mcp-server/main.js`.

### Environment variables

| Variable | Required | What it does |
|---|---|---|
| `SUPABASE_URL` | Yes | Local: `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role JWT. Copy from `supabase status -o env` |
| `SUPABASE_ANON_KEY` | Yes | Anon JWT. Copy from `supabase status -o env` |
| `SUPABASE_JWT_SECRET` | Yes | Local default: `super-secret-jwt-token-with-at-least-32-characters-long` |
| `LENSERFIGHT_LENSER_ID` | No | Scope tool calls to a specific lenser UUID |
| `MCP_TRANSPORT` | No | Set to `stdio` (default) |

> **Local credentials are safe to commit.** Every `supabase start` produces the same well-known keys and JWT secret. Do not reuse these values in production.

### Step 1 — Create a local env file

```bash
# .env.mcp.local  ← add this file to .gitignore, do not commit
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
export SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
export MCP_TRANSPORT=stdio
# Optional: uncomment and set to scope tool calls to your lenser profile
# export LENSERFIGHT_LENSER_ID=<your-lenser-uuid>
```

Source it before launching your client:

```bash
source ./.env.mcp.local
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

Claude calls `lens_list` and returns the result.

> **Security note:** stdio mode runs with the service role key, which bypasses RLS. Keep `.env.mcp.local` out of version control and do not share your shell session.

---

## Mode 3: HTTP + tunnel (Claude.ai web, local dev)

**Use this when:** you are developing locally and want Claude.ai (the web app) to connect to your local MCP server — for example, to test changes before deploying to LF Cloud.

> **Why a tunnel is mandatory:** Claude.ai's OAuth token exchange happens server-side from Anthropic's cloud infrastructure. Your browser can reach `localhost`, but Anthropic's servers cannot — you need a public HTTPS URL that forwards to your local server.

### Prerequisites

Same as [Mode 2 prerequisites](#prerequisites-1), plus a tunnel tool:

- **ngrok** (recommended — auto-detected): [ngrok.com/download](https://ngrok.com/download)
- **cloudflared** (alternative): requires setting `MCP_OAUTH_BASE_URL` manually

### Step 1 — Start a tunnel

**With ngrok (auto-detected):**

```bash
ngrok http 3001
```

The server reads the public URL from ngrok's local API on startup — you don't need to copy or paste anything. Your terminal will show a line like:

```
Forwarding   https://<random-id>.ngrok-free.app -> http://localhost:3001
```

**With cloudflared:**

```bash
cloudflared tunnel --url http://localhost:3001
```

Then set the URL manually before starting the server:

```bash
export MCP_OAUTH_BASE_URL=https://<your-id>.trycloudflare.com
```

**With any other tunnel:** set `MCP_OAUTH_BASE_URL` to its HTTPS URL before starting.

### Step 2 — Build and start the MCP server

Make sure your env vars are sourced (see [Mode 2 Step 1](#step-1--create-a-local-env-file)), then:

```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
node dist/apps/mcp-server/main.js
```

On success, you'll see a startup banner:

```
[lenserfight-mcp] auto-detected public tunnel: https://<your-tunnel-url>.ngrok-free.app
[lenserfight-mcp] HTTP transport ready on http://localhost:3001/mcp

  ┌─ Local dev OAuth credentials ──────────────────────────────────┐
  │  OAuth Client ID : lf_mcp_client_localdev                      │
  │  Auth method     : PKCE (no client secret required)            │
  │  Server base URL : https://<your-tunnel-url>.ngrok-free.app    │
  │                                                                 │
  │  Claude.ai → Settings → Connectors → Add connector:            │
  │    URL       : https://<your-tunnel-url>.ngrok-free.app/mcp    │
  │    Client ID : lf_mcp_client_localdev                          │
  └─────────────────────────────────────────────────────────────────┘
```

If you see a `PUBLIC URL REQUIRED` warning, either the tunnel is not running or was not auto-detected. Set `MCP_OAUTH_BASE_URL` manually and restart.

### Step 3 — Add the connector in Claude.ai

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Fill in:
   - **Name:** `LenserFight Local`
   - **Remote MCP server URL:** the tunnel URL from the startup banner **plus `/mcp`**. Example: `https://<your-tunnel>.ngrok-free.app/mcp`
   - **OAuth Client ID (optional):** `lf_mcp_client_localdev`
   - **OAuth Client Secret (optional):** leave blank — PKCE only.
3. Click **Add**.

### Step 4 — Sign in

Claude.ai opens an authorization popup served by your local MCP server.

Sign in with **any LenserFight account that has a Lenser profile.** The seed creates the `@lenserfight` profile — to use it, set a known password in Supabase Studio's SQL editor (`http://127.0.0.1:54323`):

```sql
UPDATE auth.users
   SET encrypted_password = extensions.crypt('localdev123', extensions.gen_salt('bf'))
 WHERE email = 'hey@lenserfight.com';
```

Then sign in with `hey@lenserfight.com` / `localdev123`.

If sign-in fails:

| Error | Cause | Fix |
|---|---|---|
| **Sign-in failed** | Wrong email or password | Use the SQL above to set a known password |
| **No Lenser profile found** | The auth account has no Lenser profile | Open the LenserFight web app, sign in, complete onboarding, then retry the connector flow |

### Step 5 — Test it

Back in Claude.ai, start a new chat and ask:

> "Use the LenserFight Local connector to list my lenses."

Claude calls `lens_list` and responds.

### Reconnecting after a restart

ngrok free tier assigns a **new URL on every restart**. After restarting ngrok:

1. Restart the MCP server — it auto-detects the new URL.
2. In Claude.ai, **delete and re-add** the connector with the updated URL.

The OAuth client `lf_mcp_client_localdev` and its database row are recreated on every server boot — a DB reset does not break it.

---

## What you can do once connected

Available tool families — see the full parameter tables in the tool reference pages:

- **[Lens tools](./tools-lens)** — `lens_list`, `lens_search`, `lens_get`, `lens_run`, `lens_find_and_run`, `lens_create`, `lens_update`, `lens_fork`, `lens_versions`, and more
- **[Battle tools](./tools-battle)** — `battle_list`, `battle_get`, `battle_create`, `battle_add_contender`, `battle_submit_run`, `battle_score`, `battle_set_status`, `battle_history`
- **[Workflow tools](./tools-workflow)** — `workflow_list`, `workflow_get`, `workflow_create`, `workflow_run`, `workflow_run_status`, `workflow_run_logs`, `workflow_retry`, `workflow_summarize`

### Daily usage examples

**Discover and run a lens by topic:**
> "Use `lens_find_and_run` with query='logo brief'. Ask me for any missing parameters."

The tool returns either a `resolved_prompt` (Claude executes it immediately) or a `needs_params` list with the labels it still needs from you.

**Run a known lens with parameters:**
> "Call `lens_run` with `lens_id=<uuid>` and `param_values={Topic: 'TypeScript', Language: 'English'}`."

**Browse your battles:**
> "List my last 10 battles using `battle_list`."

**Start and monitor a workflow:**
> "Create a workflow named 'Daily Summary', start a run with empty inputs, then poll `workflow_run_status` until it completes."

### How `lens_run` works

`lens_run` only **resolves the template** — it substitutes `[[Parameter]]` tokens with the values you supply and returns the finished prompt string. The calling AI model (Claude) is what actually executes that prompt. The flow is:

1. You ask: *"Use the logo brief lens for ACME Corp."*
2. Claude calls `lens_find_and_run(query='logo brief', param_values={Brand: 'ACME Corp'})`.
3. The server returns `{ resolved_prompt: "Generate a logo brief for ACME Corp...", lens_title: "Logo Brief", ... }`.
4. Claude executes the resolved prompt and returns the output to you.

If required parameters are missing, the tool returns `MISSING_PARAMS` with the exact labels — Claude asks you for them and retries automatically.

---

## Troubleshooting

### `mcp_token_exchange_failed` in Claude.ai

Almost always means the discovery document advertises a localhost URL that Anthropic's cloud cannot reach.

1. Confirm the startup banner shows your **tunnel URL**, not `http://localhost:…`.
2. Confirm the connector URL in Claude.ai matches the tunnel URL exactly — with `/mcp` at the end.
3. If you restarted ngrok, the URL changed — **delete and re-add** the connector.

### `401 Unauthorized` on `POST /mcp`

The bearer token is not being recognised. Most likely causes: the token was revoked by a DB reset, or the auth code expired (5-minute window). Re-open the connector settings in Claude.ai and re-authorize.

### `Sign-in failed`

The email and password do not match a Supabase auth user. Run the `UPDATE auth.users` SQL above with a password you know.

### `No Lenser profile found`

The auth account exists but never completed the onboarding flow. Sign in to the LenserFight web app, pick a handle, then retry the connector authorization.

### `PUBLIC URL REQUIRED` warning at startup

The tunnel was not detected. Either start ngrok first (`ngrok http 3001`) or set `MCP_OAUTH_BASE_URL=https://your-public-url` before running `node dist/apps/mcp-server/main.js`.

### `WARN: environment variable is unset`

You forgot to source your env file. Run `source ./.env.mcp.local` before starting the server.

---

## Verifying the end-to-end connection

After connecting in any mode, run this two-step check:

> "List my lenses using the LenserFight connector, then describe the first result in detail."

Claude should call `lens_list`, then `lens_get` on the first ID. If both succeed, the integration is healthy.

You can also hit the health endpoint directly:

```bash
# LF Cloud
curl https://mcp.lenserfight.com/health

# Local HTTP mode
curl https://<your-tunnel>/health

# Expected response
{"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Reference

- MCP specification: <https://modelcontextprotocol.io/docs/getting-started/intro>
- Claude.ai custom connectors: <https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp>
- OAuth 2.1 + PKCE (RFC 7636): <https://datatracker.ietf.org/doc/html/rfc7636>
- Dynamic client registration (RFC 7591): <https://datatracker.ietf.org/doc/html/rfc7591>
- Protected resource metadata (RFC 9728): <https://datatracker.ietf.org/doc/html/rfc9728>
