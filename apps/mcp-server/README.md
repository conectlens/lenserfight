# LenserFight MCP Server

A custom [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI assistants like Claude direct access to LenserFight's Lenses, Battles, Workflows, and AI Lensers — without copy-pasting IDs, without switching apps.

---

## What is MCP?

Think of MCP as USB-C for AI: a single, open standard that lets any AI assistant talk to any data source or tool. Instead of pasting lens IDs into chat messages, you say *"run the `code-reviewer` lens with Topic=TypeScript"* and Claude calls `run_lens` directly.

MCP separates **servers** (tools that expose capabilities) from **clients** (the AI that uses them). This server is a **Resource Server** — it wraps LenserFight's Supabase database and exposes 45 typed tools.

> **This vs the generic Supabase MCP**: `mcp.supabase.com` gives an AI generic SQL access to any Supabase project. This server wraps LenserFight's *business logic* — `run_lens` resolves `[[Parameter]]` tokens from the database, `get_battle_score` fetches vote aggregates and AI judge verdicts, `summarize_workflow` calculates cost and duration. You get typed, safe, purpose-built tools, not raw SQL access.

---

## 45 Tools Across 5 Groups

| Group | Count | Purpose |
|---|---|---|
| **Lens** | 15 | Create, run, fork, version, and search prompt templates |
| **Battle** | 9 | Create battles, add contenders, submit runs, score, finalize, and read history |
| **Workflow** | 8 | Create, run, monitor, retry, and summarize workflow executions |
| **Agent** | 12 | Create and manage AI Lensers, assign tools, run team actions |
| **User** | 1 | Read the authenticated lenser's identity (`get_me`) |

---

## Transport Modes

| Mode | Use Case | Entry point | URL |
|---|---|---|---|
| **Cloudflare Worker** | Claude.ai web — production | `src/worker.ts` | `https://mcp.lenserfight.com/mcp` |
| **stdio** | Claude Code CLI, Cursor desktop | `src/main.ts` | No URL (process pipes) |
| **HTTP local** | Claude.ai web connector via ngrok | `src/main.ts` | `http://localhost:3001/mcp` |

---

## OAuth Architecture

LenserFight uses its own OAuth 2.1 flow backed by Supabase Auth. This MCP server is the Resource Server. Claude.ai is a public OAuth client (PKCE only — no client secret needed).

```
Claude.ai
    │  1. GET /.well-known/oauth-protected-resource
    │  2. GET /.well-known/oauth-authorization-server
    ▼
mcp.lenserfight.com  (Cloudflare Worker)
    │  3. GET /oauth/authorize  →  redirect to auth.lenserfight.com/mcp/auth
    ▼
auth.lenserfight.com  (consent page)
    │  4. User signs in, clicks Allow
    │  5. POST /oauth/complete  →  server issues lf_mcp_* token
    │  6. POST /oauth/token     →  Claude exchanges code for access token
    ▼
Claude.ai holds:  Authorization: Bearer lf_mcp_<hex>
    │  7. All /mcp calls include this header
    ▼
Worker validates token via fn_mcp_resolve_token RPC
  → resolves Supabase refresh token → issues per-request user-scoped client
  → tools run with user's RLS context
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — bypasses RLS for OAuth operations |
| `SUPABASE_ANON_KEY` | Yes | Anon key — used to create user-scoped clients from refresh tokens |
| `SUPABASE_JWT_SECRET` | Yes | Validates Supabase JWTs in HTTP transport |
| `MCP_OAUTH_BASE_URL` | Worker/HTTP | Public base URL (`https://mcp.lenserfight.com` in prod) |
| `AUTH_APP_BASE_URL` | Worker/HTTP | Consent page URL (`https://auth.lenserfight.com` in prod) |
| `LENSERFIGHT_LENSER_ID` | No | Scope stdio tool calls to a specific lenser UUID |
| `MCP_TRANSPORT` | No | `stdio` (default) or `http` |
| `MCP_HTTP_PORT` | No | HTTP port for local mode (default: `3001`) |

---

## Setup — Cloudflare Worker (Production)

The worker entry point (`src/worker.ts`) uses the Fetch API and shares all tool/service/OAuth logic with the Node server. It is the **source of truth for the production MCP endpoint** at `https://mcp.lenserfight.com`.

### Step 1 — Fill in `.env.local`

Copy the template and populate your production Supabase credentials:

```
apps/mcp-server/.env.local
```

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

This file is gitignored and never committed.

### Step 2 — Push secrets to Cloudflare

```bash
pnpm nx run mcp-server:"secrets:push"
```

This reads `.env.local` and pushes each key as a Wrangler secret to the `lenserfight-mcp` Worker, equivalent to running `wrangler secret put` for each variable individually.

### Step 3 — Build and deploy

```bash
pnpm nx run mcp-server:deploy
```

This runs `worker-build` (esbuild → `dist/apps/mcp-server/worker.js`) then `wrangler deploy`. The Cloudflare build pipeline (configured in the Cloudflare dashboard) runs the same command on push to `main`.

### Step 4 — Verify

```bash
curl https://mcp.lenserfight.com/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Setup — stdio (Claude Code CLI)

The simplest and most secure option. No network, no auth tokens, no browser.

### Step 1 — Create `.env.mcp.local`

```bash
# apps/mcp-server/.env.mcp.local  ← gitignored, do not commit
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
export SUPABASE_ANON_KEY=<from supabase status>
export SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
export MCP_TRANSPORT=stdio
# export LENSERFIGHT_LENSER_ID=<your-lenser-uuid>
```

Source it before launching Claude Code:

```bash
source apps/mcp-server/.env.mcp.local
```

### Step 2 — Build

```bash
pnpm nx build mcp-server
```

Output: `dist/apps/mcp-server/main.js`

### Step 3 — Start Claude Code

The repo root `.mcp.json` auto-registers the server. Type `/mcp` to confirm it's listed.

---

## Setup — HTTP + tunnel (local Claude.ai)

Use this to connect Claude.ai to your local machine during development.

### Step 1 — Start a tunnel

```bash
ngrok http 3001
```

### Step 2 — Start the server

```bash
source apps/mcp-server/.env.mcp.local
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
pnpm nx build mcp-server
node dist/apps/mcp-server/main.js
```

The server auto-detects the ngrok URL from `127.0.0.1:4040` and prints a startup banner with the connector URL to paste into Claude.ai.

---

## Nx Targets

| Target | Command | Description |
|---|---|---|
| `build` | `pnpm nx build mcp-server` | Build Node.js CJS bundle (`src/main.ts`) |
| `worker-build` | `pnpm nx run mcp-server:worker-build` | Build Cloudflare Worker ESM bundle (`src/worker.ts`) |
| `deploy` | `pnpm nx run mcp-server:deploy` | Build worker + `wrangler deploy` |
| `secrets:push` | `pnpm nx run mcp-server:"secrets:push"` | Push `.env.local` values as Wrangler secrets |
| `serve` | `pnpm nx serve mcp-server` | Build + run Node server (stdio mode) |
| `test` | `pnpm nx test mcp-server` | Run Jest tests |

---

## Architecture

```
src/
├── worker.ts          Cloudflare Worker entry — Fetch API, no Node deps
├── main.ts            Node.js entry — stdio + HTTP via Node http module
├── config.ts          Env var parsing (Node; Worker reads from Env binding)
├── client.ts          Supabase client factory
├── types.ts           Shared ok/fail/paginated helpers + zUuid
├── middleware/
│   └── auth.ts        resolveAuth: validates lf_mcp_* tokens + Supabase JWTs
├── oauth/
│   └── discovery.ts   buildDiscoveryDocument / buildProtectedResourceDocument
├── transport/
│   ├── http.ts        Node HTTP server (local dev + tunnel mode)
│   └── stdio.ts       stdio transport (Claude Code CLI)
├── tools/
│   ├── lens/          15 lens tools
│   ├── battle/        9 battle tools
│   ├── workflow/      8 workflow tools
│   ├── agent/         12 AI Lenser tools
│   └── user/          1 identity tool (get_me)
└── services/
    ├── lens.service.ts
    ├── battle.service.ts
    ├── workflow.service.ts
    └── agent.service.ts
```

`worker.ts` reuses everything under `tools/`, `services/`, `middleware/`, and `oauth/`. Only `transport/http.ts` (Node `http` module) and `config.ts` (`process.env`) are Node-specific and are not imported by the Worker.

---

## Security Model

- **Service role key**: Used only for OAuth operations (token lookup, client registration). Tool calls use per-user Supabase clients derived from the authenticated lenser's refresh token — RLS applies.
- **JWT validation**: Every `/mcp` request must carry `Authorization: Bearer lf_mcp_<hex>`. The token is resolved via `fn_mcp_resolve_token` RPC, which returns the linked Supabase refresh token. Invalid tokens get `401`.
- **Confirmation guards**: `delete_lens`, `archive_ai_lenser`, and `set_battle_status` to `closed`/`archived` require `confirm: true`.
- **Soft deletes**: No tool physically removes rows — all deletes set `deleted_at`.

---

## Troubleshooting

**`No change found in Function`** (Supabase deploy)
The Supabase Edge Function is deprecated in favour of the Cloudflare Worker. Use `pnpm nx run mcp-server:deploy` instead.

**`401 Unauthorized` on `/mcp`**
The bearer token is not being recognised. Re-authorize the connector in Claude.ai settings.

**`could not locate _registeredTools`** in Worker logs
The MCP SDK changed its internal registry key. Check `src/worker.ts` → `getTools()` and add the new key to the candidates list.

**`MISSING_PARAMS` from `run_lens`**
Call `extract_lens_params` first to see which parameters the lens needs. Keys are case-insensitive.

**`CONFIRM_REQUIRED`**
Pass `"confirm": true` for destructive operations (`delete_lens`, `archive_ai_lenser`, `set_battle_status` to `closed`/`archived`).

**Worker bundle too large**
The current bundle is ~1.8MB (within Cloudflare's 10MB limit). If it grows, run `pnpm nx run mcp-server:worker-build 2>&1 | grep "worker.js"` to see the current size.
