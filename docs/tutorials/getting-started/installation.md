---
title: Installation
description: Prepare your machine and local environment for LenserFight Community Edition.
---

# Installation

Use this guide for a clean-machine Community Edition setup.

## Option A — File mode (recommended, no Docker)

The fastest path. No database, no Docker, no environment variables. Data lives in browser IndexedDB.

**Requirements:** Node.js 20+ and pnpm only.

```bash
# 1. Clone and install
git clone <repo>
cd lenserfight-web
pnpm install

# 2. Create .env.local
echo 'VITE_DATA_SOURCE=file' > .env.local

# 3. Start the app — boots in under 30 seconds
pnpm nx run web:serve
```

Open `http://localhost:4200`. You are logged in automatically as **Local Dev** — no sign-up screen.

- All data (lenses, workflows, agents) persists in browser IndexedDB across reloads.
- File uploads are stored as blobs in IndexedDB; blob URLs are browser-session-scoped.
- Some production features (notifications, reactions, analytics) return empty stubs and log warnings.

See [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) for a detailed walkthrough.

---

## Option B — Full Supabase setup

Use this path for full multi-user functionality, RLS-enforced data isolation, and production media uploads.

### Prerequisites

- Node.js 20+
- `pnpm`
- Docker Desktop running
- Supabase CLI available on your machine

> `pnpm` is the canonical package manager for this repository.

### Install dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

### Start local services

```bash
pnpm supabase start
pnpm supabase:db:reset
```

If local Supabase gets into a bad state, use:

```bash
pnpm supabase:local:recover
```

### Configure environment

```bash
# Copy the example and set the Supabase backend
cp .env.example .env.local
# Edit .env.local: set VITE_DATA_SOURCE=supabase and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

### Run the web app

```bash
pnpm nx run web:serve
```

The web app runs at `http://localhost:4200` by default.

---

## Optional: run the docs site

```bash
pnpm nx run docs:serve
```

The docs site runs at `http://localhost:3002` by default.

## Supported execution paths in this beta

- workflow creation and execution from the web app
- local BYOK for documented providers where the browser path exists
- platform-credit execution where already wired
- `lf run exec` for direct prompt/model runs

### Important limitations

- cloud BYOK workflow execution depends on the platform executor and is not a self-host guarantee in this repo
- `lf run submit`, `lf run vote`, `lf run full`, and `lf run replay` are not launch-ready automation paths
- public battles, benchmark UI, and enterprise surfaces are outside Community Edition scope

## Clean-machine checklist

### File mode (Option A)

- clone the repo
- run `pnpm install`
- create `.env.local` with `VITE_DATA_SOURCE=file`
- run `pnpm nx run web:serve`
- open the app — you are signed in automatically as Local Dev
- create a lens and confirm it persists after reload

### Supabase mode (Option B)

- clone the repo
- run `pnpm install --frozen-lockfile`
- run `pnpm supabase start`
- run `pnpm supabase:db:reset`
- configure `.env.local` with Supabase credentials and `VITE_DATA_SOURCE=supabase`
- run `pnpm nx run web:serve`
- open the app and create a lens
- create a workflow
- execute the workflow and confirm status updates appear

## Verify the setup

Use the smallest relevant checks:

```bash
pnpm nx run docs:build
pnpm nx run cli:build
```

For the full database walkthrough, see [Local Database Setup](/reference/database/local-setup).

## Related guides

- [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) — start without Docker
- [Quickstart](/tutorials/getting-started/quickstart)
- [Overview](/tutorials/getting-started/overview)
- [Development Setup](/how-to/contributors/development-setup)
- [How to Contribute](/how-to/contributors/how-to-contribute)
