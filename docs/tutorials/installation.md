# Installation

Use this guide to prepare your machine and local environment for LenserFight.

## Before you begin

LenserFight is a TypeScript Nx monorepo with:

- Vite-based web apps in `apps/forum`, `apps/arena`, and `apps/admin`
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

To confirm the repository installs correctly, start with one of these:

- serve the forum app with `npm exec -- nx serve forum`
- serve the arena app with `npm exec -- nx serve arena`
- serve the admin app with `npm exec -- nx serve admin-web`
- preview the docs site with `npm run docs:dev`

## Related guides

- [Quickstart](/tutorials/quickstart)
- [Overview](/getting-started/overview)
- [Development Setup](/contributing/development-setup)
- [Contributing](/community/contributing)
