---
title: MCP Server Reference
description: LenserFight MCP server — 30 tools for lenses, battles, and workflows across three transport modes. Connect Claude Code, Cursor, or Claude.ai to your LenserFight account.
---

# MCP Server Reference

The LenserFight MCP server exposes **30 tools** across three domains — Lenses, Battles, and Workflows — via the [Model Context Protocol](https://modelcontextprotocol.io). Any MCP-compatible AI assistant (Claude Code, Cursor, Claude.ai) can read, create, and execute LenserFight resources directly from a conversation without leaving the chat.

## Tools at a glance

| Group | Count | What you can do |
|---|---|---|
| [Lens tools](./tools-lens) | 14 | List, search, get, create, update, fork, run, validate params, extract params, archive, delete, set visibility, list versions, get a version |
| [Battle tools](./tools-battle) | 8 | List, get, create battles; add contenders; submit runs; read scores; transition status; view history |
| [Workflow tools](./tools-workflow) | 8 | List, get, create workflows; run; poll status; read logs; retry; summarize |

## Transport modes

| Mode | Client | Auth | When to use |
|---|---|---|---|
| **stdio** | Claude Code CLI, Cursor desktop | Service role key (env var) | Local development — fastest setup |
| **HTTP + ngrok** | Claude.ai web | Bearer JWT or MCP token | When you need Claude.ai web to reach a local server |
| **Supabase Edge Function** | Claude.ai web, any HTTP MCP client | Bearer JWT (OAuth PKCE) | Production / LF Cloud — no local process needed |

See [Setup](./setup) for step-by-step instructions for each mode.

## Quick links

- [Setup & configuration](./setup) — build, env vars, all three transport modes
- [Authentication](./authentication) — token types, OAuth PKCE, long-lived MCP tokens
- [Lens tools](./tools-lens) — all 14 tools with parameter tables
- [Battle tools](./tools-battle) — all 8 tools with parameter tables
- [Workflow tools](./tools-workflow) — all 8 tools with parameter tables

## How it works

The server is built with `@modelcontextprotocol/sdk`. In **stdio mode** a single service-role Supabase client is created at startup and shared across all requests — this bypasses RLS and is suitable only for trusted local use. In **HTTP mode** each request gets a user-scoped client bound to the caller's JWT, so RLS applies normally.

Every tool delegates to a Supabase RPC (e.g. `fn_mcp_lens_list`, `fn_battles_submit`). No tool calls a third-party LLM. The notable example is `lens_run`: it resolves `[[:uuid]]` parameter tokens and returns a finished prompt string — the calling assistant decides whether and how to send that prompt to a model.

## Source

- App: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Edge function: [`supabase/functions/lenserfight-mcp`](https://github.com/conectlens/lenserfight/tree/main/supabase/functions/lenserfight-mcp)
- Registration: [`.mcp.json`](https://github.com/conectlens/lenserfight/blob/main/.mcp.json)
