---
title: MCP Server Reference
description: LenserFight MCP server — 31 tools for lenses, battles, and workflows. Connect Claude Code, Cursor, or Claude.ai in minutes via LF Cloud or local stdio.
---

# MCP Server Reference

The LenserFight MCP server exposes **31 tools** across three domains — Lenses, Battles, and Workflows — via the [Model Context Protocol](https://modelcontextprotocol.io). Any MCP-compatible AI assistant (Claude Code, Cursor, Claude.ai) can read, create, and execute LenserFight resources directly from a conversation.

## Quick start

**Fastest path — connect Claude.ai to LF Cloud in 2 minutes:**

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Set the URL to:
   ```
   https://mcp.lenserfight.com/mcp
   ```
3. Leave Client ID and Secret blank. Click **Add**.
4. Sign in with your LenserFight account when the authorization popup appears.

See [Setup](./setup) for all connection modes and troubleshooting.

---

## Tools at a glance

Every tool follows the sector-standard `verb_noun` naming convention (e.g. `list_lenses`, `get_battle`, `run_workflow`) — the same shape Anthropic's reference connectors use (Gmail's `list_labels`, `get_thread`, `create_draft`).

Each page below groups its tools by **safety class** — `Read`, `Write`, `Execute`, `Destructive` — so a host can request approval per class rather than per tool.

| Group | Count | Read · Write · Execute · Destructive |
|---|---|---|
| [Lens tools](./tools-lens) | 15 | 7 · 4 · 2 · 2 |
| [Battle tools](./tools-battle) | 8 | 4 · 4 · 0 · 0 |
| [Workflow tools](./tools-workflow) | 8 | 5 · 1 · 2 · 0 |
| **Total** | **31** | **16 · 9 · 4 · 2** |

---

## Connection modes

| Mode | Client | When to use |
|---|---|---|
| **LF Cloud** | Claude.ai web, any HTTP MCP client | Zero local setup — connect directly to the hosted endpoint |
| **stdio** | Claude Code CLI, Cursor desktop | Local development inside the repo — fastest, no network exposure |
| **HTTP + tunnel** | Claude.ai web (local dev) | Testing local MCP changes before deploying to LF Cloud |

Full instructions for each mode: [Setup](./setup).

---

## How it works

The server is built with `@modelcontextprotocol/sdk`. 

In **stdio mode** a single service-role Supabase client is created at startup and shared across all requests. This bypasses RLS and is suitable only for trusted local use.

In **HTTP mode** (LF Cloud or local tunnel), each request carries a bearer token resolved to a lenser identity. RLS applies normally.

Every tool delegates to a Supabase RPC (e.g. `fn_mcp_lens_list`, `fn_battles_submit`). No tool calls a third-party LLM directly. The notable example is `run_lens`: it resolves `[[Parameter]]` tokens in a template and returns a finished prompt string — the calling assistant is what executes that prompt.

---

## Quick links

- [Setup & configuration](./setup) — all three connection modes, env vars, troubleshooting
- [Authentication](./authentication) — token types, OAuth PKCE flow, long-lived MCP tokens
- [Lens tools](./tools-lens) — all 15 tools with parameter tables
- [Battle tools](./tools-battle) — all 8 tools with parameter tables
- [Workflow tools](./tools-workflow) — all 8 tools with parameter tables

---

## Source

- App: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Edge function: [`supabase/functions/lenserfight-mcp`](https://github.com/conectlens/lenserfight/tree/main/supabase/functions/lenserfight-mcp)
- Local registration: [`.mcp.json`](https://github.com/conectlens/lenserfight/blob/main/.mcp.json)
