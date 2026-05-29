---
title: Provider Quickstart — LenserFight MCP Server
description: Connect your AI product to the LenserFight MCP server in under 5 minutes. Register a client, complete OAuth, and make your first tool call.
---

# Provider Quickstart

**Goal:** Connect your MCP-compatible product to the LenserFight MCP server, authorize a user, and make a successful `lens_list` call — in under 5 minutes.

**What you need:**
- An MCP-compatible client (Claude.ai, Cursor, or any client that implements OAuth 2.1 PKCE + RFC 7591)
- A LenserFight account at [lenserfight.com](https://lenserfight.com) with a Lenser handle chosen

---

## Step 1 — Point your client at the endpoint

The LenserFight MCP server is hosted on LF Cloud. The single stable endpoint is:

```
https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
```

This URL handles all MCP JSON-RPC requests, OAuth discovery, token exchange, and health checks. There is no separate base URL needed.

---

## Step 2 — Register your OAuth client (automatic)

You do not pre-register with LenserFight. On the first connection your client calls:

```http
POST https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/register
Content-Type: application/json

{
  "client_name": "My AI Product",
  "redirect_uris": ["https://myproduct.com/api/mcp/auth_callback"]
}
```

Response:
```json
{
  "client_id": "lf_mcp_client_abc123...",
  "redirect_uris": ["https://myproduct.com/api/mcp/auth_callback"],
  "token_endpoint_auth_method": "none"
}
```

Save `client_id`. Use it in every authorization request going forward. Most MCP client libraries handle this step automatically — you only need to supply your redirect URI.

---

## Step 3 — Authorize a user (PKCE flow)

Generate a PKCE code verifier and challenge, then redirect the user to:

```
https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/authorize
  ?response_type=code
  &client_id=lf_mcp_client_abc123...
  &redirect_uri=https://myproduct.com/api/mcp/auth_callback
  &code_challenge=<S256_hash_of_verifier>
  &code_challenge_method=S256
  &state=<random_csrf_token>
```

The server renders an HTML login form. The user enters their LenserFight email and password.

On success, the server redirects to your `redirect_uri` with `?code=lf_mcp_<hex>&state=<your_state>`.

---

## Step 4 — Exchange the code for a token

```http
POST https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=lf_mcp_<the_code_from_step_3>
&redirect_uri=https://myproduct.com/api/mcp/auth_callback
&client_id=lf_mcp_client_abc123...
&code_verifier=<your_original_verifier>
```

Response:
```json
{
  "access_token": "lf_mcp_abc123...",
  "token_type": "bearer"
}
```

Store the `access_token`. This is a long-lived MCP token — it does not expire unless the user revokes it. You call the MCP endpoint with this token for all future requests.

---

## Step 5 — Make your first tool call

```http
POST https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
Authorization: Bearer lf_mcp_abc123...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lens_list",
    "arguments": { "limit": 5 }
  }
}
```

Success response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"items\":[...],\"total\":42,\"limit\":5,\"offset\":0,\"has_more\":true}"
      }
    ]
  }
}
```

If you see `"items"` in the response, your integration is working.

---

## Claude.ai example (no code)

If your product **is** Claude.ai:

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Set **Remote MCP server URL** to:
   ```
   https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
   ```
3. Leave OAuth Client ID and Secret blank (dynamic registration handles it).
4. Click **Add**. Sign in with your LenserFight credentials when the popup appears.
5. Start a new chat and ask: *"Use LenserFight to list my lenses."*

---

## Cursor / VS Code example

Add to your MCP config file (e.g., `~/.cursor/mcp.json` or `.mcp.json` in your workspace):

```json
{
  "mcpServers": {
    "lenserfight": {
      "url": "https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp"
    }
  }
}
```

Cursor will detect the OAuth requirement from the discovery document and initiate the authorization flow the first time you invoke a LenserFight tool.

---

## Verify the connection is healthy

At any time:

```bash
curl https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

Or from within your AI assistant:
> "Call `lens_list` with `limit=1` using the LenserFight connection."

---

## What's next

| I want to… | Go to… |
|---|---|
| Understand all connection options (HTTP, stdio, tunnel) | [Connection Modes](./provider-connection) |
| Implement OAuth 2.1 PKCE manually | [OAuth & Authentication](./provider-oauth) |
| See every available tool | [All 31 Tools](./provider-tools) |
| Understand the architecture and RLS | [Integration Guide](./provider-integration) |

---

## Common errors at this stage

| Error | Cause | Fix |
|---|---|---|
| `Sign-in failed` | Wrong email or password | Confirm credentials at [lenserfight.com](https://lenserfight.com) |
| `No Lenser profile found` | Account exists but onboarding not completed | Sign in to [lenserfight.com](https://lenserfight.com), choose a handle |
| `401 Unauthorized` | Token missing or malformed | Confirm `Authorization: Bearer lf_mcp_...` header is present |
| `mcp_token_exchange_failed` | Discovery document advertised a localhost URL | Only happens in local dev; use the cloud endpoint for production |
