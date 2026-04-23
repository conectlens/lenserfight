# Development Setup

This guide is for contributors running LenserFight Community Edition locally.

## Prerequisites

- Node.js 20+
- `pnpm`
- Docker Desktop
- Supabase CLI

## Install and boot the workspace

```bash
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase:db:reset
```

## Run the main apps

```bash
pnpm nx run web:serve
pnpm nx run docs:serve
```

## Useful validation commands

Use the smallest relevant validation for the area you changed.

```bash
pnpm nx run docs:build
pnpm nx run cli:build
pnpm nx run infra-execution:test
```

If you need to inspect available targets for a project:

```bash
pnpm nx show project <project-name> --json
```

## Notes for Community Edition contributors

- benchmark and billing surfaces are not part of the Community Edition launch scope
- public battles remain disabled in this repo's OSS beta surface
- workflow reliability and installability take priority over new product surface area

## See also

- [Installation](/tutorials/getting-started/installation)
- [Contributing](/how-to/contributors/contributing)
- [Support](/how-to/contributors/support)
