---
name: github-issue-solver
description: End-to-end issue resolution workflow — triage, root-cause analysis, GRASP-compliant fix design, test planning, and PR drafting in one pipeline.
---

# GitHub Issue Solver Colens

A 5-node developer colens that takes a raw GitHub issue and produces:

1. **Triage** — issue type, priority, labels, and next action
2. **Analysis** — root cause, GRASP design check, file-by-file implementation plan
3. **Tests** — unit and integration test cases for the fix surface
4. **Review** — correctness, security, and data risk review of the plan
5. **PR** — complete, ready-to-paste PR description

## Suggested Usage

Paste the issue title, body, and relevant comments into the `issue` input of the first node. Add code context if you already know which files are affected.

The colens produces a reviewed implementation plan + test plan + PR description that a developer can execute directly — no back-and-forth required.

## Forkability

This colens is intentionally forkable. Common adaptations:

- Drop the `tests` node for doc-only issues.
- Replace `github-issue-solver` with a language-specific solver fork for non-TypeScript repos.
- Add a `validate-output` node after `pr` to enforce a house PR template.
- Add a `lenser: issue-solver` node between `analyze` and `review` for autonomous execution.

## Engineering Rules Enforced

- Root cause must be identified before implementation is planned.
- Business rules must be enforced server-side, not frontend-only.
- No unrelated refactors bundled with the fix.
- No hardcoded temporary fixes.
- RLS and migration risks flagged explicitly.
- Issue is never closed before the PR merges.
