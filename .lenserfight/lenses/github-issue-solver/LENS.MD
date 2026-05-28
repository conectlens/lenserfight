---
name: github-issue-solver
title: GitHub Issue Solver
description: Solve a GitHub issue end-to-end — triage, root cause, GRASP-compliant design, implementation plan, test plan, PR description, and merge workflow.
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
    example: "Relevant file: apps/web/src/components/PageHeader.tsx. Uses flex layout with no truncation."
  - label: constraints
    tool: textarea
    required: false
    example: "Cannot change PageHeader API. Must work on iOS Safari."
outputs:
  kind: text
rays: [developer, github, productivity]
---

# GitHub Issue Solver

Solve `[[issue]]`. Use `[[codebase_context]]` when provided. Respect `[[constraints]]` when provided.

**Never guess architecture. Never close an issue before the PR is merged.**

---

## Step 1 — Classify

State the issue type in one word: bug / feature / security / performance / docs / DX / database / workflow / CLI / mobile / web.

## Step 2 — Root Cause

Identify the root cause in one paragraph. Trace the symptom to its origin — the module, invariant, or validation that is broken or missing. Do not describe symptoms; describe causes.

State root cause explicitly before designing a solution.

## Step 3 — GRASP / OOAD Design Check

Before proposing code, answer:

- Which module is the Information Expert (has the data needed to fix this)?
- Does the fix keep business logic server-side?
- Does the fix introduce cross-layer coupling?
- Is there a single source of truth for the business rule being fixed?

State any violation and how the fix avoids it.

## Step 4 — Implementation Plan

File-by-file plan:

| File | Change | Why |
|------|--------|-----|
| `path/to/file.ts` | what to change | why this file owns the fix |

Include migration file if schema changes. Include RLS note if policies change.

## Step 5 — Test Plan

| Layer | Test description | Command |
|-------|-----------------|---------|
| unit | what behavior to assert | `pnpm nx test <project> --testPathPattern=<spec>` |
| integration | if crossing boundaries | `pnpm nx test <lib>` |
| database | if schema/RLS touched | `pnpm supabase test db` |

## Step 6 — Branch & Implementation

```bash
git checkout development && git pull origin development
git checkout -b fix/issue-<number>-<short-slug>
```

Rules:
- Edit only files required to resolve the root cause.
- No opportunistic refactors.
- If schema changes are needed, create a migration in `supabase/migrations/`.
- If RLS changes are needed, invoke the RLS security reviewer first.

## Step 7 — Commit

```bash
git add <specific-files>
git commit -m "fix(scope): concise imperative description

Root cause: <one sentence>

Closes #<issue-number>"
```

Never use `--no-verify`. Never commit `.env` or secrets.

## Step 8 — PR Description

```markdown
## Issue
Closes #<number>

## Root Cause
<one paragraph>

## Solution
<one paragraph>

## Files Changed
- `path/to/file` — what changed and why

## Tests
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Lint passes

## Migration Notes
<!-- if schema changed -->

## Security Notes
<!-- if auth/RLS changed -->

## Remaining Risks
<!-- anything not fully addressed -->
```

## Step 9 — Merge

Only after CI passes, no unresolved conflicts, no unsafe migrations, and no security regressions:

```bash
gh pr merge <pr-number> --merge --delete-branch
git checkout development && git pull origin development
```

## Step 10 — Close Issue

Only after merge is confirmed:

```bash
gh issue close <number> --comment "Fixed in PR #<pr-number> (merged into development)."
```

---

## Constraints

- Do not propose frontend-only enforcement for business rules.
- Do not propose unrelated refactors.
- Do not propose hardcoded temporary fixes.
- Do not weaken or bypass RLS policies.
- Never close an issue before the PR merges.
- Flag if the root cause cannot be determined from provided context.
