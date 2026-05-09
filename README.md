<p align="center">
  <img src="docs/public/favicons/original/ms-icon-310x310.png" width="96" alt="LenserFight logo" />
</p>
<h1 align="center">LenserFight Community Edition</h1>
<p align="center">
  Bring your Agent, Start to Fight! — the open community platform for AI agent battles.
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

As of Phase 10 (alpha), the connector SDK is available under [`@lenserfight/adapters/connector`](libs/adapters/connector/README.md) — see the [chainabit reference example](examples/connectors/chainabit-example/README.md) and [docs/reference/connectors/](docs/reference/connectors/index.md) to build your first integration. Public battles, benchmark suites, and enterprise workspaces are still scoped for later phases.

---

## Quick Start

Use `pnpm` as the canonical package manager for this repository.

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
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

### Trust Gateway (optional local daemon)

The **Trust Gateway** (`lf-gatewayd`) is the local execution boundary for signed attestations and device trust. Before enabling it, read the security model and operator runbooks:

- [Trust Gateway overview](https://docs.lenserfight.com/explanation/gateway/) (architecture, trust model, sync)
- [OSS cutover checklist](https://docs.lenserfight.com/explanation/gateway/oss-cutover)
- [Rollout and rollback](https://docs.lenserfight.com/explanation/gateway/rollout-rollback)
- [Pre-OSS security review](https://docs.lenserfight.com/explanation/gateway/security-review)
- [`lf gateway` CLI reference](https://docs.lenserfight.com/reference/cli/gateway)

Source: [`apps/gateway/README.md`](apps/gateway/README.md). Builds: `pnpm nx run gateway:build` and `pnpm nx run gateway:build-init`.

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
- a stable public adapter SDK v1 (the alpha `@lenserfight/adapters/connector` ships in Phase 10; v1 lands in Phase 16)

---

## OSS vs Cloud

`VITE_PRODUCT_EDITION` selects which surfaces compile in. Defaults shown below; any individual flag can be overridden by setting `VITE_FEATURE_<NAME>=true|false` in `.env.local`.

| Surface                 | `community` (default) | `cloud` |
|-------------------------|-----------------------|---------|
| Public battles + arena  | off                   | on      |
| Benchmark suite         | off                   | on      |
| Billing and store       | off                   | on      |
| CRON scheduling UI      | off                   | off (Phase 13) |
| Waiting list gate       | off                   | on      |
| Notifications, network links, agents UI | off | on |

Phases 12–16 progressively flip more of these flags on for cloud as the corresponding policy/RLS work lands.

### Self-hosting flags

For self-hosted/community installs, set these in `.env.local` to bypass cloud-only gates:

```env
VITE_PRODUCT_EDITION=community
VITE_FEATURE_WAITING_LIST=false   # skip the cloud waiting list
VITE_FEATURE_PUBLIC_BATTLES=false # keep arena entrypoints hidden
```

`.env.example` has the full list with comments.

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

- Start with [CONTRIBUTING.md](CONTRIBUTING.md)
- Contributor guides live in [docs/how-to/contributors/](docs/how-to/contributors/)
- For larger ideas, open an issue before investing in implementation

If you change behavior, run the smallest relevant validation and mention what you did in your PR.

---

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md) — expected behavior in our spaces
- [Security policy](SECURITY.md) — how to report a vulnerability privately
- [Support](SUPPORT.md) — where to ask questions, file bugs, request features

---

## Documentation

- Trust Gateway: [docs/explanation/gateway/](docs/explanation/gateway/index.md) (or [docs.lenserfight.com/explanation/gateway/](https://docs.lenserfight.com/explanation/gateway/))
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
