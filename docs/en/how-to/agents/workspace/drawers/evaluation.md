---
title: Evaluation drawer
description: Create or run an evaluation suite against the current binding state.
---

# Evaluation drawer

Opened from the [Evaluations Section](../evaluations.md).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Name** | yes | Unique within the agent |
| **Description** | no | Free-text rationale |
| **Model profile** | yes | Binding the suite runs against — defaults to agent default |
| **Cases** | yes (≥1) | Managed via [Evaluation Cases drawer](./evaluation-cases.md) |
| **Schedule (cron)** | no | When set, suite auto-runs on this cron expression |

## Lifecycle

1. **Create** — empty suite, no cases.
2. **Add cases** — open the cases drawer.
3. **Run** — dispatches the suite, returns a `run_id`.
4. **Review** — passes/fails per case; click a failure to open the [Failed Case drawer](./failed-case.md).

## When to schedule

- Nightly regression on a critical workflow.
- Pre-deploy gate triggered by webhook.
- Weekly cohort audit across agents.


## Code-backed workflow

Source of truth: EvaluationDrawer.tsx.

1. Create or edit the evaluation suite and its target object.
2. The drawer parses case JSON defensively before save.
3. Verify the suite appears in Evaluations, then add cases and run it.

## Related

- [Evaluations Section](../evaluations.md)
- [Evaluation Cases drawer](./evaluation-cases.md)
- [Failed Case drawer](./failed-case.md)
- [Evaluations Reference](/en/reference/internals/evaluations)
