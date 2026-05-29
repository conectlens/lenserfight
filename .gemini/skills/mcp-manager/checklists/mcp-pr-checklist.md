# MCP PR Checklist

For any PR touching `apps/mcp-server/`.

## Tool file

- [ ] Name: `verb_noun` verb-first (`lens-pin.ts` → `pin_lens`, `battle-get.ts` → `get_battle`)
- [ ] RPC: `fn_mcp_<domain>_<action>` domain-first, mirrors file stem
- [ ] Export: `register<Domain><Action>(server, sb)`
- [ ] `zUuid` for all UUID params (not `z.string().uuid()`)
- [ ] `const t0 = Date.now()` as first line, before `try`
- [ ] RPC: `as never` cast + explicit `{ data, error }` type
- [ ] `if (error) throw new Error(error.message)` after each RPC
- [ ] `fail('NOT_FOUND', ...)` for null rows; `fail('DB_ERROR', ...)` in catch
- [ ] List tools use `paginated()`; single items use `ok()`
- [ ] No `getServiceClient()` in handler (service-role leak)
- [ ] No direct `.from('table')` — only `fn_mcp_*` RPCs
- [ ] No recursive MCP tool calls
- [ ] No `console.log` — use `process.stderr.write('[lenserfight-mcp] ...')`

## Registration

- [ ] Imported and called in `tools/<domain>/index.ts` (`.js` extension on import)
- [ ] New domain? Also wire into `buildServer()` in `main.ts`

## Docs

- [ ] `docs/en/reference/mcp-server/tools-<domain>.md` updated
- [ ] Tool count in `index.md` still correct

## Gate

```bash
pnpm nx build mcp-server
bash .claude/skills/mcp-manager/scripts/validate-tool.sh apps/mcp-server/src/tools/<domain>/<file>.ts
```
