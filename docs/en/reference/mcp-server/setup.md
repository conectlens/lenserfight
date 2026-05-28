---
title: MCP Server Setup
description: How to run the LenserFight MCP server locally (stdio), over HTTP with ngrok (Claude.ai web), or as a deployed Supabase edge function (LF Cloud with OAuth).
---

# MCP Server Setup

Three modes are available. Pick the one that matches your client and environment.

| Mode | Client | Required |
|---|---|---|
| [stdio](#mode-1-stdio) | Claude Code CLI, Cursor desktop | Build output + env vars |
| [HTTP + ngrok](#mode-2-http-local-ngrok) | Claude.ai web | Build output + env vars + ngrok |
| [Supabase Edge Function](#mode-3-supabase-edge-function) | Claude.ai web, any HTTP MCP client | Supabase project + deployed function |

---

## Prerequisites

Before any mode, build the server once:

```bash
pnpm nx build mcp-server
```

Output lands at `dist/apps/mcp-server/main.js`.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | Your Supabase project URL, e.g. `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role key. Bypasses RLS. Keep secret. |
| `SUPABASE_ANON_KEY` | Yes | — | Anon key for user-scoped HTTP clients |
| `SUPABASE_JWT_SECRET` | Yes | — | JWT secret for token validation |
| `LENSERFIGHT_LENSER_ID` | No | — | Scopes list/history queries to this lenser UUID when no lenser is passed by the tool call |
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `MCP_HTTP_PORT` | No | `3001` | HTTP server port (http mode only) |
| `MCP_OAUTH_BASE_URL` | No | `http://localhost:{port}` | Public base URL for OAuth discovery document (http mode only) |

Copy `.env.example` (if present) or create `.env` with these values before starting.

---

## Mode 1: stdio

**Use this for:** Claude Code CLI, Cursor desktop, or any MCP client that launches a child process.

### How it works

Claude Code reads `.mcp.json` at the repo root and spawns `node dist/apps/mcp-server/main.js` as a child process. Communication happens over stdin/stdout. Authentication uses the `SUPABASE_SERVICE_ROLE_KEY` directly — no Bearer tokens.

### Step 1 — Create `.env` (or set shell env vars)

```bash
export SUPABASE_URL=https://abc123.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
export SUPABASE_ANON_KEY=anon_key_here
export SUPABASE_JWT_SECRET=jwt_secret_here
export LENSERFIGHT_LENSER_ID=your-lenser-uuid   # optional
export MCP_TRANSPORT=stdio
```

### Step 2 — Build (if not done)

```bash
pnpm nx build mcp-server
```

### Step 3 — Verify `.mcp.json`

The repo already ships `.mcp.json`:

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

The `${VAR}` references are resolved from your shell environment at process start.

### Step 4 — Start Claude Code

Open (or reload) Claude Code inside this repo. It auto-discovers `.mcp.json`. The `lenserfight` server appears in the tool list. You can verify with `/mcp` in Claude Code.

### Security note

The service role key bypasses Row Level Security on every tool call. Do not commit it to source control. Keep stdio mode for local/trusted use only.

---

## Mode 2: HTTP + ngrok

**Use this for:** Claude.ai web when you want to keep the server running locally but expose it over a public URL.

### How it works

The server starts an HTTP listener (default port 3001). ngrok creates a public HTTPS tunnel to that port. You register the public URL in Claude.ai as an MCP connector. Each request carries a `Authorization: Bearer <token>` header that the server validates.

### Step 1 — Set env vars

```bash
export SUPABASE_URL=https://abc123.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
export SUPABASE_ANON_KEY=anon_key_here
export SUPABASE_JWT_SECRET=jwt_secret_here
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
```

Leave `MCP_OAUTH_BASE_URL` unset for now — you will update it after ngrok starts.

### Step 2 — Start ngrok

```bash
ngrok http 3001
```

Copy the HTTPS forwarding URL, e.g. `https://a1b2c3.ngrok-free.app`.

### Step 3 — Set the OAuth base URL

```bash
export MCP_OAUTH_BASE_URL=https://a1b2c3.ngrok-free.app
```

This value is embedded in the OAuth discovery document at `/.well-known/oauth-authorization-server`. Claude.ai reads it to find the authorize and token endpoints.

### Step 4 — Start the server

```bash
node dist/apps/mcp-server/main.js
```

You should see:

```
[lenserfight-mcp] http transport ready on port 3001
```

### Step 5 — Add to Claude.ai

1. Open **Claude.ai → Settings → MCP Connectors**.
2. Click **Add connector**.
3. Enter the ngrok URL, e.g. `https://a1b2c3.ngrok-free.app`.
4. Claude.ai fetches `/.well-known/oauth-authorization-server` and starts the OAuth PKCE flow.
5. Approve the authorization request. A session token is issued.

### Reconnecting after restart

ngrok free tier assigns a new URL on each restart. Update `MCP_OAUTH_BASE_URL`, restart the server, and re-register the new URL in Claude.ai.

---

## Mode 3: Supabase Edge Function

**Use this for:** Production / LF Cloud deployment. No local process required. Users authenticate via OAuth PKCE through their Supabase account.

### How it works

The edge function at `supabase/functions/lenserfight-mcp/` runs in Deno on Supabase's infrastructure. It handles OAuth discovery, JWT validation, and all 30 MCP tool calls. Sessions are tracked in memory per Deno isolate.

### Step 1 — Deploy the function

```bash
supabase functions deploy lenserfight-mcp
```

Or deploy via the Supabase dashboard.

### Step 2 — Set function secrets

```bash
supabase secrets set SUPABASE_URL=https://abc123.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
supabase secrets set SUPABASE_ANON_KEY=anon_key_here
supabase secrets set SUPABASE_JWT_SECRET=jwt_secret_here
```

The function URL is automatically `https://<project-ref>.supabase.co/functions/v1/lenserfight-mcp`.

### Step 3 — Add to Claude.ai

1. Open **Claude.ai → Settings → MCP Connectors**.
2. Click **Add connector**.
3. Enter your function URL: `https://<project-ref>.supabase.co/functions/v1/lenserfight-mcp`.
4. Claude.ai fetches the OAuth discovery document from `/.well-known/oauth-authorization-server` at that base URL.
5. Complete the OAuth PKCE authorization flow.

### Endpoints exposed by the edge function

| Path | Method | Description |
|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | OAuth discovery document |
| `/health` | GET | `{"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}` |
| `/mcp` | POST | MCP tool invocations (requires `Authorization: Bearer <jwt>`) |

### CORS

The edge function allows `Origin: *` with headers `Content-Type`, `Authorization`, and `mcp-session-id`.

---

## Verifying the connection

Once connected in any mode, ask your assistant:

> "List my lenses using the lenserfight MCP server."

The assistant calls `lens_list` and returns your lenses. If you see a tool-call error, check that the env vars are set and the build output exists at `dist/apps/mcp-server/main.js`.
