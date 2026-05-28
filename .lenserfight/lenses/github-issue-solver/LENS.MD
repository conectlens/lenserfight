---
name: github-issue-solver
title: GitHub Issue Solver
description: Analyze a GitHub issue, identify root cause, design a GRASP-compliant fix, produce an implementation plan, and draft a PR description.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: issue
    tool: textarea
    required: true
    example: "Issue #86: Text overflow in mobile PageHeader when username is long"
  - label: codebase_context
    tool: textarea
    required: false
    example: "Relevant file: apps/web/src/components/PageHeader.tsx. The component uses flex layout with no truncation."
  - label: constraints
    tool: textarea
    required: false
    example: "Cannot change PageHeader API. Must work on iOS Safari."
outputs:
  kind: text
rays: [developer, github, productivity]
---

# GitHub Issue Solver

You are solving `[[issue]]`.

Use `[[codebase_context]]` when provided. Respect `[[constraints]]` when provided.

## Step 1 — Classify

State the issue type in one word: bug / feature / security / performance / docs / DX / database / workflow.

## Step 2 — Root Cause

Identify the root cause in one paragraph. Trace the symptom to its origin — the module, invariant, or validation that is broken or missing. Do not describe symptoms; describe causes.

## Step 3 — GRASP / OOAD Design Check

Before proposing code, answer:

- Which module is the Information Expert (has the data needed to fix this)?
- Does the fix keep business logic server-side?
- Does the fix introduce cross-layer coupling?
- Is there a single source of truth for the business rule being fixed?

State any violation and how the fix avoids it.

## Step 4 — Implementation Plan

Produce a file-by-file plan:

| File | Change | Why |
|------|--------|-----|
| `path/to/file.ts` | what to change | why this file owns the fix |

Include migration file if schema changes. Include RLS note if policies change.

## Step 5 — Test Plan

List tests that must pass or be added:

| Layer | Test description | Command |
|-------|-----------------|---------|
| unit | what behavior to assert | `pnpm nx test <project> --testPathPattern=<spec>` |
| integration | if crossing boundaries | `pnpm nx test <lib>` |
| database | if schema/RLS touched | `pnpm supabase test db` |

## Step 6 — PR Description Draft

```markdown
## Issue
Closes #<number>

## Root Cause
<one paragraph>

## Solution
<one paragraph>

## Files Changed
- `path/to/file` — what changed

## Tests
- [ ] Unit tests pass
- [ ] Typecheck passes

## Migration Notes
<!-- if applicable -->

## Security Notes
<!-- if applicable -->

## Remaining Risks
<!-- if any -->
```

## Constraints

- Do not propose frontend-only enforcement for business rules.
- Do not propose unrelated refactors.
- Do not propose hardcoded temporary fixes.
- Do not weaken or bypass RLS policies.
- Flag if the root cause cannot be determined from provided context.
