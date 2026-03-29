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

## Run a single app

```sh
npm exec nx serve web
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
- [Contributing](/how-to/contributors/contributing)
- [Branching and Versioning](/how-to/contributors/branching)
- [Coding Standards](/how-to/contributors/coding-standards)
