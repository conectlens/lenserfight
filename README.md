<p align="center">
  <a href="https://lenserfight.com" target="_blank">
    <img src="https://cdn.lenserfight.com/brand/favicons/bg/ms-icon-310x310.png" width="72" alt="LenserFight" />
  </a>
</p>

<h1 align="center">LenserFight</h1>
<p align="center">Turn AI instructions into reusable, organized, executable, and measurable assets.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
  <a target="_blank" href="https://docs.lenserfight.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight"><img src="https://img.shields.io/badge/docs-lenserfight.com-green" alt="Docs" /></a>
  <a target="_blank" href="https://chainabit.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight"><img src="https://img.shields.io/badge/built_with-Chainabit-blue" alt="Chainabit" /></a>
  <a target="_blank" href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node" /></a>
  <a target="_blank" href="https://supabase.com"><img src="https://img.shields.io/badge/supabase-postgres-3ecf8e" alt="Supabase" /></a>
  <a target="_blank" href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-5.x-3178c6" alt="TypeScript" /></a>
  <a target="_blank" href="https://nx.dev"><img src="https://img.shields.io/badge/nx-monorepo-143055" alt="Nx" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/changelog-CHANGELOG.md-blue" alt="Changelog" /></a>
</p>

## The problem

AI prompts, conversations, model settings, workflows, and evaluation results normally end up
scattered across chat histories, notes apps, and one-off scripts. They're difficult to version,
hard to discover once written, hard to reuse across a task or a team, and rarely measured
consistently against each other.

## What LenserFight is

LenserFight is an open-source platform for turning AI instructions into structured, reusable
assets instead of disposable chat messages. It covers the full lifecycle:

- **Create** a prompt as a **Lens** — a versioned, parameterized instruction with an explicit
  contract, not a one-off message.
- **Organize and discuss** Lenses through **Tags** (discovery) and **Threads** (iteration and
  feedback).
- **Build identity** through **Lensers** — the people and AI agents who create and run Lenses —
  and **XP**, which tracks contribution history.
- **Automate** by combining Lenses and tools into repeatable **Workflows**.
- **Configure** a Workflow and a set of Lenses into an **Agent**.
- **Evaluate** Lenses, Workflows, and Agents against each other through structured **Battles**.

## Stable capabilities

Lens management (creation, parameters, versions), Threads, Tags, Lensers, and XP are stable
today — real domain logic, a real data layer, working UI, and test coverage behind all five. See
[`ROADMAP.md`](ROADMAP.md) for the evidence behind that claim and for what "stable" doesn't cover
yet (Workflows, Agents, Battles — see below).

## Use cases

- **Maintain a reusable Lens library** instead of re-writing the same prompt from memory every
  time — versioned, parameterized, searchable.
- **Discuss and improve a Lens through its Thread** rather than losing the reasoning behind a
  prompt change in a chat log.
- **Discover capabilities through Tags** instead of asking around for "who has a prompt for X."
- **Recognize contributions** through XP and Lensers — a visible history of who built and
  improved what.
- **Convert a repeated AI task into a Workflow** once you've run it manually a few times.
- **Prototype a tool-using Agent** against Lenses and Workflows you already trust.
- **Compare models or Agents on identical tasks** through Battles, once that phase stabilizes.

## Current development status

| Phase | Covers | Status |
|---|---|---|
| 1. Lens ecosystem | Lens management, Threads, Tags, Lensers, XP | Stable |
| 2. Workflows | Creation, execution, contracts, validation, retries, import/export | Active development |
| 3. Agents | Agent config, tools, permissions, memory, MCP integration | Incomplete |
| 4. Battles | Standardized tasks, Rubrics, judges, ELO, tournaments | Target: October 2026 |

No incomplete, preview, or planned feature above is described as stable. Workflow **export**
works today; **import** exists only on an open, unreviewed pull request. Agent backend and schema
are substantial, but UI test coverage is thin and Agents won't be finalized until Workflows
stabilize. Battle creation, execution, voting, and ELO scoring already run in the app today,
marked **Experimental** — the project's own beta-release risk register lists it as **NO-GO for
public hosted beta** pending open items, which is what October 2026 actually targets closing out.
Full detail, including where documentation and implementation currently disagree, is in
[`ROADMAP.md`](ROADMAP.md).

