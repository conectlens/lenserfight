---
title: How to Contribute
description: How to contribute docs, workflow improvements, installability fixes, and scoped integration work to LenserFight Community Edition.
---

# How to Contribute

LenserFight Community Edition is currently optimized for contributions that improve installability, workflow reliability, docs, and the existing provider and UI surface.

## High-value contribution areas

| Type | What it is | Where it usually lives |
|------|------------|------------------------|
| **Workflow reliability** | Fixes to workflow execution, retries, validation, or run UX | `libs/infra/execution/`, `libs/features/workflows/` |
| **Lenses and workflow UX** | Improvements to creation, editing, forking, and viewing | `libs/features/lenses/`, `libs/features/workflows/` |
| **Docs** | Setup, workflow, CLI, or contributor documentation fixes | `docs/` |
| **Installability** | Local setup, Supabase reset, scripts, and onboarding fixes | root scripts, `supabase/`, `docs/` |
| **Provider integrations** | Improvements to already-supported provider paths | `libs/providers/`, `libs/infra/execution/` |
| **Scoped connector proposals** | RFCs or narrowly reviewed previews for future connector work | issue first, then agreed location |

## Important scope note

This repo does **not** currently expose a stable public adapter SDK or a guaranteed `libs/adapters/*` extension contract.

If you want to contribute generalized connector or adapter work:

1. open an issue first
2. describe the use case and proposed contract
3. wait for agreement on placement and scope before implementation

## Before you start

1. Check the issue tracker for related work.
2. For anything larger than a small fix, open an issue first.
3. Prefer small, reviewable pull requests over broad speculative refactors.

## Contribution workflow

1. Fork the repository.
2. Create a branch from `development`.
3. Make focused changes.
4. Run the smallest relevant validation for the area you changed.
5. Open a pull request targeting `development`.

## Validation expectations

Examples of small, relevant validation:

- docs-only change: `pnpm nx run docs:build`
- workflow engine change: targeted test or lint command for the touched project
- web UI change: the smallest relevant web check plus a manual smoke note

## Code and docs expectations

- keep public claims truthful to the current repo state
- avoid introducing new product promises in docs without implementation backing them
- keep public API surface small and explicit
- prefer incremental improvements to installability and workflow reliability

## Related docs

- [Contributing](/en/how-to/contributors/contributing)
- [Development Setup](/en/how-to/contributors/development-setup)
- [Support](/en/how-to/contributors/support)
