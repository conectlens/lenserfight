---
title: Installation
description: Prepare your machine and local environment for LenserFight.
---

# Installation

Use this guide to prepare your machine and local environment for LenserFight.

## Prerequisites

Make sure you have:

- Node.js 20+
- pnpm (recommended) — `npm install -g pnpm`
- a Supabase project, either local or cloud-hosted

> Use `pnpm` as the workspace package manager (see root `package.json`). `npm` also works but `pnpm` is recommended.

## Workspace structure

LenserFight is a TypeScript Nx monorepo with:

- `apps/forum` — main platform app (Vite + React)
- `apps/docs` — VitePress documentation site
- `apps/cli` — CLI tool
- `apps/mobile` — Expo companion app (not yet wired into the workspace)
- `libs/` — shared libraries
- `supabase/` — schema, migrations, and SQL functions

## Install dependencies

From the repository root, run:

```bash
npm ci
```

## Configure environment variables

Copy `.env.example` to `.env.local`, then fill in the required values for your environment.

If you want the full contributor setup workflow after installation, continue with the [Development Setup](/how-to/contributors/development-setup) guide.

## Verify the installation

Start the platform to verify everything is working:

```bash
# Start the forum app (main platform)
pnpm nx serve forum

# Start the docs site
pnpm nx serve docs

# Build the CLI
pnpm nx build cli
```

## Next steps

- Continue with [Quickstart](/tutorials/getting-started/quickstart) to run the platform
- Full contributor setup: [Development Setup](/how-to/contributors/development-setup)

## Related guides

- [Quickstart](/tutorials/getting-started/quickstart)
- [Overview](/tutorials/getting-started/overview)
- [Development Setup](/how-to/contributors/development-setup)
- [Contributing](/how-to/contributors/contributing)
