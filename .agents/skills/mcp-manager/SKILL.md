---
name: mcp-manager
description: >
  Use when creating, registering, reviewing, or debugging MCP tools in
  apps/mcp-server/. Covers adding tools to any domain (lens/battle/workflow),
  scaffolding tool files, wiring registration, reviewing MCP PRs, and debugging
  auth/RPC/transport failures — even when the user doesn't say "MCP" but is
  working in apps/mcp-server/ or asking about adding AI tool capabilities to
  LenserFight.
compatibility: Designed for Claude Code in the LenserFight Nx monorepo (pnpm, TypeScript).
allowed-tools: Bash(pnpm:*) Bash(bash:*) Read Edit Write
---

# MCP Manager

## When to use

- Adding a new tool (any domain or a new one)
- Reviewing a PR that touches `apps/mcp-server/`
- Debugging 401s, RPC errors, or transport failures
- Changing OAuth flow or transport architecture

## Layout

```
apps/mcp-server/src/
  main.ts               # entry: bootHttp | bootStdio
  types.ts              # ok() fail() paginated() zUuid
  config.ts             # getConfig() → McpServerConfig
  middleware/auth.ts    # resolveAuth() → AuthContext
  transport/http.ts     # HTTP + OAuth + session map
  transport/stdio.ts    # stdio (service-role, no auth)
  tools/
    lens/               # lens-*.ts  +  index.ts → registerLensTools()
    battle/             # battle-*.ts + index.ts → registerBattleTools()
    workflow/           # workflow-*.ts + index.ts → registerWorkflowTools()
```

## Naming rule

**Two separate conventions — keep them consistent:**

| Artifact | Convention | Example |
|----------|-----------|---------|
| File stem | `<domain>-<action>` kebab | `lens-get-version.ts` |
| MCP tool name | `verb_noun` verb-first snake_case | `get_lens_version` |
| Export function | `register<Domain><Action>` PascalCase | `registerLensGetVersion` |
| Supabase RPC | `fn_mcp_<domain>_<action>` domain-first | `fn_mcp_lens_get_version` |

MCP tool names are verb-first so AI agents can group by action (`get_*`, `list_*`).
File stems are domain-first so tools sort together on disk.

**Verb prefix in use:** `get_*` `list_*` `create_*` `update_*` `delete_*` `run_*` `search_*` `set_*` `archive_*` `fork_*` `submit_*` `retry_*` `summarize_*` `find_and_run_*` `validate_*` `extract_*` `add_*`

Multi-word actions: first action-word becomes the verb, domain slots in second.
`battle-submit-run.ts` → tool `submit_battle_run`, RPC `fn_mcp_battle_submit_run`

## Tool template

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';

export function registerLensPin(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'pin_lens',                          // verb_noun — verb first
    'Pin a lens to the caller\'s profile.',
    { lens_id: zUuid },
    async ({ lens_id }) => {
      const t0 = Date.now();
      try {
        const { data, error } = (await sb.rpc('fn_mcp_lens_pin' as never, {  // fn_mcp_domain_action
          p_lens_id: lens_id,
        })) as unknown as { data: unknown; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) return fail('NOT_FOUND', `Lens ${lens_id} not found`, {}, 'pin_lens', t0);
        return ok(data, 'pin_lens', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'pin_lens', t0);
      }
    }
  );
}
```

## Register it

```typescript
// tools/lens/index.ts — add one import + one call
import { registerLensPin } from './lens-pin.js';
export function registerLensTools(server, sb) {
  // ...existing...
  registerLensPin(server, sb);
}
```

`main.ts` already calls `registerLensTools` — no changes needed there.

## Creation checklist

- [ ] File: `tools/<domain>/<domain>-<action>.ts`
- [ ] Tool name: `verb_noun` verb-first (e.g. `pin_lens`, `submit_battle_run`)
- [ ] Export: `register<Domain><Action>` PascalCase words from file stem
- [ ] RPC: `fn_mcp_<domain>_<action>` domain-first, mirrors file stem
- [ ] UUID params use `zUuid` (not `z.string().uuid()`)
- [ ] `const t0 = Date.now()` before `try`
- [ ] RPC cast: `as never` + explicit result type
- [ ] `if (error) throw new Error(error.message)` after each RPC
- [ ] `fail('NOT_FOUND', ...)` for null row; `fail('DB_ERROR', ...)` in catch
- [ ] No `getServiceClient()` inside the handler
- [ ] DB access via `fn_mcp_*` RPC only — never `.schema()`, `.from()`, or any query builder
- [ ] Registered in `tools/<domain>/index.ts`
- [ ] Docs updated: `docs/en/reference/mcp-server/tools-<domain>.md`

## Scripts

```bash
bash scripts/new-tool.sh lens pin              # → tools/lens/lens-pin.ts, tool: pin_lens
bash scripts/new-tool.sh lens get-version      # → tools/lens/lens-get-version.ts, tool: get_lens_version
bash scripts/validate-tool.sh <file.ts>       # check conventions
```

## Reference

- [REFERENCE.md](references/REFERENCE.md) — transport, auth, helpers, error codes, debug
- [PR checklist](checklists/mcp-pr-checklist.md) — full PR review checklist
