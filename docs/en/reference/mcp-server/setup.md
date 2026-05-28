---
title: MCP Server Setup
description: Step-by-step guide to running the LenserFight MCP server locally and connecting it to Claude.ai (web), Claude Code, Cursor, or any MCP-compatible client.
---

# MCP Server Setup

The **LenserFight MCP server** exposes your lenses, battles, workflows, and runs as a set of tools that any [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) client can call. Once connected, you can ask Claude things like:

- *"Search my lenses for a code review template, then run it on this file."*
- *"List my open battles and rank them by votes."*
- *"Start a workflow run for workflow X with inputs {topic: ...}."*

Three connection modes are supported. Pick the one that matches your client:

| Mode | Client | Setup time | Public URL needed? |
|---|---|---|---|
| [stdio](#mode-1-stdio-claude-code-cursor-desktop) | Claude Code CLI, Cursor, any child-process MCP client | ~2 min | No |
| [HTTP + tunnel](#mode-2-http-tunnel-claude-ai-web) | Claude.ai web | ~5 min | Yes (ngrok / cloudflared) |
| [Supabase Edge Function](#mode-3-supabase-edge-function-lf-cloud) | Claude.ai web, any HTTP MCP client, production | ~10 min | Built-in |

---

## Prerequisites

Before starting, you need:

1. **A working local Supabase instance.** Run `supabase start` from the repo root. Verify with `supabase status` — you should see Studio at `http://127.0.0.1:54323`.
2. **The seed loaded.** This creates the `hey@lenserfight.com` account, sample lenses, and the `@lenserfight` profile. The seed runs automatically the first time you `supabase start`.
3. **Node.js 22+** and **pnpm 9+** installed.
4. **The MCP server built once:**
   ```bash
   pnpm nx build mcp-server
   ```
   Output lands at `dist/apps/mcp-server/main.js`.

### Environment variables

| Variable | Required | Default | What it does |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | e.g. `http://127.0.0.1:54321` for local |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role JWT (bypasses RLS). For local: copy from `supabase status -o env` |
| `SUPABASE_ANON_KEY` | Yes | — | Anon JWT used for user-scoped clients |
| `SUPABASE_JWT_SECRET` | Yes | — | JWT secret. For local: `super-secret-jwt-token-with-at-least-32-characters-long` |
| `LENSERFIGHT_LENSER_ID` | No | — | Scope tool calls to this lenser UUID when the calling user is ambiguous (stdio only) |
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `MCP_HTTP_PORT` | No | `3001` | HTTP listen port |
| `MCP_OAUTH_BASE_URL` | No | auto-detected | Public URL advertised in OAuth discovery. The HTTP server auto-detects ngrok on startup; set this manually for cloudflared, tailscale, etc. |

> **Local-only credentials are safe to commit.** Every `supabase start` produces the same well-known JWT, anon key, and JWT secret. Don't reuse these values in production.

---

## Mode 1: stdio (Claude Code, Cursor desktop)

**Use this when:** your MCP client can spawn a child process (Claude Code CLI, Cursor, etc.). No network exposure needed.

### How it works

The client reads `.mcp.json` at the repo root and starts `node dist/apps/mcp-server/main.js` as a child process. Communication happens over stdin/stdout. The service role key bypasses RLS, so the server can do anything the calling user could do.

### Step 1 — Set environment variables

Create a shell snippet you can `source` before launching the client:

```bash
# .env.mcp.local (do not commit)
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
export SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
export MCP_TRANSPORT=stdio
# Optional: scope all tool calls to this lenser
# export LENSERFIGHT_LENSER_ID=b2000000-0000-0000-0000-000000000001
```

Then `source ./.env.mcp.local` in the terminal where you'll launch Claude Code.

### Step 2 — Verify `.mcp.json` exists

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

> **Security:** stdio mode runs with the service role key, which bypasses RLS. Keep `.env.mcp.local` out of version control. Don't share your shell session.

---

## Mode 2: HTTP + tunnel (Claude.ai web)

**Use this when:** you want to connect Claude.ai (the web app at claude.ai) to your local MCP server.

> **Why a tunnel is mandatory:** Claude.ai's OAuth and MCP requests come from Anthropic's cloud servers, not your browser. `http://localhost:3001` is unreachable from their cloud — you need a public HTTPS URL.

### Step 1 — Start a tunnel

The MCP server auto-detects ngrok on port `4040` and reads the public URL from it.

**With ngrok (recommended — auto-detected):**

```bash
ngrok http 3001
```

Output:
```
Forwarding   https://burdenless-rousingly-rosendo.ngrok-free.dev -> http://localhost:3001
```

**With cloudflared (you'll need to set `MCP_OAUTH_BASE_URL` manually):**

```bash
cloudflared tunnel --url http://localhost:3001
# Copy the printed https://....trycloudflare.com URL
export MCP_OAUTH_BASE_URL=https://your-tunnel.trycloudflare.com
```

**With any other tunnel:** set `MCP_OAUTH_BASE_URL` to its public HTTPS URL before starting the server.

### Step 2 — Start the MCP server

In a second terminal (with the same env vars sourced):

```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
node dist/apps/mcp-server/main.js
```

You should see:

```
[lenserfight-mcp] auto-detected public tunnel: https://burdenless-rousingly-rosendo.ngrok-free.dev
[lenserfight-mcp] HTTP transport ready on http://localhost:3001/mcp

  ┌─ Local dev OAuth credentials ───────────────────────────────────────┐
  │  OAuth Client ID : lf_mcp_client_localdev                            │
  │  Auth method     : PKCE (no client secret required)              │
  │  Server base URL : https://burdenless-rousingly-rosendo.ngrok-free.dev│
  │                                                                      │
  │  Claude.ai → Settings → Connectors → Add connector:                 │
  │    URL       : https://burdenless-rousingly-rosendo.ngrok-free.dev  │
  │    Client ID : lf_mcp_client_localdev                               │
  └──────────────────────────────────────────────────────────────────────┘
```

If you see a `⚠️ PUBLIC URL REQUIRED` warning instead, your tunnel isn't running or wasn't auto-detected. Set `MCP_OAUTH_BASE_URL` manually.

### Step 3 — Add the connector in Claude.ai

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Fill in:
   - **Name:** `LenserFight Local`
   - **Remote MCP server URL:** the full URL printed in the banner, **plus `/mcp`** at the end. E.g. `https://burdenless-rousingly-rosendo.ngrok-free.dev/mcp`
   - **OAuth Client ID (optional):** `lf_mcp_client_localdev`
   - **OAuth Client Secret (optional):** leave blank — this is a PKCE-only client
3. Click **Add**.

### Step 4 — Sign in

Claude.ai opens an authorization popup. The page is served from your MCP server.

Use a **LenserFight account that already has a Lenser profile**:

- **Email:** `hey@lenserfight.com` (or any other seeded / your own account)
- **Password:** the password you set for that account

> **Don't have a password?** The seed installs accounts with random UUIDs as passwords. For your personal `omer@omer.com`-style account or any seeded account, set a known password directly:
> ```sql
> UPDATE auth.users
>    SET encrypted_password = extensions.crypt('localdev123', extensions.gen_salt('bf'))
>  WHERE email = 'hey@lenserfight.com';
> ```
> Run this in Supabase Studio's SQL editor (`http://127.0.0.1:54323`) or via `psql`.

If sign-in fails, the form re-displays with the exact error. Two common cases:

- **"Sign-in failed"** — wrong email or password.
- **"No Lenser profile found"** — the auth account exists but never completed onboarding. Open the LenserFight web app, sign in there, pick a handle, then come back to the connector flow.

### Step 5 — Test it

Back in Claude.ai, start a new chat and ask:

> "Use the LenserFight Local connector to list my lenses."

Claude will call `lens_list` and respond.

### When you restart

- ngrok free tier assigns a **new URL on every restart**. After restarting ngrok:
  1. Restart the MCP server (auto-picks up the new URL).
  2. In Claude.ai, **delete and re-add** the connector with the new URL.
- The OAuth client `lf_mcp_client_localdev` and its DB row are recreated on every server boot via [`fn_mcp_ensure_local_dev_client`](../../../../supabase/migrations/20270529000001_mcp_local_dev_client_rpc.sql) — you never lose it from a DB reset.

---

## Mode 3: Supabase Edge Function (LF Cloud)

**Use this when:** you're deploying to production or want a permanent shared URL without running anything locally.

### How it works

The edge function at [`supabase/functions/lenserfight-mcp/`](../../../../supabase/functions/lenserfight-mcp/) runs in Deno on Supabase's infra. It handles OAuth, JWT validation, and all 30+ MCP tool calls. Sessions are tracked per Deno isolate.

### Step 1 — Deploy

```bash
supabase functions deploy lenserfight-mcp
```

Or via the Supabase dashboard.

### Step 2 — Set function secrets

```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
supabase secrets set SUPABASE_ANON_KEY=<anon-jwt>
supabase secrets set SUPABASE_JWT_SECRET=<jwt-secret>
```

The endpoint URL is `https://<project-ref>.supabase.co/functions/v1/lenserfight-mcp`.

### Step 3 — Add to Claude.ai

Same as [Mode 2 Step 3](#step-3--add-the-connector-in-claudeai), but the URL is `https://<project-ref>.supabase.co/functions/v1/lenserfight-mcp/mcp`.

### Endpoints exposed by the edge function

| Path | Method | Description |
|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | RFC 8414 OAuth discovery |
| `/.well-known/oauth-protected-resource` | GET | RFC 9728 protected resource metadata |
| `/.well-known/oauth-protected-resource/mcp` | GET | Same as above (path variant Claude.ai uses) |
| `/oauth/authorize` | GET | Login form (HTML) |
| `/oauth/login` | POST | Credential submit handler |
| `/oauth/token` | POST | Standard OAuth code exchange |
| `/oauth/register` | POST | RFC 7591 dynamic client registration |
| `/health` | GET | `{"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}` |
| `/mcp` | POST | MCP tool invocations (requires `Authorization: Bearer <token>`) |

---

## What you can do once connected

Available tool families (full list in the [tool reference](./tools.md) if present, or via `/mcp` in your client):

- **Lenses** — `lens_list`, `lens_search`, `lens_get`, `lens_run`, `lens_find_and_run`, `lens_create`, `lens_update`, `lens_fork`, `lens_versions`, …
- **Battles** — `battle_list`, `battle_history`, `battle_create`, `battle_get`, `battle_score`, `battle_submit_run`, …
- **Workflows** — `workflow_list`, `workflow_get`, `workflow_create`, `workflow_run`, `workflow_run_status`, `workflow_summarize`, `workflow_retry`, …

### Daily usage examples

**Discover and run a lens by topic:**
> "Use `lens_find_and_run` with query='logo brief' and run it. Ask me for any missing parameters."

The tool returns either a `resolved_prompt` (Claude executes it directly) or a `needs_params` list with the labels it needs.

**Run a known lens with parameters:**
> "Call `lens_run` with lens_id=`50000000-0001-0005-0001-000000000001` and param_values={Topic: 'TypeScript', Language: 'English'}."

**Browse your battles:**
> "List my last 10 battles with `battle_list`."

**Start and monitor a workflow:**
> "Create a workflow named 'Daily Summary', then start a run with empty inputs, then poll `workflow_run_status` until completed."

### How `lens_run` works (no LLM call from the server)

`lens_run` only **resolves the template** — it substitutes `[[Parameter]]` tokens with the values you supply and returns the resulting prompt. **The calling AI model (Claude) is what actually executes the prompt.** So the flow is:

1. You ask: *"Use the logo brief lens for ACME Corp."*
2. Claude calls `lens_find_and_run(query='logo brief', param_values={Brand: 'ACME Corp'})`.
3. The server returns `{ resolved_prompt: "Generate a logo brief for ACME Corp...", lens_title: "Lenser Logo Brief", ... }`.
4. Claude then runs that prompt and returns the result to you.

If required parameters are missing, the tool returns `MISSING_PARAMS` with the exact labels — Claude will ask you for them and retry automatically.

---

## Troubleshooting

### `mcp_token_exchange_failed` in Claude.ai

Almost always means the discovery document advertises a URL that Anthropic's cloud can't reach. Check:

1. The startup banner shows your **tunnel URL**, not `localhost`.
2. The connector URL in Claude.ai matches the tunnel URL exactly (with `/mcp` at the end).
3. If you restarted ngrok, the URL changed — **delete and re-add** the connector.

### `401 Unauthorized` on `POST /mcp`

The bearer token isn't being recognised. Most often: the auth code expired (5 min) or the token row was deleted (e.g. `supabase db reset`). Re-authorize in Claude.ai.

### `Sign-in failed`

The email/password doesn't match a Supabase auth user. Set a known password (see the SQL snippet in [Step 4](#step-4--sign-in)).

### `No Lenser profile found`

The auth user has no row in `lensers.profiles`. Either pick a seeded account (`hey@lenserfight.com`, `bit@chainabit.com`, `lets@conectlens.com`) or complete onboarding in the LenserFight web app first.

### `WARN: environment variable is unset`

You forgot to `source` your env file. The required vars are listed in [Prerequisites](#environment-variables).

### `Public URL required` warning at startup

Either:
- Start ngrok first (`ngrok http 3001`), or
- Set `MCP_OAUTH_BASE_URL=https://your-public-url` before `node dist/apps/mcp-server/main.js`.

---

## Verifying the connection end-to-end

After connecting in any mode, ask:

> "List my lenses using the lenserfight MCP server, then describe the first one in detail."

The assistant should call `lens_list`, then `lens_get` for the first id. If both succeed, the integration is healthy.

For deeper diagnostics, hit the health endpoint directly:

```bash
curl https://<your-tunnel>/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Reference

- MCP spec: <https://modelcontextprotocol.io/docs/getting-started/intro>
- Claude.ai custom connectors: <https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp>
- OAuth 2.1 + PKCE (RFC 7636): <https://datatracker.ietf.org/doc/html/rfc7636>
- Dynamic client registration (RFC 7591): <https://datatracker.ietf.org/doc/html/rfc7591>
- Protected resource metadata (RFC 9728): <https://datatracker.ietf.org/doc/html/rfc9728>
