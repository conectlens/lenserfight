# CLI Configuration

The CLI uses a **two-file model** to keep secrets out of your repository.

## Project config — `.lenserfight.json`

Stores non-secret, machine-specific settings. Safe to gitignore (added automatically). Created by `lenserfight init`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `local` \| `cloud` | `local` | Target environment |
| `supabaseUrl` | string | `http://127.0.0.1:54321` | Supabase API URL |
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
| `supabaseAnonKey` | Anon key (if stored explicitly) |
| `supabaseServiceRoleKey` | Service role key (for admin ops like `finalize`) |
| `defaultAdapterId` | Default Runner adapter UUID for `run` |

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

## Related

- [CLI Overview](index.md)
- [Environment Variables](../reference/environment-variables.md)
