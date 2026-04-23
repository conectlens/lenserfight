---
title: Installation
description: Prepare your machine and local environment for LenserFight Community Edition.
---

# Installation

Use this guide for a clean-machine Community Edition setup.

## Prerequisites

Make sure you have:

- Node.js 20+
- `pnpm`
- Docker Desktop running
- Supabase CLI available on your machine

> `pnpm` is the canonical package manager for this repository.

## Install dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

## Start local services

```bash
pnpm supabase start
pnpm supabase:db:reset
```

If local Supabase gets into a bad state, use:

```bash
pnpm supabase:local:recover
```

## Run the web app

```bash
pnpm nx run web:serve
```

The web app runs at `http://localhost:4200` by default.

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

- [Quickstart](/tutorials/getting-started/quickstart)
- [Overview](/tutorials/getting-started/overview)
- [Development Setup](/how-to/contributors/development-setup)
- [How to Contribute](/how-to/contributors/how-to-contribute)
