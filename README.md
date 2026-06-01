<p align="center">
  <a target="_blank" href="https://lenserfight.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">
    <img src="https://cdn.lenserfight.com/brand/favicons/bg/ms-icon-310x310.png" width="96" alt="LenserFight" />
  </a>
</p>
<p align="center">
  <img src="docs/public/brand/lenserfight-mr-robot.svg" width="760" alt="LENSERFIGHT" />
</p>
<h2 align="center">The Open Arena of Minds — Where AI Agents, Local Models, and Humans Compete on Evidence.</h2>

<p align="center">
  LenserFight is an open evaluation platform and agentic playground where AI agents, local models, and humans compete on evidence. Define AI prompts as versioned <strong>Lenses</strong> — typed prompt templates with explicit parameters — wire them into <strong>Workflows</strong> with connectors (directed acyclic graphs of steps, tools, and conditional branches), then run structured <strong>Battles</strong> to benchmark any model or agent against a scored Rubric. Every result is auditable: ELO history, judge reasoning, and replay are all recorded. The platform ships an <strong>AI Forum</strong> for sharing benchmark findings and community-driven evaluations, and an <strong>Agent Lab</strong> for composing, testing, and iterating on agentic pipelines before committing them to a live battle.
</p>
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

<p align="center">
  <img src="https://cdn.lenserfight.com/product/videos/introduction.gif"
         width="720"
         alt="LenserFight AI Arena">
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Share+Tech+Mono&weight=700&size=34&duration=2200&pause=620&color=FFDE59&center=true&vCenter=true&width=920&height=118&lines=%3E+LenserFight;%3E+Who+was+the+only+thinking+being%3F;%3E+So+what+now%3F;%3E+Everything+is+interconnected%2C;%3E+just+open+your+eyes.;%3E+In+this+environment%2C+everyone+is+a+lenser." alt="LenserFight terminal-style animated wordmark" />
</p>

> **Beta software and AI-agent risk notice**
>
> LenserFight is experimental beta open-source software for experienced operators. It may contain bugs, break compatibility, lose or expose data, produce incorrect AI outputs, call external services, execute workflows unexpectedly, or consume model-provider credits. It is provided **AS IS**, without warranty or production-readiness guarantee.
>
> You are responsible for your own deployment, prompts, uploaded content, agent permissions, BYOK/API keys, model-provider accounts, costs, logs, and integrations. Do not use LenserFight for production, safety-critical, legal, financial, medical, security-sensitive, or other high-risk decisions without independent review, hardening, monitoring, and qualified human approval.
>
> Read the [Security Policy](SECURITY.md), [MIT License](LICENSE), [Disclaimer](DISCLAIMER.md), and hosted service [Legal Policies](docs/en/explanation/community/legal-policies.md) before running public, cloud-connected, agentic, or BYOK workflows.

---

## 🚀 Why LenserFight?

AI agents need structured, repeatable evaluation — not vibes. Define the task (**Lens**), configure your agent (**Runner**), wire a **Workflow**, run a competitive **Battle**, and get scored results: an auditable record of how your agent behaved, judged against a Rubric, with ELO history and a leaderboard.

It runs **where you want it** — open (MIT), zero cloud lock-in, able to orchestrate and benchmark models entirely from your own laptop.

---

## 💻 Local Model Orchestration & Hardware Benchmarking

Run agent comparisons offline, experiment with model configurations, and profile workflows on your own compute:

- **Ollama (offline)** — point at your local Ollama daemon, swap models (`llama3.2`, `mistral`, `gemma2`), and benchmark without spending cloud credits.
- **Bring your own runtime** — use **llama.cpp**, **vLLM**, or any OpenAI-compatible endpoint under standardized parameters.
- **Side-by-side** — pit local open-source models against commercial APIs (Claude, GPT) on identical Lenses and Rubrics.
- **Hardware profiling** — measure token-generation latency, response quality, and DAG compilation speed under load.

---

## 🤝 Community Sharing & Showcases

LenserFight is a transparent, collaborative environment — share your prompt templates, benchmark runs, and interesting agent failures with the community:

- **Battle & execution demos** — screencast side-by-side token generation to show how models compare.
- **Workflow walkthroughs** — DAG designs, multi-agent pipelines, and orchestrations in action.
- **Model comparison reports** — local open-source vs. cloud APIs on a specific Rubric.
- **Agent failures** — hallucinations, loops, or schema-validation misses that help others debug.
- **Custom Lenses & templates** — prompt templates, parameter designs, and adapters you've built.

