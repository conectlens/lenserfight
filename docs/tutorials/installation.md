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

Start all apps together with the local reverse proxy:

```sh
npm run dev
```

This starts all apps concurrently and prints a route table like:

| URL | App |
|-----|-----|
| http://forum.localhost:8080 | forum |
| http://arena.localhost:8080 | arena |
| http://admin.localhost:8080 | admin |
| http://docs.localhost:8080 | docs |
| http://conectlenscom.localhost:8080 | conectlenscom |

To remove the `:8080` suffix, run `bash tools/dev-proxy/setup.sh` once per machine (requires sudo). After that `http://forum.localhost` and friends work directly.

To start a single app instead:

- `npm exec nx serve forum`
- `npm exec nx serve arena`
- `npm exec nx serve admin`
- `npm run docs:dev`

## Related guides

- [Quickstart](/tutorials/quickstart)
- [Overview](/getting-started/overview)
- [Development Setup](/contributing/development-setup)
- [Contributing](/community/contributing)
