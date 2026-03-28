# CLI Configuration

The CLI uses a **two-file model** to keep secrets out of your repository.

## Project config — `.lenserfight.json`

Stores non-secret, machine-specific settings. Safe to gitignore (added automatically). Created by `lenserfight init`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `local` \| `cloud` | `local` | Target environment |
| `supabaseUrl` | string | `http://127.0.0.1:54321` | Supabase API URL |
| `authBaseUrl` | string | `http://localhost:3004` / `https://auth.lenserfight.com` | Browser auth app URL |
| `dbPort` | number | `54322` | PostgreSQL port |
| `apiPort` | number | `54321` | PostgREST API port |

**Keys and tokens are never written here.**

## User config — `~/.lenserfight/config.json`

Stores secrets and auth tokens globally per user. Created by `auth login`.

| Field | Description |
|-------|-------------|
| `authToken` | JWT for authenticated requests |
| `authRefreshToken` | Refresh token |
| `authExpiresAt` | Token expiry (ISO 8601) |
| `developerTokenId` | ID of the current developer token |
| `developerToken` | Time-bounded developer token used for automation |
| `developerTokenExpiresAt` | Developer token expiry (ISO 8601) |
| `supabaseAnonKey` | Anon key (if stored explicitly) |
| `supabaseServiceRoleKey` | Service role key (for admin ops like `finalize`) |
| `defaultAdapterId` | Default Agent adapter UUID for `run` |

## Resolution rules

The CLI resolves values per field. Environment variables win first, then `.env.local` / `.env`, then user config, then project config, then local defaults when `mode: local`.

For auth URLs and token overrides, the CLI understands:

| Variable | Purpose |
|----------|---------|
| `LENSERFIGHT_AUTH_BASE_URL` | Preferred auth app URL |
| `AUTH_BASE_URL` | Fallback auth app URL |
| `VITE_AUTH_BASE_URL` | Frontend-friendly auth app URL |
| `LENSERFIGHT_DEVELOPER_TOKEN` | Override the stored developer token |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | Override developer token expiry metadata |

## Key resolution order

For each secret, the CLI checks sources in this order (first non-empty value wins):

| Priority | Source |
|----------|--------|
| 1 | `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` process env |
| 2 | `.env.local` then `.env` in project root |
| 3 | `~/.lenserfight/config.json` |
| 4 | Well-known local Supabase defaults *(local mode only)* |

For `mode: local`, the anon key and service role key resolve automatically from Supabase local dev defaults — no configuration needed.

## Cloud mode setup

```bash
# .env.local (project root)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Then initialise:

```bash
lenserfight init --mode cloud --url https://your-project.supabase.co
```

Set the auth app URL if you are running it separately:

```bash
export LENSERFIGHT_AUTH_BASE_URL="http://localhost:3004"
```

## Related

- [CLI Overview](index.md)
- [Environment Variables](../reference/environment-variables.md)
