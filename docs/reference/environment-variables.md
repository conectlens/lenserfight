# Environment Variables

Reference for the LenserFight CLI, auth app, and local Supabase workflow.

## Core URLs and keys

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | CLI, auth app, API clients | Base Supabase URL |
| `VITE_SUPABASE_URL` | Frontend builds | Frontend-friendly Supabase URL |
| `SUPABASE_ANON_KEY` | CLI, auth app, API clients | Public Supabase key |
| `VITE_SUPABASE_ANON_KEY` | Frontend builds | Frontend-friendly anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | CLI, backend tasks | Privileged service key |
| `VITE_API_URL` | Web frontend | Platform API gateway URL |
| `LENSERFIGHT_AUTH_BASE_URL` | CLI | Browser auth app base URL |
| `AUTH_BASE_URL` | CLI | Fallback auth app base URL |
| `VITE_AUTH_BASE_URL` | Frontend builds | Frontend-friendly auth app URL |

## Developer token variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `LENSERFIGHT_DEVELOPER_TOKEN` | CLI | Override the stored developer token |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | CLI | Override the saved developer token expiry |

## Behavior

- The CLI prefers process environment over `.env.local`, then `.env`, then user config.
- `authBaseUrl` defaults to `http://localhost:3004` in local mode and `https://auth.lenserfight.com` in cloud mode.
- Developer tokens are stored separately from session tokens in `~/.lenserfight/config.json`.
- The approval and token RPCs require an authenticated session, so the CLI must have a valid session token before starting the device flow.

## Related

- [CLI Configuration](../cli/configuration.md)
- [CLI Auth Commands](../cli/auth.md)
- [RPC Reference](../database/rpc-reference.md)
