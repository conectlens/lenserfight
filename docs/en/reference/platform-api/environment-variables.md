---
title: Environment Variables
description: Complete reference for all environment variables used by LenserFight — Supabase, storage, service URLs, tokens, feature flags, and analytics.
---

## Quick start configs

### Minimal local config (no Supabase)

```bash
DATA_SOURCE=file
WEB_BASE_URL=http://localhost:3000
API_URL=http://localhost:8786
```

### Full Supabase config

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATA_SOURCE=supabase
WEB_BASE_URL=http://localhost:3000
AUTH_BASE_URL=http://localhost:3004
API_URL=http://localhost:8786
```

---

## Supabase

| Variable | Used by | Required | Description |
|----------|---------|----------|-------------|
| `SUPABASE_URL` | Frontend, CLI | When `DATA_SOURCE=supabase` | PostgREST base URL for your Supabase project |
| `SUPABASE_ANON_KEY` | Frontend, CLI | When `DATA_SOURCE=supabase` | Public anon key — safe to commit |
| `SUPABASE_URL` | CLI, backend tasks | When `DATA_SOURCE=supabase` | Non-Vite alias used by CLI and scripts |
| `SUPABASE_ANON_KEY` | CLI, backend tasks | When `DATA_SOURCE=supabase` | Non-Vite alias used by CLI and scripts |
| `SUPABASE_SERVICE_ROLE_KEY` | CLI, migrations, seeds | No | Privileged key — never commit, never expose to browser |

---

## Storage

| Variable | Default | Values | Description |
|----------|---------|--------|-------------|
| `DATA_SOURCE` | `supabase` | `supabase` \| `file` | Selects the active storage backend. `file` uses `~/.lenserfight/` local storage; no Supabase required. |
| `DEFAULT_STORAGE_ADAPTER` | `supabase` | `supabase` \| `local` | Overrides the default adapter in `storage.registry.ts`. `r2` is intentionally rejected until the adapter is implemented. |

See [Storage Adapters](/en/reference/platform-api/storage-adapters) for the full adapter reference and `~/.lenserfight/` directory layout.

---

## Service URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_BASE_URL` | `http://localhost:3000` | Root URL of the web app |
| `AUTH_BASE_URL` | `http://localhost:3004` | Auth app base URL |
| `API_URL` | `http://localhost:8786` | Execution platform API. Production: `https://api.lenserfight.com` |
| `DOCS_BASE_URL` | `http://localhost:3002` | Docs site base URL |
| `STATUS_BASE_URL` | `http://localhost:3003` | Status page base URL |
| `ARENA_URL` | `http://localhost:3000` | Arena URL (same as web in community edition) |
| `LENSERFIGHT_CLOUD_API_URL` | `https://api.lenserfight.com` | CLI override for the cloud API base URL |
| `LENSERFIGHT_OLLAMA_BASE_URL` | `http://localhost:11434` | Node/CLI/server override for the Ollama base URL |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Browser-build override for the Ollama base URL |

---

## Auth & tokens

| Variable | Used by | Description |
|----------|---------|-------------|
| `LENSERFIGHT_API_KEY` | CLI, scripts | API key used in place of a session token. Set to a developer or service token. Recommended for CI and AI agent integrations. |
| `LENSERFIGHT_DEVELOPER_TOKEN` | CLI | Override the developer token stored in `~/.lenserfight/config.json` |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | CLI | Override the stored developer token expiry (ISO 8601 string) |

Token precedence in the CLI: `LENSERFIGHT_API_KEY` → explicit developer-token automation path → stored session → stored developer token.

---

## Feature flags

The web app no longer reads generic `FEATURE_*` toggles for core product surfaces; those routes and panels are compiled in with fixed defaults. One client-exposed switch remains:

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_CHAINABIT_SIGNIN` | `true` | Set to `false` to hide the "Continue with Chainabit" button on auth screens |

---

## Analytics

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_POSTHOG_PROJECT_TOKEN` | No | PostHog project API key. Omit to disable analytics entirely. |
| `PUBLIC_POSTHOG_HOST` | No | PostHog ingestion host. Defaults to `https://us.i.posthog.com`. |

---

## Development & testing

| Variable | Default | Description |
|----------|---------|-------------|
| `CAPTCHA_SITE_KEY` | — | hCaptcha site key for the auth flow. Use a test key in development. |

---

## Behaviour rules

- The CLI reads from the process environment, then `.env.local`, then `.env`, then `~/.lenserfight/config.json`.
- Never commit `SUPABASE_SERVICE_ROLE_KEY` or any token values to source control.

---

## Related

- [Storage Adapters](/en/reference/platform-api/storage-adapters) — adapter selection and `~/.lenserfight/` layout
- [CLI Configuration](/en/reference/cli/configuration) — project-level config file (`.lenserfight.json`)
- [Token Reference](/en/reference/platform-api/tokens) — token types, scopes, and CLI commands
- [Local File Storage Tutorial](/en/tutorials/getting-started/local-file-storage) — start without Supabase
- [CLI Auth Commands](/en/reference/cli/auth)
- [RPC Reference](/en/reference/database/rpc-reference)
