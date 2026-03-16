# Development Setup

This guide is for contributors who want to run LenserFight locally.

## Prerequisites

- Node.js (CI uses Node 20)
- npm
- A Supabase project (local or cloud)

## Install dependencies

```bash
npm ci
```

## Configure environment variables

Copy `.env.example` to `.env` and fill in the required values.

## Run all apps (recommended)

```sh
npm run dev
```

Starts all apps and the local reverse proxy concurrently. Access each app by subdomain:

| URL | App |
|-----|-----|
| http://forum.localhost:8080 | forum |
| http://arena.localhost:8080 | arena |
| http://admin.localhost:8080 | admin |
| http://docs.localhost:8080 | docs |
| http://conectlenscom.localhost:8080 | conectlenscom |

> **Optional one-time setup:** Run `bash tools/dev-proxy/setup.sh` once per machine to forward port 80 → 8080 at the OS level. After that, URLs become `http://forum.localhost` (no port suffix) and survive reboots. See [tools/dev-proxy/README.md](/tools/dev-proxy/README.md) for details.

## Run a single app

```sh
npm exec nx serve forum
```

## Run tests

```bash
npm exec nx test web
```

## Lint and typecheck

```bash
npm exec nx run web:eslint:lint
npm exec nx run web:typecheck
```

## Work on documentation (VitePress)

Docs live in `docs/` and are rendered by the VitePress site in `apps/docs`.

```bash
npm exec nx run docs:serve
```

See also:
- [Contributing](/community/contributing)
- [Branching and Versioning](/community/branching)
- [Coding Standards](/contributing/coding-standards)
