---
title: Installation
description: Prepare your machine and local environment for LenserFight Community Edition.
---

# Installation

Use this guide for a clean-machine Community Edition setup.

## Option A — Full Supabase setup

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

### Run the web app

```bash
pnpm nx run web:serve
```

The web app runs at `http://localhost:4200` by default.

---

## Option B — Local file storage (no Docker)

Use this path to start immediately without Docker or Supabase. Data is stored in `~/.lenserfight/`. No database setup required.

**Requirements:** Node.js 20+ and pnpm only.

```bash
# 1. Create the local data directories
mkdir -p ~/.lenserfight/lenses ~/.lenserfight/media

# 2. Create a minimal config file
echo '{ "defaultAdapterId": "local" }' > ~/.lenserfight/config.json

# 3. Set the data source
echo 'VITE_DATA_SOURCE=file' >> .env.local

# 4. Install dependencies and start the app
pnpm install --frozen-lockfile
pnpm nx run web:serve
```

See [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) for the full walkthrough, including migrating to Supabase later.

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

Use this checklist before calling the install complete:

- clone the repo
- run `pnpm install --frozen-lockfile`
- run `pnpm supabase start`
- run `pnpm supabase:db:reset`
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
