<p align="center">
  <img src="docs/public/favicons/original/ms-icon-310x310.png" width="96" alt="LenserFight logo" />
</p>
<h1 align="center">LenserFight Community Edition</h1>
<p align="center">
  Developer-first OSS beta for lenses, workflows, and local AI experimentation.
</p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL_1.1-blue" alt="License" /></a>
  <a href="https://docs.lenserfight.com"><img src="https://img.shields.io/badge/docs-lenserfight.com-green" alt="Docs" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/supabase-postgres-3ecf8e" alt="Supabase" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-5.x-3178c6" alt="TypeScript" /></a>
  <a href="https://nx.dev"><img src="https://img.shields.io/badge/nx-monorepo-143055" alt="Nx" /></a>
</p>

---

## What ships in this OSS beta

LenserFight Community Edition is the public, installable part of LenserFight focused on:

- creating and versioning lenses
- building DAG-based workflows
- running supported workflows locally or through documented platform-credit paths
- hacking on the docs, UI, and workflow engine in one Nx monorepo

This repo does not currently promise public battles, benchmark suites, enterprise workspaces, or a general-purpose public connector SDK.

---

## Quick Start

Use `pnpm` as the canonical package manager for this repository.

```bash
git clone https://github.com/connectlens/lenserfight-web.git
cd lenserfight-web
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase:db:reset
pnpm nx run web:serve
```

Open the web app at `http://localhost:4200`.

If you want to verify the docs site too:

```bash
pnpm nx run docs:serve
```

For the full local database flow, see `docs/reference/database/local-setup.md`.

---

## Supported now

- lens creation, versioning, and local experimentation
- workflow creation, forking, and run monitoring in the web app
- `lf run exec` for direct model execution via Ollama, BYOK, or cloud credits
- Community Edition local Supabase setup
- documentation, workflow engine, providers, and UI contributions

## Not part of the current OSS launch promise

- public battles or public arena navigation
- benchmark UI in Community Edition
- enterprise billing, private workspaces, or advanced analytics
- autonomous `lf run submit`, `lf run vote`, `lf run full`, or `lf run replay`
- a stable public adapter SDK or `libs/adapters/*` extension surface

---

## Workflow execution notes

Current workflow support is intentionally narrow and explicit:

- in-app workflow runs are the primary supported path
- local BYOK and platform-credit execution are supported where the provider path already exists
- cloud BYOK workflow execution depends on the platform executor and is not a self-host guarantee in this repo
- unsupported automation commands remain scaffolded or experimental until they are implemented end to end

See `docs/reference/cli/run.md` and `docs/reference/workflows/execution-engine.md` for the exact current contract.

---

## Repository Structure

```text
.
├─ apps/
│  ├─ web/         Community Edition web app for lenses, workflows, and profiles
│  ├─ auth/        Auth shell used during local and cloud-linked flows
│  ├─ cli/         CLI for setup, local dev, and direct model execution
│  └─ docs/        VitePress documentation site
├─ libs/
│  ├─ api/         Contracts and DTOs
│  ├─ data/        Repositories, cache, Supabase client
│  ├─ domain/      Business logic
│  ├─ features/    Vertical feature slices
│  ├─ infra/       Execution engine, moderation, storage
│  ├─ ui/          Shared UI components and providers
│  ├─ types/       Shared TypeScript types
│  └─ utils/       Low-level utilities
├─ docs/           Markdown source for the docs site
└─ supabase/       Database schema, migrations, and seed data
```

---

## Contributing

We welcome focused contributions that improve installability, workflow reliability, docs, and developer ergonomics.

- Start with `CONTRIBUTING.md`
- Contributor guides live in `docs/how-to/contributors/`
- For larger ideas, open an issue before investing in implementation

If you change behavior, run the smallest relevant validation and mention what you did in your PR.

---

## Documentation

- Getting started: `docs/tutorials/getting-started/overview.md`
- Installation: `docs/tutorials/getting-started/installation.md`
- Local database setup: `docs/reference/database/local-setup.md`
- Community API: `docs/reference/community-api/index.md`
- Workflow engine: `docs/reference/workflows/execution-engine.md`
- Workflow contracts: `docs/reference/workflows/contract-schema.md`
- Workflow test plan: `docs/reference/workflows/test-plan.md`
- CLI run commands: `docs/reference/cli/run.md`

---

## License

LenserFight Community Edition is licensed under the [Business Source License 1.1](LICENSE).

- local, personal, and community use of this repository is allowed under the BSL terms
- hosted SaaS use and larger commercial deployment require a commercial license
- each release converts to Apache 2.0 after the BSL change date defined in `LICENSE`
