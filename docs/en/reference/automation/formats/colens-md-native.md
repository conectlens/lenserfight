---
title: COLENS.MD (native) — ConectLens Workflow
description: Canonical file format for a ConectLens COLENS (multi-step workflow).
---

# `COLENS.MD` — Native ConectLens workflow/COLENS

A **COLENS** is a ConectLens workflow: a coordinated, multi-step sequence of LENS and LENSER invocations. `COLENS.MD` is its native, file-first form, validated by `lenserfight validate` and run by `lenserfight workflow run`.

## Filename

- Canonical: `COLENS.MD`
- Container: `colenses/<slug>/COLENS.MD`
- Legacy alias recognised by discovery: `WORKFLOW.MD`
- `lenserfight migrate-terminology` renames `WORKFLOW.md` → `COLENS.MD` and `workflows/` → `colenses/`.

## Required frontmatter

Compact native form:

| Key | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | One-line activation hint |

## Required sections (legacy strict mode)

When `kind:` and `schema_version:` are present, the body must contain:

- `# Purpose`
- `# Inputs`
- `# Steps`
- `# Outputs`

Compact native COLENSes skip section checks.

## Cross-reference validation

When frontmatter declares `nodes[]` or `steps[]`, each step's `lens:` or `lenser:` reference is resolved against discovered objects in the workspace. Unknown references fail validation with `colens.step[i].lens` or `colens.step[i].lenser` errors. See `validateWorkspaceReferences` in [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts).

## Canonical template

```bash
lenserfight export colens --template --out .lenserfight/colenses/example/COLENS.MD
```

```yaml
---
name: review-to-fix-colens
description: Use when coordinating multiple LENS or LENSER steps into one repeatable workflow.
---

# Purpose
Describe the workflow outcome.

# Inputs
List required inputs, defaults, and validation expectations.

# Steps
1. Resolve the source material.
2. Run the referenced LENS or LENSER steps.
3. Produce the final artifact and validation report.

# Outputs
Describe the final artifact, side effects, and acceptance criteria.
```

## Running locally

```bash
lenserfight workflow run .lenserfight/colenses/example/COLENS.MD
```

The runner produces a `RUN_REPORT.md` under the user runtime workspace (not `.lenserfight/`).

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Legacy `COLENS.MD` (portable workflow)](./colens-md-legacy)
- [Native `LENSER.MD`](./lenser-md-native)
- [Native `BATTLE.MD`](./battle-md)
