---
title: Connection Modes — LenserFight MCP Server for Providers
description: How-to guide for connecting a third-party product to the LenserFight MCP server. Covers LF Cloud (HTTP), stdio (local dev), and HTTP + ngrok tunnel modes with real configuration examples.
---

# Connection Modes

This guide shows how to wire the LenserFight MCP server into your product for each supported connection mode. Pick the mode that matches your deployment environment.

| Mode | When to use | Setup time | Requires local repo? |
|---|---|---|---|
| [LF Cloud (HTTP)](#lf-cloud-http) | Production — your product connects to the hosted endpoint | ~5 min | No |
| [stdio](#stdio-local-dev) | Local development inside the LenserFight repo | ~5 min | Yes |
| [HTTP + tunnel](#http--tunnel-local-dev) | Testing local MCP changes before deploying | ~10 min | Yes |

---

## LF Cloud (HTTP)

**Use this for all production integrations.**

The LenserFight MCP server runs as a Supabase Edge Function. There is no separate server to deploy or maintain. Your client sends standard MCP JSON-RPC over HTTPS.

### Endpoint

```
https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
```

### OAuth discovery (automatic for compliant clients)

A fully MCP-compliant client reads the discovery document and handles OAuth automatically:

```bash
curl https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/.well-known/oauth-authorization-server
```

```json
{
  "issuer": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp",
  "authorization_endpoint": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/authorize",
  "token_endpoint": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/token",
  "registration_endpoint": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

### Claude.ai custom connector

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Fill in:
   - **Name:** `LenserFight`
   - **Remote MCP server URL:** `https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp`
   - **OAuth Client ID:** leave blank (dynamic registration)
   - **OAuth Client Secret:** leave blank (PKCE only — no secret)
3. Click **Add**.
4. Authorize with your LenserFight credentials in the popup.

### Cursor

In `~/.cursor/mcp.json` (or the per-project `.mcp.json` in your workspace root):

```json
{
  "mcpServers": {
    "lenserfight": {
      "url": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp"
    }
  }
}
```

Restart Cursor. On first use of a LenserFight tool, Cursor opens a browser window for the OAuth flow.

### Any HTTP MCP client

Add a remote MCP server entry pointing to the endpoint above. The client must support:
- OAuth 2.1 authorization code flow
- PKCE (S256 code challenge)
- RFC 7591 dynamic client registration (or manually supply a `client_id` from a prior registration)

If your client does not support dynamic registration, call `POST /oauth/register` once manually (see [OAuth & Authentication](./provider-oauth)) and hard-code the returned `client_id`.

### Custom backend client example (Node.js)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp'),
  {
    // After completing the OAuth flow, supply the lf_mcp_* access token here
    requestInit: {
      headers: { Authorization: `Bearer ${process.env.LF_MCP_TOKEN}` },
    },
  }
)

const client = new Client({ name: 'my-product', version: '1.0.0' }, { capabilities: {} })
await client.connect(transport)

const result = await client.callTool({ name: 'lens_list', arguments: { limit: 10 } })
console.log(result)
```

---

## stdio (local dev)

**Use this only when developing inside the LenserFight repository.**

In stdio mode the MCP server is spawned as a child process. Communication happens over stdin/stdout. The service role key bypasses all RLS — this mode is **not safe for production use**.

### Prerequisites

1. Local Supabase instance running: `supabase start`
2. MCP server built: `pnpm nx build mcp-server`
3. Node.js 22+, pnpm 9+

### Environment variables

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | From `supabase status -o env` |
| `SUPABASE_ANON_KEY` | From `supabase status -o env` |
| `SUPABASE_JWT_SECRET` | `super-secret-jwt-token-with-at-least-32-characters-long` |
| `MCP_TRANSPORT` | `stdio` |
| `LENSERFIGHT_LENSER_ID` | *(optional)* UUID of the lenser to scope calls to |

### `.mcp.json` (already in the repo root)

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
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Source your env vars, then open Claude Code or Cursor from the repo root. The client reads `.mcp.json` automatically.

---

## HTTP + tunnel (local dev)

**Use this when you want Claude.ai or a remote client to hit your local MCP server changes.**

> Claude.ai's token exchange happens from Anthropic's cloud. It cannot reach `localhost`. You need a public tunnel.

### Step 1 — Start ngrok

```bash
ngrok http 3001
# Forwarding: https://<id>.ngrok-free.app -> http://localhost:3001
```

The server auto-detects the ngrok public URL from ngrok's local API. No manual copy-paste needed.

With cloudflared instead:
```bash
cloudflared tunnel --url http://localhost:3001
export MCP_OAUTH_BASE_URL=https://<your-id>.trycloudflare.com
```

### Step 2 — Build and start the server in HTTP mode

Make sure Supabase is running and env vars are sourced, then:

```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
node dist/apps/mcp-server/main.js
```

Startup banner:
```
[lenserfight-mcp] auto-detected public tunnel: https://<tunnel>.ngrok-free.app
[lenserfight-mcp] HTTP transport ready on http://localhost:3001/mcp

  ┌─ Local dev OAuth credentials ──────────────────────────────────┐
  │  OAuth Client ID : lf_mcp_client_localdev                      │
  │  Auth method     : PKCE (no client secret required)            │
  │  Server base URL : https://<tunnel>.ngrok-free.app             │
  │                                                                 │
  │  Claude.ai → Settings → Connectors → Add connector:            │
  │    URL       : https://<tunnel>.ngrok-free.app/mcp             │
  │    Client ID : lf_mcp_client_localdev                          │
  └─────────────────────────────────────────────────────────────────┘
```

### Step 3 — Add the connector in Claude.ai

Use the tunnel URL from the banner, not `localhost`:
- **URL:** `https://<tunnel>.ngrok-free.app/mcp`
- **OAuth Client ID:** `lf_mcp_client_localdev`

### After restarting ngrok

The free ngrok tier assigns a new URL on every restart. After each restart:
1. Restart the MCP server — it auto-detects the new URL.
2. In Claude.ai, delete and re-add the connector with the updated URL.

---

## Troubleshooting

### `mcp_token_exchange_failed`

The discovery document advertised a localhost URL that the remote client cannot reach.

- Confirm the startup banner shows the **tunnel URL**, not `http://localhost`.
- Confirm the connector URL in Claude.ai ends with `/mcp` and matches the tunnel exactly.
- If you restarted ngrok, the URL changed — delete and re-add the connector.

### `401 Unauthorized` on `POST /mcp`

- The bearer token is missing, expired, or malformed.
- Re-authorize via the connector settings.
- Check that the token format is `lf_mcp_<64 hex chars>`.

### `Sign-in failed`

- Wrong email or password in the OAuth login form.
- Confirm credentials at [lenserfight.com](https://lenserfight.com).

### `No Lenser profile found`

- The user completed account creation but never finished onboarding (picking a handle).
- Send them to [lenserfight.com](https://lenserfight.com) to complete the handle selection step, then retry.

### `PUBLIC URL REQUIRED` warning at startup (tunnel mode)

- ngrok is not running or was not started before the MCP server.
- Start ngrok first, then start the MCP server.
- Or set `MCP_OAUTH_BASE_URL=https://your-url` manually before starting.

### `WARN: environment variable is unset`

- Forgot to source the env file. Run `source ./.env.mcp.local`.
