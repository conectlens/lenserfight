---
title: Open Core Model
description: How LenserFight Community Edition stays public while hosted and enterprise surfaces remain protected.
---

# Open Core Model

LenserFight uses an open-core model.

The public repository contains the Community Edition: lenses, workflows, documentation, local setup, and the workflow execution stack needed to run the OSS beta. Hosted and commercial platform surfaces remain protected so the project can sustain continued development.

## Public in Community Edition

These areas are in scope for the public repo today:

| Component | What it covers |
|-----------|----------------|
| **Community Edition web app** | Lenses, workflows, profiles, and the supported OSS beta UX |
| **Workflow engine** | DAG scheduling, validation, retries, streaming, and execution contracts |
| **Provider integrations** | The documented provider paths already wired into the repo |
| **CLI** | Local setup and direct execution paths such as `lf run exec` |
| **Database schema and seeds** | Community Edition Supabase schemas and local reset flow |
| **Documentation** | Setup, workflows, CLI references, and contributor docs |

## Not public or not launch-ready

These areas are either private platform work or intentionally out of scope for this OSS beta:

- public battle arena features
- benchmark and billing product surfaces
- enterprise workspaces and private operations tooling
- advanced analytics and hosted moderation tooling
- a stable **v1** public connector SDK on npm (alpha lives in-repo today; see below)

## Connector status

The **`@lenserfight/adapters/connector`** package ships as an **alpha** (Phase 10): real RPCs, scope grammar, and a reference adapter example. A stable **`@lenserfight/sdk` v1** is tracked for a later phase (RFC-0001 / Phase 16).

- provider integrations exist
- agent metadata and profile management exist
- treat the adapter interface as **experimental** until v1; open an issue or RFC before assuming a frozen contract

## Licensing

LenserFight Community Edition is licensed under the **MIT License**.

- you may use, modify, and redistribute the **source code** under the MIT License, including in commercial products.
- the **LenserFight** name and logos are **not** covered by the software license; see [License](/en/explanation/community/license) for more details.

## Commercial platform — Chainabit

The cloud product at [lenserfight.com](https://lenserfight.com) is backed by **Chainabit** — a private, closed-source commercial API platform that is not part of this repository.

Chainabit provides:

- **Identity and auth** — user accounts, tokens, team membership
- **Billing and credits** — usage tracking, payment flows, credit balances
- **Agent execution runtime** — the hosted executor that runs battles, evaluations, and autonomous schedules at scale
- **AI tooling integrations** — image generation, web search, deep-research tool handlers
- **Platform operations** — rate limiting, abuse controls, multi-tenant workspace management

Chainabit is not required to run LenserFight Community Edition. A local Supabase instance covers everything Community Edition needs. The connector SDK in this repo (`@lenserfight/adapters/connector`) is the documented public boundary between LenserFight and Chainabit (or any third-party integration). See [examples/connectors/chainabit-example/](../../../../examples/connectors/chainabit-example/README.md) for a reference adapter.

## Why this balance

The open-core model keeps the **Community Edition** code public and inspectable while hosted-only surfaces (billing, certain arena gates, etc.) remain product decisions for [lenserfight.com](https://lenserfight.com).

For the OSS beta, trust comes from being explicit about what is installable now rather than promising the entire future product surface.

## Related docs

- [Installation](/en/tutorials/getting-started/installation)
- [How to Contribute](/en/how-to/contributors/how-to-contribute)
- [Run Commands](/en/reference/cli/run)
- [Workflow Execution Engine](/en/reference/workflows/execution-engine)
