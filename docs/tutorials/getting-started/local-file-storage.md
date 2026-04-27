---
title: Local File Storage
description: Start LenserFight without Supabase using local file storage in ~/.lenserfight/. No Docker or database setup required.
---

# Local File Storage

You can run LenserFight locally without installing Docker or setting up Supabase. The local file storage adapter writes all data to `~/.lenserfight/` on your machine.

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
- The LenserFight repository cloned and dependencies installed

```bash
pnpm install --frozen-lockfile
```

---

## Step 1 — Create the local directory

```bash
mkdir -p ~/.lenserfight/lenses ~/.lenserfight/media ~/.lenserfight/workflows ~/.lenserfight/agents ~/.lenserfight/lensers
```

---

## Step 2 — Create the config file

```bash
cat > ~/.lenserfight/config.json << 'EOF'
{
  "defaultAdapterId": "local",
  "cloudApiUrl": "https://api.lenserfight.com"
}
EOF
```

---

## Step 3 — Set the data source

Create `.env.local` in the repository root:

```bash
VITE_DATA_SOURCE=file
VITE_PRODUCT_EDITION=community
VITE_WEB_BASE_URL=http://localhost:4200
VITE_API_URL=http://localhost:8786
```

`.env.local` is gitignored — it won't be committed.

---

## Step 4 — Start the app

```bash
pnpm nx run web:serve
```

The app starts at `http://localhost:4200`. Supabase is not contacted on startup. Any lens or workflow you create is saved to `~/.lenserfight/lenses/` as a JSON file.

---

## Step 5 — Create your first lens

1. Open `http://localhost:4200`
2. Navigate to **Lenses** → **New Lens**
3. Enter a title and prompt content
4. Save

The lens is stored at `~/.lenserfight/lenses/{id}.json`.

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
   VITE_DATA_SOURCE=supabase
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
   ```

3. Import any local lenses using the CLI:

   ```bash
   lf lens import --from ~/.lenserfight/lenses/
   ```

4. Restart the app.

---

## Directory layout reference

```
~/.lenserfight/
├── config.json          # Global config: adapter id, API URL, auth tokens
├── lenses/              # Lens metadata and content
│   └── {id}.json
├── lensers/             # Lenser profile data
│   └── {handle}.json
├── media/               # File uploads, organised by bucket
│   ├── {bucket}/
│   │   └── {objectKey}
│   └── objects.json     # Metadata index
├── workflows/
│   └── {id}.json
└── agents/
    └── {id}.json
```

---

## Related

- [Storage Adapters Reference](/reference/platform-api/storage-adapters) — full adapter interface spec and design
- [Installation](/tutorials/getting-started/installation) — full Supabase setup (Option A)
- [Environment Variables](/reference/platform-api/environment-variables) — all `VITE_DATA_SOURCE` options
- [Local Database Setup](/reference/database/local-setup) — Supabase local setup and schema
