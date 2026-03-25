# Installation

Use this guide to prepare your machine and local environment for LenserFight.

## Before you begin

LenserFight is a TypeScript Nx monorepo with:

- Vite-based web apps in `apps/forum`, `apps/arena`, `apps/land`, and `apps/cli`
- a planned Expo mobile app contract in `apps/mobile`
- a VitePress docs site in `apps/docs`
- shared libraries in `libs/`
- Supabase configuration and migrations in `supabase/` when present

## Prerequisites

Make sure you have:

- Node.js 20
- npm
- a Supabase project, either local or cloud-hosted

## Install dependencies

From the repository root, run:

```bash
npm ci
```

## Configure environment variables

Copy `.env.example` to `.env`, then fill in the required values for your environment.

If you want the full contributor setup workflow after installation, continue with the [Development Setup](/contributing/development-setup) guide.

## Verify the installation

Start a single app to verify everything is working:

To start a single app:

- `npm exec nx serve forum`
- `npm exec nx serve arena`
- `npm exec nx serve land`
- `npm run docs:dev`

## Related guides

- [Quickstart](/tutorials/quickstart)
- [Overview](/getting-started/overview)
- [Development Setup](/contributing/development-setup)
- [Contributing](/community/contributing)
