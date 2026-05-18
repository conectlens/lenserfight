# Local development setup

Get a live local LenserFight battle running in ≤5 minutes.

## Prerequisites

- **Docker** — [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)
- **Node.js ≥20** — [nodejs.org](https://nodejs.org)
- **pnpm** — `npm install -g pnpm`

## 1. Clone

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
pnpm install --frozen-lockfile
```

## 2. Start

```bash
./scripts/dev-start.sh
```

The script checks prerequisites, starts Supabase, seeds the database, and prints a URL table. Open `http://localhost:3000` and start the web app:

```bash
pnpm nx serve web
```

## 3. Verify

Cast a vote in the browser on the "Quickstart: Poetry Slam" battle — it loads from seed 60 and already has two haiku submissions.

Or verify from the CLI:

```bash
node dist/apps/cli/main.js battle browse --limit 1
```

## 4. Stop

```bash
./scripts/dev-teardown.sh
```

This stops Supabase and removes Docker volumes.

## Troubleshoot

**Port conflict (54321 already in use)**  
Another Supabase instance is running. Stop it: `pnpm supabase stop` or `docker ps` to find and stop the container.

**Docker pull timeout**  
Run `docker pull supabase/postgres:15` manually before running `dev-start.sh`. On slow connections this can take a few minutes.

**Supabase health-check fails**  
Run `pnpm supabase logs` to see what failed. Common cause: Docker doesn't have enough memory — increase the memory limit to at least 4 GB in Docker settings.

**`lf battle browse` returns empty**  
Seeds didn't run. Re-run: `bash scripts/seed-local.sh` or `pnpm supabase db reset --local`.

**`fn_get_my_key_secret is disabled in this environment` (code 42501)**  
You're testing Cloud BYOK (a vault-stored key) locally. The function is intentionally off by default — it decrypts plaintext API keys over PostgREST and must only run when you explicitly opt in.

Enable it once per local DB lifetime:

```bash
pnpm supabase:enable-byok-resolver
```

or directly:

```bash
bash scripts/enable-byok-dev-resolver.sh
```

This sets `app.allow_dev_byok_resolver = 'true'` on the Postgres database. The setting persists until you drop the DB (`supabase stop --no-backup` or `pnpm supabase db reset`). Re-run the script after every reset.

> **This script has no effect in production.** The GUC is never set there, so the function stays disabled. Client calls are also tree-shaken in production builds via the `import.meta.env.DEV` guard in `walletApiClient.ts`.
