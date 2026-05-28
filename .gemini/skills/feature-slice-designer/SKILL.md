---
name: feature-slice-designer
description: Decide where new behavior belongs across apps, features, domain, data, api, ui, infra, and utils. Use before implementing a feature, refactor, or cross-layer change in the LenserFight monorepo.
---

# Feature Slice Designer

## Use when
- a new feature spans multiple layers
- the correct target library is unclear
- scope must be decomposed before implementation

## Workflow
1. Translate the request into domain, data, UI, and integration responsibilities.
2. Assign each responsibility to the correct library or create a justified new boundary.
3. Return a file-level implementation plan, public APIs, and constraints.

## Load only when needed
- [Placement rules](references/REFERENCE.md)
- [Feature plan template](assets/feature-plan-template.md)