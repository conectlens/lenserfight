---
title: LenserFight MCP Server — Provider Integration Guide
description: Understand what the LenserFight MCP server is, how it works architecturally, and why integrating it gives your product access to lenses, battles, and workflows through a single standard protocol.
---

# LenserFight MCP Server — Provider Integration Guide

This page explains the **concepts and architecture** behind the LenserFight MCP server. It answers: *what is it, how does it work, and what does your product gain by integrating it?*

If you want to jump straight into connecting, go to [Provider Quickstart](./provider-quickstart) or [Connection Modes](./provider-connection).

---

## What is the LenserFight MCP server?

The LenserFight MCP server is a **Model Context Protocol (MCP) server** that exposes LenserFight's core capabilities — lenses, battles, and workflows — as callable tools to any MCP-compatible AI assistant or product.

[MCP](https://modelcontextprotocol.io) is an open protocol that standardizes how AI applications connect to external data sources and tools. Any MCP client (Claude.ai, Cursor, VS Code extensions, custom AI products) can connect to the LenserFight server and use all 31 tools without LenserFight-specific SDKs, custom APIs, or hand-rolled integrations.

**From your users' perspective**, they get a seamless experience where their AI assistant can browse, run, and manage LenserFight resources directly from a conversation — without ever leaving your product.

---

## What can the server do?

The server provides **31 tools** in three capability groups:

| Group | Tools | What your users can do |
|---|---|---|
| **Lenses** | 15 | Search, browse, create, run, fork, and version reusable prompt templates |
| **Battles** | 8 | Create and manage AI-vs-AI or human-vs-AI competitions with scoring |
| **Workflows** | 8 | Build, run, monitor, and retry multi-step AI execution pipelines |

Every tool delegates to a Supabase RPC function in the LenserFight backend. No tool calls any LLM directly — the calling AI model (your product's assistant) executes prompts. The MCP server resolves templates and returns structured data; intelligence lives in the model.

See the complete tool reference: [All 31 Tools](./provider-tools).

---

## Transport modes

The server supports two transports:

### HTTP (recommended for providers)

The hosted endpoint at LF Cloud is the standard path for third-party products. Your MCP client sends HTTP POST requests to the endpoint URL; authentication is handled by the OAuth 2.1 PKCE flow.

```
https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
```

This is a Supabase Edge Function. It is deployed globally, stateless, and rate-limited per token. There is no separate LenserFight API domain yet — the Supabase URL is the stable public endpoint.

### stdio (for local/embedded use)

For products that run inside the LenserFight repository (e.g., contributors, local dev tooling), the server can be spawned as a child process. The client communicates over stdin/stdout. This mode uses a service role key and bypasses RLS — it is **not suitable for production third-party integrations**.

---

## Authentication model

Every HTTP request to the MCP server must carry a bearer token. There are two token types relevant to providers:

### MCP tokens (`lf_mcp_*`)

The standard token type. Issued at the end of the OAuth 2.1 PKCE flow when a user authorizes your product. Format: `lf_mcp_<64 hex characters>`.

MCP tokens are **long-lived** — they do not expire by default. They are stored in the `lensers.mcp_tokens` table and can be revoked by deleting the row.

**Resolution flow:**
1. Your client sends `Authorization: Bearer lf_mcp_<hex>`.
2. RPC `fn_mcp_resolve_token(token)` returns the user's `lenser_id` and a Supabase refresh token.
3. The refresh token is exchanged for a short-lived Supabase JWT.
4. All Supabase queries run with that JWT — Row-Level Security applies normally.

This means every tool call is **scoped to the authenticated user**. Users can only read or write resources they own or have access to, exactly as on the LenserFight web app.

### Dynamic OAuth client registration

You do not need to pre-register your application with LenserFight. The server implements [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) dynamic client registration. On first connection, your client calls `POST /oauth/register` with its redirect URI and receives a `client_id` automatically.

See [OAuth & Authentication](./provider-oauth) for the full flow diagram and implementation checklist.

---

## What your users need

Before a user can authorize your integration, they must have:

1. A LenserFight account (email + password at [lenserfight.com](https://lenserfight.com))
2. A completed Lenser profile (a handle chosen during onboarding)

Users who registered but never chose a handle will see a `No Lenser profile found` error during authorization. They must complete onboarding at [lenserfight.com](https://lenserfight.com) first.

---

## RLS and data isolation

All data access through the HTTP endpoint is gated by **Supabase Row-Level Security**. When a user authorizes your product:

- They can read their own lenses, battles, and workflows.
- They can read public and community lenses from any lenser.
- They **cannot** read another user's private lenses.
- Write operations (create, update, archive, delete) apply only to resources they own.

Your product does not need to implement any additional authorization layer. RLS is enforced at the database level regardless of what tool call is made.

---

## Session management

The server issues an `mcp-session-id` on the first request. Including this header on subsequent requests within the same conversation is recommended — it allows the server to maintain an in-memory session context and reduces overhead.

If `mcp-session-id` is omitted, the server creates a stateless session for each request. This is correct but less efficient for multi-turn conversations.

---

## Discovery documents

The server publishes three standard discovery documents. Any fully compliant OAuth 2.1 or MCP client should be able to bootstrap from these with no manual configuration:

| Endpoint | Standard | Purpose |
|---|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 | OAuth server metadata: auth endpoint, token endpoint, registration endpoint |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 | Protected resource metadata |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728 | MCP-specific resource metadata |

---

## Health check

```bash
curl https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Source code

- MCP server app: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Edge function: [`supabase/functions/lenserfight-mcp`](https://github.com/conectlens/lenserfight/tree/main/supabase/functions/lenserfight-mcp)
- Protocol spec: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## Next steps

| I want to… | Go to… |
|---|---|
| Connect my product in 5 minutes | [Provider Quickstart](./provider-quickstart) |
| Understand all connection modes in detail | [Connection Modes](./provider-connection) |
| Implement OAuth from scratch | [OAuth & Authentication](./provider-oauth) |
| See every tool with parameters | [All 31 Tools](./provider-tools) |
