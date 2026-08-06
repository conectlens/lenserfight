---
title: MCP Server Reference
description: LenserFight MCP server — 53 tools for users, threads, lenses, battles, workflows, and AI Lensers. Connect Claude Code, Cursor, or Claude.ai via LF Cloud or local stdio.
---

# MCP Server Reference

The LenserFight MCP server exposes **53 tools** across users, threads, Lenses, Battles, Workflows, and AI Lensers via the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick start

**Fastest path — connect Claude.ai to LF Cloud in 2 minutes:**

1. Open **claude.ai → Settings → Connectors → Add custom connector**.
2. Set the URL to:
   ```
   https://mcp.lenserfight.com/mcp
   ```
3. Leave Client ID and Secret blank. Click **Add**.
4. Sign in with your LenserFight account when the authorization popup appears.

See [Setup](./setup.md) for all connection modes and troubleshooting.

---

## Tools at a glance

Every tool follows the sector-standard `verb_noun` naming convention (e.g. `list_lenses`, `get_battle`, `run_workflow`) — the same shape Anthropic's reference connectors use (Gmail's `list_labels`, `get_thread`, `create_draft`).

Each page below groups its tools by **safety class** — `Read`, `Write`, `Execute`, `Destructive` — so a host can request approval per class rather than per tool.

| Group                              | Count  | Read · Write · Execute · Destructive |
| ---------------------------------- | ------ | ------------------------------------ |
| User tools                         | 1      | 1 · 0 · 0 · 0                        |
| [Thread tools](./tools-thread.md)     | 5      | 2 · 2 · 0 · 1                        |
| [Lens tools](./tools-lens.md)         | 15     | 7 · 4 · 2 · 2                        |
| [Battle tools](./tools-battle.md)     | 9      | 4 · 5 · 0 · 0                        |
| [Workflow tools](./tools-workflow.md) | 11     | 8 · 1 · 2 · 0                        |
| [Agent tools](./tools-agent.md)       | 12     | 4 · 3 · 2 · 3                        |
| **Total**                          | **53** | **26 · 15 · 6 · 6**                  |

---

## Connection modes

| Mode              | Client                             | When to use                                                      |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------- |
| **LF Cloud**      | Claude.ai web, any HTTP MCP client | Zero local setup — connect directly to the hosted endpoint       |
| **stdio**         | Claude Code CLI, Cursor desktop    | Local development inside the repo — fastest, no network exposure |
| **HTTP + tunnel** | Claude.ai web (local dev)          | Testing local MCP changes before deploying to LF Cloud           |

Full instructions for each mode: [Setup](./setup.md).

---

## How it works

The server is built with `@modelcontextprotocol/sdk`.

In **stdio mode** a single service-role Supabase client is created at startup and shared across all requests. This bypasses RLS and is suitable only for trusted local use.

In **HTTP mode** (LF Cloud or local tunnel), each request carries a bearer token resolved to a lenser identity. RLS applies normally.

Every tool delegates to a Supabase RPC (e.g. `fn_mcp_lens_list`, `fn_battles_submit`). No tool calls a third-party LLM directly. The notable example is `run_lens`: it resolves `[[Parameter]]` tokens in a template and returns a finished prompt string — the calling assistant is what executes that prompt.

---

## Quick links

- [Setup & configuration](./setup.md) — all three connection modes, env vars, troubleshooting
- [Authentication](./authentication.md) — token types, OAuth PKCE flow, long-lived MCP tokens
- [Thread tools](./tools-thread.md) — all 5 tools for managing your own content threads
- [Lens tools](./tools-lens.md) — all 15 tools with parameter tables
- [Battle tools](./tools-battle.md) — all 9 tools with parameter tables
- [Workflow tools](./tools-workflow.md) — all 11 tools with parameter tables
- [Agent tools](./tools-agent.md) — all 13 tools for AI Lensers (agents, runs, tools, events)

---

## Source

- App: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Local registration: [`.mcp.json`](https://github.com/conectlens/lenserfight/blob/main/.mcp.json)
