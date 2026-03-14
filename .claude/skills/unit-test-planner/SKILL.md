---
name: unit-test-planner
description: Plan test coverage by layer, risk, and behavior. Use when adding features, fixing regressions, or deciding what to test in domain, data, UI, and integration layers.
---

# Unit Test Planner

## Use when
- test scope is unclear
- a bug fix needs regression coverage
- new behavior spans more than one layer

## Workflow
1. Identify behaviors worth protecting.
2. Assign them to the cheapest useful test layer.
3. Output a minimal test plan with priority and rationale.

## Load only when needed
- [Layered test strategy](references/REFERENCE.md)
- [Test plan template](assets/test-plan-template.md)