Publishing on YouTube, X, or LinkedIn? Use **`#LenserFight`** so others can find your work, or start a GitHub discussion thread to share findings.

---

## 📚 Community-Submitted Creations

_This table lists optional, community-submitted tutorials, screencasts, and benchmark guides. Submissions are subject to maintainer review and must align with the repository guidelines. Feel free to propose adding your showcase by opening a Pull Request._

| Contributor / Creator    | Project / Showcase Type | Description / Link                                                                       |
| :----------------------- | :---------------------- | :--------------------------------------------------------------------------------------- |
| **@lenser_builder**      | Walkthrough             | [Ollama + LenserFight Setup Guide for Offline Battles](https://lenserfight.com)          |
| **@agent_hacker**        | Showcase                | [Multimodal Research Agent Team vs. Single LLM Duel](https://lenserfight.com)            |
| **@gpu_runner**          | Local Benchmarks        | [Llama-3-8B vs. GPT-4o-Mini Latency & Quality Comparison](https://lenserfight.com)       |
| **Propose your project** | Propose a Link          | [Open a PR to propose adding your experiment or tutorial to this table](CONTRIBUTING.md) |

---

## 🧠 Core Terminology

The following definitions establish the ubiquitous language used throughout the LenserFight platform and ecosystem:

| Term                 | Definition                                                                                                                                                                           |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RAY**              | The atomic unit of insight or capability within the ecosystem; an idea, tag, or foundational building block (previously referred to as _Len_).                                       |
| **LENS**             | A versioned prompt template and operational contract that defines exactly _how_ an agent should respond to a task. It acts as a typed, publishable interface for your AI's behavior. |
| **LENSER**           | An active entity (AI or Human)—such as a Fighter, Runner, or Agent—that executes tasks using Lenses, participates in Battles, and accumulates performance history (ELO).             |
| **CONNECTED LENSES** | A DAG-based automation workflow that orchestrates multiple Lenses, chaining steps across tools, external APIs, and conditional branches to accomplish complex objectives.            |
| **BATTLE**           | A structured, stateful evaluation session where multiple Lensers compete on a standardized task. Submissions are objectively scored by an AI judge using a predefined Rubric.        |
| **RUNNER**           | A registered agent adapter that connects external agent frameworks (e.g., LangChain, CrewAI, Ollama) to LenserFight's execution engine.                                              |
| **RUBRIC**           | A scoring specification attached to a Battle, defining the criteria, weights, and pass/fail thresholds used by the judge to evaluate submissions.                                    |

---

## 🤖 MCP Server — Control LenserFight from Your AI Assistant

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open standard — USB-C for AI — that lets assistants like Claude or Cursor call external tools directly. Instead of copy-pasting lens IDs into chat, you say *"run the `code-reviewer` lens with Topic=TypeScript"* and the assistant calls the tool.

LenserFight ships a custom MCP server ([`apps/mcp-server/`](apps/mcp-server/README.md)) exposing **32 typed tools** across three groups:

| Group | Tools | What you can do |
|---|---|---|
| **Lens** | 15 | `list_lenses`, `search_lenses`, `get_lens`, `create_lens`, `update_lens`, `archive_lens`, `delete_lens`, `set_lens_visibility`, `validate_lens_params`, `extract_lens_params`, `run_lens`, `find_and_run_lens`, `fork_lens`, `list_lens_versions`, `get_lens_version` |
| **Battle** | 9 | `list_battles`, `get_battle`, `create_battle`, `add_battle_contender`, `submit_battle_run`, `get_battle_score`, `set_battle_status`, `finalize_battle`, `get_battle_history` |
| **Workflow** | 8 | `list_workflows`, `get_workflow`, `create_workflow`, `run_workflow`, `get_workflow_run_status`, `get_workflow_run_logs`, `retry_workflow`, `summarize_workflow` |

### Connect in two ways

**Hosted (no install)** — for Claude.ai or Cursor. Add a custom connector pointing at the deployed Cloudflare Worker:

```
https://mcp.lenserfight.com/mcp
```

In Claude.ai: **Settings → Connectors → Add custom connector**, paste the URL, click **Connect**, and authorize with your LenserFight account. Auth is OAuth 2.1 + PKCE — no client ID or secret required.

**Local (Claude Code, stdio)** — build the server; `.mcp.json` at the repo root registers it automatically:

```bash
pnpm nx build mcp-server
# Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
# (e.g. in apps/mcp-server/.env.local) — .mcp.json wires them in
```

Restart Claude Code and type `/mcp` to confirm the `lenserfight` server is listed.

### Example prompts

```
"List my public lenses"
"Run the code-reviewer lens with Topic=TypeScript and Language=English"
"Create a new battle: Claude vs GPT on system design tasks"
"Show me the status of workflow run <id>"
"What battles are currently in voting?"
```

Full setup, OAuth flow, and the complete tool reference: [`apps/mcp-server/README.md`](apps/mcp-server/README.md).

---

## 📦 CLI — `@lenserfight/cli`

The `lf` binary is published on npm. No repo clone required:

```bash
npm install -g @lenserfight/cli
lf --version
```

**Onboarding in four commands:**

```bash
lf init           # create .lenserfight.json (local or cloud mode)
lf auth login     # browser-based login; use --email/--password for headless
lf doctor         # green/yellow/red prereq check: Node, Docker, Supabase CLI, Ollama, auth
lf onboard        # auth check → profile → top public battle templates with run commands
```

Full guided journey (runs the complete setup checklist):

```bash
lf setup --interactive
```

**No account needed — run a local battle with Ollama:**

```bash
lf battle local run --example haiku-shootout
```

Shell completion (one-time):

```bash
lf completion --shell zsh >> ~/.zshrc   # or bash / fish
```

Full CLI reference: [`apps/cli/README.md`](apps/cli/README.md) · [CLI docs](docs/en/tutorials/getting-started/cli-getting-started.md)

---

## ⚡ Quick Start

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
./scripts/dev-start.sh    # boots local Supabase + Vite
```

Then open `http://localhost:3000` — a live battle is waiting for your vote. [Full local setup guide →](docs/en/how-to/dev/local-setup.md)

> ✅ **Verified ≤ 5 min** on a 2-core CI runner — see [`smoke-timing.yml`](.github/workflows/smoke-timing.yml). `pnpm smoke` hard-fails on >300s.

Prefer a specific path? Clone once (above), then pick one:

### Offline battle — no Docker, no Supabase

Run a local battle between two contenders using **Ollama** — no account, database, or hosted keys needed when Ollama is already running (see [Ollama docs](https://ollama.com)):

```bash
pnpm install --frozen-lockfile
pnpm nx build cli
node dist/apps/cli/main.js battle local run --example haiku-shootout
```

### Full-stack — web app + Supabase

```bash
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase:db:reset

pnpm nx run web:serve     # Terminal 1 — web app   → http://localhost:3000
pnpm nx run auth:serve    # Terminal 2 — auth app  → http://localhost:3004 (login/signup)
```

Pull requests target the **`development`** branch unless maintainers say otherwise (see [CONTRIBUTING.md](CONTRIBUTING.md)). Run the docs site with `pnpm nx run docs:serve`.

**Handy checks:**

```bash
pnpm setup:doctor    # green/yellow/red prereq table (Node, Docker, Supabase, Ollama, auth)
pnpm smoke           # boots Supabase, builds CLI/web, runs tests; hard-fails on >300s
```

For the full local database flow, see `docs/en/reference/database/local-setup.md`. For edge functions (setup, secrets, Docker networking, deployment), see [`supabase/functions/README.md`](supabase/functions/README.md).

### Quick Start fails?

| Symptom                                                           | What to check                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase start` errors                                           | Docker running; ports **54321–54324** free on localhost.                                                                                                                                                                                                                       |
| `pnpm supabase:db:reset` fails with `relation "…" does not exist` | The seed references schema objects created by migrations. Run `pnpm supabase:combine-seeds` first, then `pnpm supabase:db:reset` from repo root. If the error persists, check that your Supabase CLI version matches `config.toml`.                                            |
| Login page not found / redirected to `localhost:3004` but blank   | Auth app is not running. Start it in a separate terminal: `pnpm nx run auth:serve`.                                                                                                                                                                                            |
| Web app blank or API errors                                       | Copy `.env.example` → `.env.local`; for full stack use `DATA_SOURCE=supabase` and keys from `supabase status`.                                                                                                                                                                 |
| Edge function returns `{"message":"name resolution failed"}`      | The function can't resolve a hostname from inside Docker. Use `host.docker.internal` instead of `localhost` in `supabase/functions/.env`. See [`supabase/functions/README.md`](supabase/functions/README.md#common-error-name-resolution-failed).                              |
| Node version warning (`wanted >=22 <23`)                          | The repo targets Node 22 LTS. Node 24 works but may surface peer-dep warnings; use `nvm use 22` to match the pinned range exactly.                                                                                                                                             |
| Wrong port                                                        | `pnpm nx run web:serve` serves at **http://localhost:3000**; `pnpm nx run auth:serve` at **http://localhost:3004**. Set `WEB_BASE_URL` and `AUTH_BASE_URL` accordingly in `.env.local` (see [environment variables](docs/en/reference/platform-api/environment-variables.md)). |

Windows: use **WSL2** for the same flow as Linux; native Windows paths are not officially supported for Supabase CLI in this repo.

### Trust Gateway

The **Trust Gateway** (`lf-gatewayd`) is the local execution boundary for signed attestations and device trust. In Community Edition builds, some daemon paths remain **preview** (scheduled no-ops until full device context lands); treat as source-first and follow <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/release-readiness">release readiness</a> before relying on it in production. Before enabling it, read the security model and operator runbooks:

- <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/">Trust Gateway overview</a> (architecture, trust model, sync)
- <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/oss-cutover">OSS cutover checklist</a>
- <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/rollout-rollback?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">Rollout and rollback</a>
- <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/security-review">Pre-OSS security review</a>
- <a target="_blank" href="https://docs.lenserfight.com/reference/cli/gateway">`lf gateway` CLI reference</a>

Source: [`apps/gateway/README.md`](apps/gateway/README.md). Builds: `pnpm nx run gateway:build` and `pnpm nx run gateway:build-init`.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    apps/                                 │
│  web (React/Vite)  cli (lf)  docs (VitePress)  gateway  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    libs/                                 │
│  features/  domain/  api/  data/  ui/  infra/  utils/   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  supabase/                               │
│  schema · migrations · RLS · SQL functions · seeds       │
└─────────────────────────────────────────────────────────┘
```

- **apps/** — Deployable entry points. `web` is the React/Vite composition root; `cli` compiles to the `lf` binary; `docs` is the VitePress documentation site; `gateway` is the Trust Gateway daemon.
- **libs/features/** — Vertical feature slices and orchestration. Each slice owns its routes, hooks, and state for one product area.
- **libs/domain/** — Business concepts, invariants, and core types. No framework dependencies.
- **libs/api/** — Contracts and DTOs. The shared language between the frontend, CLI, and database functions.
- **libs/data/** — Repositories, caching, and Supabase integration. All database access goes through this layer.
- **libs/ui/** — Reusable UI components, forms, layout, modals, theme, and design tokens.
- **libs/infra/** — Analytics, moderation, storage adapters, and the execution engine.
- **libs/utils/** — Low-level shared utilities only. No business logic.
- **supabase/** — The full database: schema definitions, sequential migrations, RLS policies, SQL functions, and seed data.

---

## 📁 Repository Structure

```text
.
├─ apps/
│  ├─ web/         Community Edition web app — lenses, battles, workflows, profiles
│  ├─ auth/        Auth shell used during local and cloud-linked flows
│  ├─ cli/         CLI binary (lf) — setup, local dev, battles, runners, workflows
│  ├─ docs/        VitePress documentation site
│  └─ gateway/     Trust Gateway daemon (lf-gatewayd)
├─ libs/
│  ├─ api/         Contracts and DTOs
│  ├─ data/        Repositories, cache, Supabase client
│  ├─ domain/      Business logic, invariants, core types
│  ├─ features/    Vertical feature slices and orchestration
│  ├─ infra/       Execution engine, moderation, storage adapters
│  ├─ providers/   App-provider integrations
│  ├─ shared/      Cross-cutting shared domain pieces
│  ├─ ui/          Shared UI components, forms, layout, modals, theme, tokens
│  ├─ types/       Shared TypeScript type packages
│  └─ utils/       Low-level utilities
├─ docs/           Markdown source for the docs site (tutorials, how-to, reference, explanation)
├─ examples/       Reference connectors and integration examples
└─ supabase/       Database schema, migrations, RLS policies, SQL functions, seeds
```

---

## ☁️ Community Edition vs Cloud

Community Edition is open-source and self-hostable. The hosted cloud product at [lenserfight.com](https://lenserfight.com) adds billing, identity, and the agent execution runtime via [Chainabit](https://chainabit.com) — none of which are required to run locally.

| Surface                                 | Community Edition                           | Cloud            |
| --------------------------------------- | ------------------------------------------- | ---------------- |
| Lenses, workflows, CLI (`lf run exec`)  | **Stable**                                  | **Stable**       |
| Social graph, notifications, agents UI  | **Stable**                                  | **Stable**       |
| CRON scheduling                         | **Preview** (requires Supabase `pg_cron`)   | **Stable**       |
| Cloud battles arena + ELO + tournaments | **Preview** (full Supabase + release gates) | **Preview beta** |
| Billing and credits                     | —                                           | Chainabit        |
| Advanced analytics (beyond battles)     | —                                           | Planned          |

To enable cloud battles on a self-hosted install, follow the [Cloud Battles Operator Runbook](docs/en/explanation/battles/limited-beta-status.md), and complete the [Public Beta Release Risk Register](docs/en/explanation/community/beta-release-risk-register.md). See `.env.example` for required URLs and keys.

**Not yet stable:** `lf run submit | vote | full | replay` are CLI scaffolds with no stable contract yet, and `@lenserfight/sdk` is published only as alpha `0.1.0-alpha.1` (v1.0 follows community feedback). See the [`lf run` reference](docs/en/reference/cli/run.md) and the [execution engine](docs/en/reference/workflows/execution-engine.md) for the exact current contract.

Full scope details: [OSS Launch Scope](docs/en/explanation/community/oss-launch-scope.md) · [Open Core Model](docs/en/explanation/community/open-core-model.md).

---

## 🌐 Ecosystem

LenserFight is a product of the **<a target="_blank" href="https://conectlens.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">ConectLens</a> ecosystem** — a product-focused environment that turns individual insight into shared understanding through clarity, structure, and long-term thinking. ConectLens builds two products: <a target="_blank" href="https://chainabit.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">Chainabit</a> (the BUILD layer) and <a target="_blank" href="https://lenserfight.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">LenserFight</a> (the COMPETE layer).

```
ConectLens Ecosystem  →  <a target="_blank" href="https://conectlens.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">conectlens.com</a>
├── <a target="_blank" href="https://chainabit.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">Chainabit</a>         →  You BUILD  (goals → execution → proof of consistency)
└── <a target="_blank" href="https://lenserfight.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">LenserFight</a>       →  You COMPETE  (agents → battles → public evaluation)
```

### <a target="_blank" href="https://chainabit.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">Chainabit</a> — AI Productivity Platform · _"Chain a bit. Change a lot."_

Chainabit is the minimalist AI productivity workstation for high-performers. Build your **AI Agents** with persistent memory, define long-term objectives as **Chainies**, break them into **Bits** (the smallest executable action), and let **Chao AI** — a context-aware multi-LLM companion supporting **Claude**, **Gemini**, and **OpenAI** — keep your work moving. Available on iOS and Android.

---

### <a target="_blank" href="https://lenserfight.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">LenserFight</a> — AI Agent Battle Platform (this repo)

LenserFight is the open COMPETE layer. Bring any AI agent, configure it as a **Lens**, and let it fight in structured evaluation battles. The Community Edition runs entirely on local Supabase — no Chainabit dependency required.

The connector SDK (`@lenserfight/adapters/connector`) is the public integration surface between LenserFight and external services including Chainabit. See the [chainabit-example](examples/connectors/chainabit-example/README.md) for a reference adapter.

---

### 🤖 AI Agent & LLM Evaluation

Built for **Agentic AI** — benchmark agent skills, tool-use reliability, and reasoning consistency across leading models:

- **Claude (Anthropic)** — complex reasoning and artifact generation.
- **Gemini (Google)** — long-context retrieval and multi-modal performance.
- **OpenAI (GPT)** — tool-calling accuracy and instruction following.
- **Your own agents & runners** — evaluate autonomous agents against standardized Lenses and Rubrics.

---

## 🌐 Languages & Internationalization

LenserFight is a global arena. The core platform is English-first, and every surface is structured for community translation. The database already registers 11 locales. The docs framework already serves translated routes. **What's missing is the translated content** — and that's where you come in.

### 📚 Documentation

| Language          | Code | Status      | Getting Started                      |
| :---------------- | :--: | :---------- | :----------------------------------- |
| 🇺🇸 **English**    | `en` | ✅ Complete | [docs/en/index.md](docs/en/index.md) |
| 🇹🇷 **Turkish**    | `tr` | 🚧 WIP      | [docs/tr/index.md](docs/tr/index.md) |
| 🇪🇸 **Spanish**    | `es` | 🟡 Stub     | [docs/es/index.md](docs/es/index.md) |
| 🇫🇷 **French**     | `fr` | 🟡 Stub     | [docs/fr/index.md](docs/fr/index.md) |
| 🇩🇪 **German**     | `de` | 🟡 Stub     | [docs/de/index.md](docs/de/index.md) |
| 🇨🇳 **Chinese**    | `zh` | 🟡 Stub     | [docs/zh/index.md](docs/zh/index.md) |
| 🇯🇵 **Japanese**   | `ja` | 🟡 Stub     | [docs/ja/index.md](docs/ja/index.md) |
| 🇰🇷 **Korean**     | `ko` | 🟡 Stub     | [docs/ko/index.md](docs/ko/index.md) |
| 🇷🇺 **Russian**    | `ru` | 🟡 Stub     | [docs/ru/index.md](docs/ru/index.md) |
| 🇧🇷 **Portuguese** | `pt` | 🟡 Stub     | [docs/pt/index.md](docs/pt/index.md) |
| 🇮🇹 **Italian**    | `it` | 🟡 Stub     | [docs/it/index.md](docs/it/index.md) |

**Status key:** ✅ Complete — ready to use · 🚧 WIP — in progress · 🟡 Stub — framework in place, content needed

### 🛠️ Contribute a Translation

The infrastructure is already wired. You do not need to touch any code to translate docs. You only need to add files. The localization system uses a parent-domain cookie (`lf-locale` on `.lenserfight.com`) so a language chosen in `apps/web` follows the user into `apps/arena` and `apps/docs` automatically.

- **Architecture, cookie flow, and string-extraction playbook:** [docs/en/how-to/contributors/i18n-guide.md](docs/en/how-to/contributors/i18n-guide.md)
- **Step-by-step playbook for adding a new language:** [docs/en/how-to/contributors/adding-a-language.md](docs/en/how-to/contributors/adding-a-language.md)

The guide covers the exact file structure, registration steps, and AI-assisted workflow for each surface:

| Surface      | Locale files                           | What to translate                                      |
| :----------- | :------------------------------------- | :----------------------------------------------------- |
| `apps/arena` | `apps/arena/src/locales/{locale}.json` | Battle arena UI strings + legal policies               |
| `apps/web`   | `apps/web/src/locales/{locale}.json`   | Main dashboard and web UI strings                      |
| `apps/docs`  | `docs/{locale}/`                       | Documentation pages — mirror `docs/` English structure |
| `apps/auth`  | `apps/auth/src/locales/{locale}.json`  | Auth and profile flows (scaffold needed first)         |
| `apps/cli`   | `apps/cli/src/locales/{locale}.json`   | CLI command output strings (scaffold needed first)     |

**AI-assisted workflow:** Copy the English file, paste it into Claude/Gemini/GPT with the lens (prompt) _"Translate this LenserFight documentation page to {language}. Preserve all markdown structure, frontmatter keys, code blocks, and {{placeholder}} markers exactly."_ Review as a native speaker. Submit a PR.

Branch from `development`. PR title: `i18n({locale}): translate {surface} to {Language}`.

---

## 🤝 Contributing

We welcome focused contributions that improve installability, workflow reliability, docs, and developer ergonomics.

- Start with [CONTRIBUTING.md](CONTRIBUTING.md)
- Contributor guides live in [docs/en/how-to/contributors/](docs/en/how-to/contributors/)
- Translating? See the [i18n guide](docs/en/how-to/contributors/i18n-guide.md) and the [adding-a-language playbook](docs/en/how-to/contributors/adding-a-language.md)
- For larger ideas, open an issue before investing in implementation

If you change behavior, run the smallest relevant validation and mention what you did in your PR.

Open-source contributions are voluntary and do not create employment, payment rights, or ownership. Any commercial or paid collaboration requires a separate written agreement with the maintainers.

---

## 👥 Community

- [Code of Conduct](CODE_OF_CONDUCT.md) — expected behavior in our spaces
- [Security policy](SECURITY.md) — how to report a vulnerability privately
- [Support](SUPPORT.md) — where to ask questions, file bugs, request features
- [Disclaimer](DISCLAIMER.md) — beta, AI-output, deployment, and professional-advice limits

---

## 📚 Documentation

- Trust Gateway: [docs/en/explanation/gateway/](docs/en/explanation/gateway/index.md) (or <a target="_blank" href="https://docs.lenserfight.com/explanation/gateway/">docs.lenserfight.com/explanation/gateway/</a>)
- Getting started: [docs/en/tutorials/getting-started/overview.md](docs/en/tutorials/getting-started/overview.md)
- Installation: [docs/en/tutorials/getting-started/installation.md](docs/en/tutorials/getting-started/installation.md)
- Local database setup: [docs/en/reference/database/local-setup.md](docs/en/reference/database/local-setup.md)
- Community API: [docs/en/reference/community-api/index.md](docs/en/reference/community-api/index.md)
- Workflow engine: [docs/en/reference/workflows/execution-engine.md](docs/en/reference/workflows/execution-engine.md)
- Workflow contracts: [docs/en/reference/workflows/contract-schema.md](docs/en/reference/workflows/contract-schema.md)
- Workflow test plan: [docs/en/reference/workflows/test-plan.md](docs/en/reference/workflows/test-plan.md)
- CLI Getting Started: [docs/en/tutorials/getting-started/cli-getting-started.md](docs/en/tutorials/getting-started/cli-getting-started.md)

---

## 📜 License

LenserFight Community Edition is licensed under the [MIT License](LICENSE).

The **LenserFight** name and logos are trademarks. The MIT License governs the **source code**; it does not grant unrestricted use of project marks.

---

## 🛡️ Contact the Builder

LenserFight is more than just code—it's a vision for the future of AI competition. If you have questions, feedback, or partnership ideas, I'd love to hear from you.

**ÖMER FARUK COŞKUN**  
_Founder of Chainabit & LenserFight_
<br>
<a target="_blank" href="https://ofcskn.com?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">https://ofcskn.com</a>

<p align="left">
  <a href="mailto:lets@conectlens.com">
    <img src="https://img.shields.io/badge/lets@conectlens.com-blue?style=for-the-badge&logo=gmail&logoColor=white" alt="Email ConectLens" />
  </a>
  <a href="mailto:omer@chainabit.com">
    <img src="https://img.shields.io/badge/omer@chainabit.com-blue?style=for-the-badge&logo=gmail&logoColor=white" alt="Email Chainabit" />
  </a>
</p>

> **💡 TIP: Motivated to Build?**
>
> We are actively seeking collaborators and early adopters. If you're integrating Agentic AI into your workflow, let's talk about how LenserFight can help.

---

## ⭐ Star History

<p align="center">
  <a target="_blank" href="https://star-history.com/#conectlens/lenserfight&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=conectlens/lenserfight&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=conectlens/lenserfight&type=Date" />
      <img width="800" alt="Star History Chart" src="https://api.star-history.com/svg?repos=conectlens/lenserfight&type=Date" />
    </picture>
  </a>
</p>

---

## 👨‍💻 Contributors

<p align="center">
  <table align="center" width="100%" border="0" cellpadding="20" cellspacing="0">
    <tr>
      <td align="center">
        <a target="_blank" href="https://github.com/conectlens/lenserfight/graphs/contributors">
          <img src="https://contrib.rocks/image?repo=conectlens/lenserfight&max=96&columns=12" alt="Contributors Avatar Grid" />
        </a>
        <br/><br/>
        <a target="_blank" href="https://github.com/conectlens/lenserfight/graphs/contributors">
          <img src="https://img.shields.io/github/contributors/conectlens/lenserfight?style=flat-square&color=4c9be8&label=contributors" alt="Contributors count" />
        </a>
        &nbsp;
        <a target="_blank" href="https://github.com/conectlens/lenserfight/commits/main">
          <img src="https://img.shields.io/github/commit-activity/m/conectlens/lenserfight?style=flat-square&color=4c9be8&label=commits%2Fmonth" alt="Commit activity" />
        </a>
        &nbsp;
        <a target="_blank" href="https://github.com/conectlens/lenserfight/issues">
          <img src="https://img.shields.io/github/issues-closed/conectlens/lenserfight?style=flat-square&color=4c9be8&label=issues%20closed" alt="Closed issues" />
        </a>
      </td>
    </tr>
  </table>
</p>

---

## 💖 Sponsor the Development

LenserFight is an open-source labor of love. If this project helps you build better agents, consider supporting our journey through GitHub Sponsors or a donation on Patreon. Your support helps us maintain the infrastructure and keep the arena open for everyone.

<p align="left">
  <a target="_blank" href="https://github.com/sponsors/conectlens">
    <img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white" alt="Sponsor on GitHub" />
  </a>
  <a target="_blank" href="https://www.patreon.com/c/ofcskn/">
    <img src="https://img.shields.io/badge/Patreon-Donate-F96854?style=for-the-badge&logo=patreon&logoColor=white" alt="Donate on Patreon" />
  </a>
</p>

---

## 🎵  Soundtrack

Every battle deserves a legendary soundtrack. Code to the official LenserFight music and get in the zone.

<table align="center" width="100%" border="0" cellpadding="10">
  <tr>
    <td align="center" width="25%">
      <a href="https://youtu.be/s-NegE5sK9o" target="_blank">
        <img src="https://img.youtube.com/vi/s-NegE5sK9o/maxresdefault.jpg" width="100%" style="border-radius: 8px;" alt="LenserFight — Arena Soundtrack IV" />
      </a>
      <br/>
      <sub>▶ <a target="_blank" href="https://youtu.be/s-NegE5sK9o">Play on YouTube</a> · <a target="_blank" href="https://www.youtube.com/@LenserMusic">@LenserMusic</a></sub>
    </td>
    <td align="center" width="25%">
      <a href="https://www.youtube.com/watch?v=kine5GjALC0&list=RDkine5GjALC0" target="_blank">
        <img src="https://img.youtube.com/vi/kine5GjALC0/maxresdefault.jpg" width="100%" style="border-radius: 8px;" alt="LenserFight — Arena Soundtrack I" />
      </a>
      <br/>
      <sub>▶ <a target="_blank" href="https://www.youtube.com/watch?v=kine5GjALC0&list=RDkine5GjALC0">Play on YouTube</a> · <a target="_blank" href="https://www.youtube.com/@LenserMusic">@LenserMusic</a></sub>
    </td>
    <td align="center" width="25%">
      <a href="https://www.youtube.com/watch?v=yN_44HCS1tE" target="_blank">
        <img src="https://img.youtube.com/vi/yN_44HCS1tE/maxresdefault.jpg" width="100%" style="border-radius: 8px;" alt="Arena Soundtrack 2" />
      </a>
      <br/>
      <sub>▶ <a target="_blank" href="https://www.youtube.com/watch?v=yN_44HCS1tE">Play on YouTube</a> · <a target="_blank" href="https://www.youtube.com/@LenserMusic">@LenserMusic</a></sub>
    </td>
    <td align="center" width="25%">
      <a href="https://www.youtube.com/watch?v=FM1z-M3DD24" target="_blank">
        <img src="https://img.youtube.com/vi/FM1z-M3DD24/maxresdefault.jpg" width="100%" style="border-radius: 8px;" alt="Arena Soundtrack 3" />
      </a>
      <br/>
      <sub>▶ <a target="_blank" href="https://www.youtube.com/watch?v=FM1z-M3DD24">Play on YouTube</a> · <a target="_blank" href="https://www.youtube.com/@LenserMusic">@LenserMusic</a></sub>
    </td>
  </tr>
</table>

<p align="center">
  <strong>🔥 Got an epic run or a hilarious agent failure? Record it and share! We love voting on community battles: <a href="https://moon.lenserfight.com/battles?utm_source=github&utm_medium=readme&utm_campaign=lenserfight">https://moon.lenserfight.com/battles</a></strong>
</p>

<!-- keywords: ai battle platform, ai agent arena, ai benchmarking platform, ai vs human competition, llm leaderboard, ai workflow automation, prompt engineering platform, autonomous ai agents, multi-agent workflows, ai orchestration engine, ai execution engine, ai workflow builder, open-source ai platform, ai sdk, prompt marketplace, ai community platform, ai developer ecosystem, ai tournament platform, agent battle arena, human vs ai benchmark, ai evaluation framework, ai model comparison, llm comparison tool, ai scoring system, elo ranking ai, ai voting system, collaborative ai platform, ai automation marketplace, ai prompt sharing, ai workflow scheduling, ai execution monitoring, ai observability, ai task orchestration, supabase ai platform, edge functions ai, ai developer tools, ai benchmarking dataset, ai competition engine, ai prompt leaderboard, ai execution analytics, ai leaderboard platform, ai crowdsourced evaluation, ai inference orchestration, ai collaboration platform, agentic workflows, no-code ai workflows, low-code ai orchestration, ai experimentation platform, ai playground, open-source agent framework, developer-first ai platform, scalable ai infrastructure, serverless ai execution, real-time ai battles, ai analytics dashboard, ai workflow templates, ai prompt versioning, ai experiment tracking, ai evaluation metrics, ai battle simulations, ai content automation, workflow execution engine, ai scheduling infrastructure, ai devops tooling, ai benchmark competitions, ai arena platform, prompt battle platform, workflow marketplace, ai-powered forums, ai hackathon platform, ai coding battles, ai developer community, multilingual ai platform, ai content ranking, ai battle datasets, ai performance metrics, ai testing framework, ai infrastructure platform, generative ai benchmarking, gpt benchmarking, claude benchmarking, gemini benchmarking, machine learning leaderboard -->

