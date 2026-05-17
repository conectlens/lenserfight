---
name: github-issue-solver
title: GitHub Issue Solver Colens
description: End-to-end issue resolution workflow — triage, root-cause analysis, GRASP-compliant fix design, test planning, and PR drafting in one pipeline.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: triage
    lens: github-issue-triage
    note: Classify the issue and determine priority before investing in a fix.
  - id: analyze
    lens: github-issue-solver
    inputs_from: triage
    note: Identify root cause, design GRASP-compliant fix, and produce implementation plan.
  - id: tests
    lens: unit-test-generator
    inputs_from: analyze
    note: Generate test cases that cover the root cause scenario and regression surface.
  - id: review
    lens: code-reviewer
    inputs_from: analyze
    note: Review the proposed implementation plan for correctness, security, and data risks before coding begins.
  - id: pr
    lens: pr-description-writer
    inputs_from: review
    note: Draft a complete PR description from the reviewed plan.
outputs:
  kind: text
rays: [developer, github, colens, productivity]
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
