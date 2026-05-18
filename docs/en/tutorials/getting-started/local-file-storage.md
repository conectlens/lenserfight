---
title: Local File Storage
description: Start LenserFight without Supabase using local file storage in ~/.lenserfight/. No Docker or database setup required.
---

# Local File Storage

You can run LenserFight locally without installing Docker or setting up Supabase. In local mode the web app stores all data in the browser's IndexedDB — no filesystem setup required. The CLI writes auth tokens to `~/.lenserfight/config.json`, which it creates automatically on first use.

Use this path to:
- Try LenserFight before committing to a full deployment
- Develop and test lenses offline
- Use CLI commands without a cloud connection

---

## What works in local mode

| Feature | Local mode | Requires Supabase |
|---------|-----------|-------------------|
| Create and edit lenses | ✅ | — |
| Run lenses locally (BYOK) | ✅ | — |
| CLI commands (`lf run`, `lf lens`, `lf publish`) | ✅ | — |
| Workflow authoring | ✅ | — |
| Local agent definitions | ✅ | — |
| Multi-user access | — | ✅ |
| Auth (login / sessions) | — | ✅ |
| RLS-enforced data isolation | — | ✅ |
| Production media uploads | — | ✅ |
| Sync to LenserFight Cloud | — | ✅ |

---

## Prerequisites

- Node.js 20+
- pnpm
- The LenserFight repository cloned

---

## Setup

Two commands from the repository root — that's the full setup:

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Create the env file and start the app
cat > .env.local << 'EOF'
DATA_SOURCE=file
WEB_BASE_URL=http://localhost:3000
API_URL=http://localhost:8786
EOF
pnpm nx run web:serve
```

The app starts at `http://localhost:3000`. Supabase is not contacted. Lenses and workflows are stored in IndexedDB — no directories to create.

> `.env.local` is gitignored — it won't be committed.

---

## Create your first lens

1. Open `http://localhost:3000`
2. Navigate to **Lenses** → **New Lens**
3. Enter a title and prompt content
4. Save

The lens is persisted in IndexedDB in your browser.

---

## Migrating to Supabase later

When you're ready to use the full cloud stack:

1. Install and start Supabase:

   ```bash
   pnpm supabase start
   pnpm supabase:db:reset
   ```

2. Update `.env.local`:

   ```bash
   DATA_SOURCE=supabase
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=<your-local-anon-key>
   ```

3. Import any local lenses using the CLI:

   ```bash
   lf lens import --from ~/.lenserfight/lenses/
   ```

4. Restart the app.

---

## Where data lives

| Layer | Storage |
|-------|---------|
| Lenses, workflows, agents (web app) | Browser IndexedDB — origin `http://localhost:3000` |
| Auth tokens, developer tokens (CLI) | `~/.lenserfight/config.json` — created by `lf init` or `lf auth login` |
| Keychain secrets (CLI, CI) | OS keychain, or `~/.lenserfight/gateway/keys/` when `LF_GATEWAY_KEY_FILE_FALLBACK=1` |

---

## Related

- [Storage Adapters Reference](/en/reference/platform-api/storage-adapters) — full adapter interface spec and design
- [Installation](/en/tutorials/getting-started/installation) — full Supabase setup (Option A)
- [Environment Variables](/en/reference/platform-api/environment-variables) — all `DATA_SOURCE` options
- [Local Database Setup](/en/reference/database/local-setup) — Supabase local setup and schema
