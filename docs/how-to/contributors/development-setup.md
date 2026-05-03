# Development Setup

This guide is for contributors running LenserFight Community Edition locally.

## Prerequisites

- Node.js 22 (see [.nvmrc](https://github.com/connectlens/lenserfight-web/blob/main/.nvmrc); `nvm use` picks it up automatically)
- pnpm 9 (the repo declares `packageManager` in `package.json`)
- Docker Desktop
- Supabase CLI

## Install and boot the workspace

```bash
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase:db:reset
```

## Smoke test — the "ready to PR" gate

After your local environment is set up, run:

```bash
pnpm smoke
```

This script runs `supabase db reset`, the CLI unit tests, builds the CLI, runs `lf run exec --dry-run` with no API keys set, and builds the web app. **If `pnpm smoke` exits 0, your local environment is correctly configured** — that is the gate we use in CI (`.github/workflows/cli-smoke.yml`).

If smoke fails, fix the failing step before opening a PR — the same step will fail in CI.

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

## When you change a seed

The committed `supabase/seed.sql` is generated from `supabase/seed.manifest` + the per-feature files in `supabase/seeds/`. If you add, remove, or edit a seed file, you must regenerate `seed.sql` and commit it:

```bash
pnpm supabase:combine-seeds
```

The `seeds-guard` CI workflow re-runs this and fails the PR if the committed `seed.sql` doesn't match the manifest output. The `seeds-smoke` workflow additionally runs `supabase db reset` end-to-end and asserts that core tables (`lenses.workflow_runs`, `agents.ai_lensers`, `lenses.versions`) are non-empty.

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
