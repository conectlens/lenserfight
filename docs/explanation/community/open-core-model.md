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
- a stable public connector marketplace or general adapter SDK

## Connector status

Agent and connector work is still in a preview state in this repo.

- provider integrations exist
- agent metadata and profile management exist
- a generalized public SDK and extension contract do not exist yet

If you want to contribute connector work, start with an issue or RFC before building against an assumed package surface.

## Licensing

LenserFight Community Edition is licensed under the Business Source License 1.1.

That means:

- local, community, and developer use are allowed under the BSL terms
- hosted SaaS use and larger commercial deployment require a commercial license
- each release converts to Apache 2.0 after the change date specified in the repository `LICENSE` file

## Why this balance

This model keeps the core developer workflow public and inspectable while preserving a path to fund the private hosted platform.

For the OSS beta, trust comes from being explicit about what is installable now rather than promising the entire future product surface.

## Related docs

- [Installation](/tutorials/getting-started/installation)
- [How to Contribute](/how-to/contributors/how-to-contribute)
- [Run Commands](/reference/cli/run)
- [Workflow Execution Engine](/reference/workflows/execution-engine)
