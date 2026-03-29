# Environment Variables

Reference for the LenserFight CLI and local Supabase workflow.

## Core URLs and keys

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | CLI, API clients | Base Supabase URL |
| `VITE_SUPABASE_URL` | Frontend builds | Frontend-friendly Supabase URL |
| `SUPABASE_ANON_KEY` | CLI, API clients | Public Supabase key |
| `VITE_SUPABASE_ANON_KEY` | Frontend builds | Frontend-friendly anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | CLI, backend tasks | Privileged service key |
| `VITE_API_URL` | Web frontend, CLI | Platform API gateway URL |
| `LENSERFIGHT_CLOUD_API_URL` | CLI | Preferred Cloud API URL |

## Developer token variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `LENSERFIGHT_DEVELOPER_TOKEN` | CLI | Override the stored developer token |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | CLI | Override the saved developer token expiry |

## Behavior

- The CLI prefers process environment over `.env.local`, then `.env`, then user config.
- `cloudApiUrl` defaults to `http://localhost:8786` in local mode and `https://api.lenserfight.com` in cloud mode.
- Developer tokens are stored separately from session tokens in `~/.lenserfight/config.json`.
- Authentication is handled by LenserFight Cloud SSO at `auth.lenserfight.com`. No local auth app is needed.

## Related

- [CLI Configuration](/reference/cli/configuration)
- [CLI Auth Commands](/reference/cli/auth)
- [RPC Reference](/reference/database/rpc-reference)
