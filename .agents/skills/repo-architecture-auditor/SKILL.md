---
name: repo-architecture-auditor
description: Audit Nx monorepo structure, layer responsibilities, dependency drift, public APIs, and misplaced logic. Use for architecture review, library placement, boundary erosion, duplication, and repo health checks.
---

# Repo Architecture Auditor

## Use when
- the repo structure feels unclear, duplicated, or layered incorrectly
- a refactor may move logic across `apps`, `libs`, or `supabase`
- you need an architecture map, hotspot list, or cleanup plan

## Workflow
1. Map the current layer responsibilities and detect boundary drift.
2. Identify duplicated capabilities, leaky abstractions, and oversized libraries.
3. Produce a prioritized action plan with rationale and target locations.

## Load only when needed
- [Architecture review method](references/REFERENCE.md)
- [Audit report template](assets/report-template.md)