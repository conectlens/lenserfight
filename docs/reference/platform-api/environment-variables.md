---
title: Environment Variables
description: Complete reference for all environment variables used by LenserFight — Supabase, storage, service URLs, tokens, feature flags, and analytics.
---

# Environment Variables

All variables prefixed with `VITE_` are exposed to browser builds. Variables without this prefix are server-side or CLI-only.

## Quick start configs

### Minimal local config (no Supabase)

```bash
VITE_DATA_SOURCE=file
VITE_PRODUCT_EDITION=community
VITE_WEB_BASE_URL=http://localhost:3000
VITE_API_URL=http://localhost:8786
```

### Full Supabase config

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
VITE_DATA_SOURCE=supabase
VITE_PRODUCT_EDITION=community
VITE_WEB_BASE_URL=http://localhost:3000
VITE_AUTH_BASE_URL=http://localhost:3004
VITE_API_URL=http://localhost:8786
```

---

## Supabase

| Variable | Used by | Required | Description |
|----------|---------|----------|-------------|
| `VITE_SUPABASE_URL` | Frontend, CLI | When `VITE_DATA_SOURCE=supabase` | PostgREST base URL for your Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Frontend, CLI | When `VITE_DATA_SOURCE=supabase` | Public anon key — safe to commit |
| `SUPABASE_URL` | CLI, backend tasks | When `VITE_DATA_SOURCE=supabase` | Non-Vite alias used by CLI and scripts |
| `SUPABASE_ANON_KEY` | CLI, backend tasks | When `VITE_DATA_SOURCE=supabase` | Non-Vite alias used by CLI and scripts |
| `SUPABASE_SERVICE_ROLE_KEY` | CLI, migrations, seeds | No | Privileged key — never commit, never expose to browser |

---

## Storage

| Variable | Default | Values | Description |
|----------|---------|--------|-------------|
| `VITE_DATA_SOURCE` | `supabase` | `supabase` \| `file` | Selects the active storage backend. `file` uses `~/.lenserfight/` local storage; no Supabase required. |
| `VITE_DEFAULT_STORAGE_ADAPTER` | `supabase` | `supabase` \| `local` | Overrides the default adapter in `storage.registry.ts`. `r2` is intentionally rejected until the adapter is implemented. |

See [Storage Adapters](/reference/platform-api/storage-adapters) for the full adapter reference and `~/.lenserfight/` directory layout.

---

## Service URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WEB_BASE_URL` | `http://localhost:3000` | Root URL of the web app |
| `VITE_AUTH_BASE_URL` | `http://localhost:3004` | Auth app base URL |
| `VITE_API_URL` | `http://localhost:8786` | Execution platform API. Production: `https://api.lenserfight.com` |
| `VITE_DOCS_BASE_URL` | `http://localhost:3002` | Docs site base URL |
| `VITE_STATUS_BASE_URL` | `http://localhost:3003` | Status page base URL |
| `VITE_ARENA_URL` | `http://localhost:3000` | Arena URL (same as web in community edition) |
| `LENSERFIGHT_CLOUD_API_URL` | `https://api.lenserfight.com` | CLI override for the cloud API base URL |
| `LENSERFIGHT_OLLAMA_BASE_URL` | `http://localhost:11434` | Node/CLI/server override for the Ollama base URL |
| `VITE_OLLAMA_BASE_URL` | `http://localhost:11434` | Browser-build override for the Ollama base URL |

---

## Auth & tokens

| Variable | Used by | Description |
|----------|---------|-------------|
| `LENSERFIGHT_API_KEY` | CLI, scripts | API key used in place of a session token. Set to a developer or service token. Recommended for CI and AI agent integrations. |
| `LENSERFIGHT_DEVELOPER_TOKEN` | CLI | Override the developer token stored in `~/.lenserfight/config.json` |
| `LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT` | CLI | Override the stored developer token expiry (ISO 8601 string) |

Token precedence in the CLI: `LENSERFIGHT_API_KEY` → explicit developer-token automation path → stored session → stored developer token.

---

## Product edition

| Variable | Default | Values | Description |
|----------|---------|--------|-------------|
| `VITE_PRODUCT_EDITION` | `community` | `community` \| `cloud` | Controls which feature surface is active. Community Edition disables billing, public battles, and enterprise APIs. |

---

## Feature flags

All feature flags default to `false`. Set to `true` to enable in dev/test builds.

| Variable | Description |
|----------|-------------|
| `VITE_FEATURE_AGENTS` | AI workspace — agent management and automation log |
| `VITE_FEATURE_CRON_SCHEDULING` | Reserved Wave 2 flag for scheduled workflow execution. Keep disabled in public cloud and OSS builds for now. |
| `VITE_FEATURE_NOTIFICATIONS` | In-app notification system |
| `VITE_FEATURE_NETWORK_LINKS` | Social graph link display on profiles |
| `VITE_FEATURE_LENSER_ACTIVITY` | Per-lenser activity feed |
| `VITE_FEATURE_CHALLENGES_TAB` | Challenges tab on lenser profiles |
| `VITE_FEATURE_BENCHMARK_UI` | Benchmark suites and results UI |
| `VITE_FEATURE_BILLING_UI` | Billing, credits, and store UI |
| `VITE_FEATURE_PUBLIC_BATTLES` | Public battles and voting surface |
| `VITE_FEATURE_SUPABASE_INTEGRATION` | Explicit toggle for Supabase integration (overrides `VITE_DATA_SOURCE`) |

::: warning Community Edition defaults
In Community Edition (`VITE_PRODUCT_EDITION=community`), billing, public battles, and benchmark UI are disabled regardless of feature flags.
:::

---

## Analytics

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_POSTHOG_KEY` | No | PostHog project API key. Omit to disable analytics entirely. |
| `VITE_POSTHOG_HOST` | No | PostHog ingestion host. Defaults to `https://us.i.posthog.com`. |

---

## Development & testing

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MOCK` | `false` | Set to `true` to skip auth and network calls. Useful for UI-only development. |
| `VITE_CAPTCHA_SITE_KEY` | — | hCaptcha site key for the auth flow. Use a test key in development. |

---

## Behaviour rules

- The CLI reads from the process environment, then `.env.local`, then `.env`, then `~/.lenserfight/config.json`.
- `VITE_*` variables are inlined at build time by Vite — they cannot be changed at runtime without a rebuild.
- Never commit `SUPABASE_SERVICE_ROLE_KEY` or any token values to source control.

---

## Related

- [Storage Adapters](/reference/platform-api/storage-adapters) — adapter selection and `~/.lenserfight/` layout
- [CLI Configuration](/reference/cli/configuration) — project-level config file (`.lenserfight.json`)
- [Token Reference](/reference/platform-api/tokens) — token types, scopes, and CLI commands
- [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) — start without Supabase
- [CLI Auth Commands](/reference/cli/auth)
- [RPC Reference](/reference/database/rpc-reference)