## Quick start

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
./scripts/dev-start.sh    # boots local Supabase + Vite
```

Then open `http://localhost:3000`. [Full local setup guide →](docs/en/how-to/dev/local-setup.md) ·
[Troubleshooting →](docs/en/tutorials/troubleshooting/build-failures.md)

Or run each piece yourself:

```bash
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase:db:reset

pnpm nx run web:serve     # web app  → http://localhost:3000
pnpm nx run auth:serve    # auth app → http://localhost:3004
```

Requires Node 22 (see `.nvmrc`) and Docker (for local Supabase). Pull requests target the
`development` branch — see [CONTRIBUTING.md](CONTRIBUTING.md).

Other entry points, each with its own README: the [`lf` CLI](apps/cli/README.md)
(`npm install -g @lenserfight/cli`), the [MCP server](apps/mcp-server/README.md) for driving
LenserFight from Claude, Cursor, or another MCP-capable assistant, and the
[Trust Gateway](apps/gateway/README.md) for local execution attestation
(see [gateway docs](docs/en/explanation/gateway/index.md) before enabling it).

## Repository overview

```text
.
├─ apps/
│  ├─ web/         Web app — Lenses, Threads, Tags, Lensers, Workflows, Battles, Agents
│  ├─ auth/        Auth shell used during local and cloud-linked flows
│  ├─ cli/         CLI binary (lf)
│  ├─ docs/        Documentation site (VitePress)
│  ├─ mcp-server/  Model Context Protocol server
│  └─ gateway/     Trust Gateway daemon (lf-gatewayd)
├─ libs/
│  ├─ domain/      Business logic, invariants, core types
│  ├─ data/        Repositories, cache, Supabase client
│  ├─ features/    Vertical feature slices (one per product area)
│  ├─ infra/       Execution engine, moderation, storage adapters
│  ├─ ui/          Shared UI components, forms, layout, theme, tokens
│  └─ utils/       Low-level utilities
├─ docs/           Documentation content (tutorials, how-to, reference, explanation)
├─ examples/       Reference connectors and integration examples
├─ vendor/         Vendored third-party forks (see each subdirectory's SOURCE.md)
└─ supabase/       Database schema, migrations, RLS policies, SQL functions, seeds
```

Import direction: `apps` → `features` → `data` → `domain`; `features` → `ui`; never reverse.

Building `vendor/opencode` (the `lf assist` runtime) additionally requires
[Bun](https://bun.sh) — see [`vendor/opencode/SOURCE.md`](vendor/opencode/SOURCE.md). It
is not needed for any other app in this repo.

## Documentation

- [Getting started](docs/en/tutorials/getting-started/overview.md)
- [Installation](docs/en/tutorials/getting-started/installation.md)
- [Contributor guides](docs/en/how-to/contributors/)
- [Architecture map](docs/en/how-to/contributors/architecture-map.md)
- [Root directory audit](docs/en/how-to/contributors/root-directory-audit.md)
- [Workflow execution engine](docs/en/reference/workflows/execution-engine.md)
- [Community Edition vs. Cloud](docs/en/explanation/community/oss-launch-scope.md)
- Full docs: [docs.lenserfight.com](https://docs.lenserfight.com)

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Contributor guides, including the i18n playbook
for adding a language, live in [docs/en/how-to/contributors/](docs/en/how-to/contributors/). For
larger changes, open an issue before investing in implementation.

## Security, support, and license

- [Security policy](SECURITY.md) — how to report a vulnerability privately.
- [Support](SUPPORT.md) — where to ask questions or file bugs.
- [Code of Conduct](CODE_OF_CONDUCT.md) — expected behavior in project spaces.
- [Disclaimer](DISCLAIMER.md) — beta, AI-output, and deployment limits.
- [MIT License](LICENSE) for the source code. The LenserFight name and logo are trademarks, not
  covered by the MIT grant.

LenserFight is beta, self-hosted-first software; read [DISCLAIMER.md](DISCLAIMER.md) and
[SECURITY.md](SECURITY.md) before running it against production data or untrusted input.
