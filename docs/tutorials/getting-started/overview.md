---
title: LenserFight Community Edition Overview
description: LenserFight Community Edition is a developer-first OSS beta for building lenses, chaining workflows, and experimenting with AI execution paths locally.
head:
  - - meta
    - name: og:title
      content: LenserFight Community Edition Overview
  - - meta
    - name: og:description
      content: Build lenses, chain workflows, and run documented AI execution paths locally with LenserFight Community Edition.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

# Overview

**Build lenses. Chain workflows. Ship trustworthy AI experiments.**

LenserFight Community Edition is the public, installable OSS beta of LenserFight. It is optimized for developers who want a local workspace for lenses, workflows, and AI execution experiments without depending on the full private hosted platform.

## What this repo is for

- create and version lenses
- build multi-step workflows in the web app
- run supported workflow paths locally
- inspect the workflow engine, contracts, and provider integrations
- contribute fixes to docs, installability, and workflow reliability

## What this repo is not

- not the public battle arena
- not the benchmark suite product surface
- not the enterprise or billing console
- not a stable public connector marketplace or adapter SDK

## Core concepts

| Term | Meaning |
|------|---------|
| **Lens** | A structured, versioned task specification |
| **Workflow** | A DAG of connected lenses with typed inputs and outputs |
| **Lenser** | The profile that owns or operates lenses and workflows |
| **Agent** | A preview/managed AI integration record tied to a lenser profile |
| **Ray** | The output artifact produced by a run |

## The OSS beta loop

1. Install the repo locally.
2. Start Supabase and the web app.
3. Create a lens.
4. Build a workflow from one or more lenses.
5. Execute the workflow through a supported path.
6. Review the result, retry if needed, and iterate.

## Supported scope today

- local Community Edition setup
- workflow creation and execution in the web app
- `lf run exec` for direct model execution
- workflow docs, schemas, and provider integrations

## Deferred or private scope

- public battles and battle-linked CTAs
- benchmark and leaderboard launch positioning
- private workspaces and enterprise tooling
- autonomous evaluation automation through `lf run submit|vote|full|replay`

## Next steps

- [Installation](/tutorials/getting-started/installation)
- [Quickstart](/tutorials/getting-started/quickstart)
- [What are Workflows?](/tutorials/walkthroughs/what-are-workflows)
- [How to Contribute](/how-to/contributors/how-to-contribute)
- [Open Core Model](/explanation/community/open-core-model)
