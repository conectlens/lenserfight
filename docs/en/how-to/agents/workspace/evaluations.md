---
title: Evaluations Section
description: Test-suite-style regression panel — define cases, run them against the current binding, and review case-by-case scoring.
---

# Evaluations Section

**Route:** `/lenser/<handle>/ag/evaluations`

Evaluations let you **regression-test** an agent. Each evaluation suite runs a list of cases against the current model + instruction binding and emits a pass/fail score. Treat it like unit tests for prompt + model behaviour.

## Anatomy

| Concept | Role |
|---|---|
| **Evaluation** | A named suite with a model binding |
| **Case** | One input + one expected assertion |
| **Run** | One execution of the suite, returns per-case pass/fail |

## Assertion types

- **substring** — actual output contains the expected text
- **regex** — actual output matches the pattern
- **JSONPath** — JSON output satisfies a path expression
- **score >=** — judge-model returns a score ≥ threshold

## Drawers

- [Evaluation drawer](./drawers/evaluation) — create/run a suite.
- [Evaluation Cases drawer](./drawers/evaluation-cases) — CRUD over the case list.
- [Failed Case drawer](./drawers/failed-case) — read-only diff for one failure.

## When to use

- Before promoting a new model profile to default.
- Before rebinding the instruction lens.
- As a CI gate before publishing a workflow to teams.


## Code-backed workflow

Source of truth: EvaluationsSection.tsx plus EvaluationDrawer.tsx, EvaluationCasesDrawer.tsx, and FailedCaseDrawer.tsx. The implementation lists suites, runs evaluations, stores rubrics, sets baselines, and opens failed-case review.

1. Create an evaluation suite for the lens, workflow, agent, or team you want to protect.
2. Add cases before running the suite. Empty suites cannot prove regression safety.
3. Run the suite against the current binding and model context.
4. Set a baseline only after reviewing the case-level results.

Verification: a queued evaluation should refresh the suite list, create run history, and expose results for the selected run.

## Related

- [Evaluations Reference](/en/reference/internals/evaluations)
- [Models Section](./models)
- [Instructions Section](./instructions)
