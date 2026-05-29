# MCP Manager — Reference

## Transport modes

| | stdio | HTTP |
|-|-------|------|
| Entry | `bootStdio()` | `bootHttp()` |
| Auth | None — service role key | `Authorization: Bearer <token>` |
| RLS | Bypassed | Enforced |
| DB client | One shared client at startup | New user-scoped client per session |
| When to use | Local dev, CLI | Production, Claude.ai connectors |

A session is stored in `Map<string, Session>` keyed by `Mcp-Session-Id`.
Same ID → reuse existing transport. New ID → re-auth and new `McpServer` instance.

---

## Auth resolution

```
Bearer lf_mcp_*
  → fn_mcp_resolve_token RPC (service client)
  → { lenser_id, supabase_refresh_token }
  → anonClient.auth.refreshSession() → fresh userJwt
  → createUserScopedClient(userJwt)

Bearer <supabase-jwt>
  → sb.auth.getUser(token) → user
  → fn_mcp_resolve_lenser_id RPC → lenser_id
  → createUserScopedClient(userJwt)
```

`createUserScopedClient()` builds the Supabase client bound to the user's JWT.
All tool calls run under that user's RLS context.

---

## Helper signatures (`src/types.ts`)

```typescript
ok(data: unknown, toolName: string, t0: number): McpToolResult
fail(code: string, message: string, extra: object, toolName: string, t0: number): McpToolResult
paginated(items: unknown[], total: number, limit: number, offset: number, toolName: string, t0: number): McpToolResult
zUuid  // z.string().uuid() — always use this for UUID params
```

- List tools → `paginated()`.  Single item → `ok()`.  Mutations → `ok({ id, ... })`.

---

## Error codes

| Code | When to use |
|------|-------------|
| `NOT_FOUND` | RPC returned null |
| `FORBIDDEN` | RPC raised access_denied |
| `DB_ERROR` | Caught exception |
| `BAD_INPUT` | Invalid param combination |
| `MISSING_PARAMS` | `lens_run` missing required params |
| `CONFIRMATION_REQUIRED` | Destructive action, `confirm: true` not set |

---

## Hard rules

- Tool handlers use the user-scoped `sb` — never call `getServiceClient()` inside a tool.
- All DB access via `fn_mcp_*` RPCs — no direct `.from('table')` queries.
- No recursive tool calls. No cross-tool side effects.
- Destructive actions (delete, close, archive) must require `confirm: true` in the schema.

---

## Debug quick-ref

| Symptom | Where to look | Fix |
|---------|--------------|-----|
| `401 Unauthorized` | `middleware/auth.ts → resolveAuth()` | Token missing, expired, or wrong prefix |
| `fn_mcp_resolve_lenser_id` returns null | User has no profile | Direct user to complete onboarding at lenserfight.com |
| Startup shows wrong URL | `MCP_OAUTH_BASE_URL` is set | Unset to re-enable ngrok auto-detect on `127.0.0.1:4040` |
| Tool not found after adding | `tools/<domain>/index.ts` | Check import + call; rebuild with `pnpm nx build mcp-server` |
| `mcp_token_exchange_failed` in Claude.ai | ngrok URL changed | Delete and re-add the connector with the new URL |
| Consent page bounces to onboarding immediately | Stale React Query cache | Cache TTL 5 min; wait or clear; profile was created with null user_id (cross-hostname cookie issue) |
