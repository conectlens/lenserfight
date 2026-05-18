---
title: Evaluation Cases drawer
description: CRUD over the case list inside one evaluation suite.
---

# Evaluation Cases drawer

Opened from the [Evaluation drawer](./evaluation).

## What's a case?

A **case** is one input + one assertion. The suite passes overall when every case passes.

## Fields per case

| Field | Notes |
|---|---|
| **Input** | JSON payload sent to the agent |
| **Expected** | The assertion — see types below |
| **Type** | `substring` / `regex` / `jsonpath` / `score_gte` |
| **Weight** | Multiplier on the pass/fail score (default 1) |

## Assertion types

| Type | Expected value example |
|---|---|
| `substring` | `"approved"` |
| `regex` | `^OK \\d{3}$` |
| `jsonpath` | `$.status == "ok"` |
| `score_gte` | `0.8` (judge model returns score ≥ 0.8) |

## Bulk import

Paste a JSON array of cases into the **Import** field — the drawer validates each row and reports the first failure with line number.


## Code-backed workflow

Source of truth: EvaluationCasesDrawer.tsx.

1. List, create, and delete evaluation cases for one suite.
2. Cases include input, expected output or assertion data, and scoring metadata.
3. Verify cases exist before running the evaluation suite.

## Related

- [Evaluation drawer](./evaluation)
- [Failed Case drawer](./failed-case)
