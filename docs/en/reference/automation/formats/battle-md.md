---
title: SKILL.md — Native Comparison Document
description: Canonical file format for a ConectLens BATTLE (orchestration / comparison spec).
---

# `SKILL.md` — Native orchestration/comparison document

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


A **BATTLE** declares a comparison between two or more participants — lenses, lensers, colenses, teams, models, prompts, or humans — under a shared evaluation. `SKILL.md` is its native form, validated by `lenserfight validate` and run by `lenserfight battle run`.

## Filename

- Canonical: `SKILL.md`
- Container: `battles/<slug>/SKILL.md`

## Required frontmatter

Compact native form:

| Key | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Short comparison goal |
| `participants[]` *or* one of `lenses`, `colenses`, `lensers`, `teams`, `evals`, `scoring`, `comparison` | array | At least one orchestration reference is expected (warning if missing) |

Each `participants[i]` is an object with required string fields `type` and `ref`. See `validateBattleReferences` in [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts).

## Required sections (legacy strict mode)

When `kind:` and `schema_version:` are present:

- `# Purpose`
- `# Participants`
- `# Evaluation`
- `# Report`

## Battle reference validation

Discovery walks `participants[]` and `contenders[]`, normalising legacy `agent` → `lenser`, `workflow` → `colens`, `eval` → `evaluation`. Each reference (other than `ai_model`, `model`, `human`, `prompt`) must point to a discovered object in the workspace; otherwise validation errors with `battle.participants`.

## Canonical template

```bash
lenserfight export battle --template --out .lenserfight/battles/example/SKILL.md
```

```yaml
---
name: implementation-battle
description: Use when comparing LENS, COLENS, LENSER, team, model, or human outputs against shared evals.
participants:
  - type: lens
    ref: ../lenses/example-lens/SKILL.md
---

# Purpose
State the comparison goal and decision this BATTLE should support.

# Participants
List LENS, COLENS, LENSER, team, model, prompt, or human contenders.

# Evaluation
Define evals, scoring method, judges, and tie handling.

# Report
Define the result format and what evidence must be included.
```

## Running locally

```bash
lenserfight battle run ./SKILL.md
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Portable `PRIVATE_BATTLE.md`](./private-battle-md)
- [Native `SKILL.md`](./lens-md), [`SKILL.md`](./lenser-md-native), [`SKILL.md`](./colens-md-native)
