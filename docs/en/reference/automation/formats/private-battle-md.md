---
title: PRIVATE_BATTLE.md — Portable Comparison Spec
description: Portable comparison spec with participants, evaluation, and report contract.
---

# `PRIVATE_BATTLE.md` — Portable comparison spec

The portable form of a battle. Used for **workspace-private** comparisons (`kind: private_battle`), as opposed to publicly published battles or the native `BATTLE.MD`. Run with `lenserfight battle run ./PRIVATE_BATTLE.md`.

## Filename

- Canonical: `PRIVATE_BATTLE.md`
- Container: `battles/<slug>/PRIVATE_BATTLE.md`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `private_battle` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `participants[]` (objects with `type`, `ref`), `evaluation_method`, `judges`, `rubric_ref`.

## Required sections

- `# Purpose`
- `# Participants`
- `# Evaluation`
- `# Report`

## CLI

```bash
lenserfight battle run ./PRIVATE_BATTLE.md
```

## Canonical template

```yaml
---
kind: private_battle
schema_version: 1
id: pb_<uuid>
slug: support-agent-a-b
name: Support Agent A vs B
owner: { workspace_id: ws_<uuid> }
visibility: private
status: draft
version: 0.1.0
participants:
  - type: lenser
    ref: lenser_support_v1
evaluation_method: rubric_plus_judge
---

# Purpose
Comparison goal and decision this battle supports.

# Participants
Lensers, colenses, models, prompts, or humans under test.

# Evaluation
Judge lenser, human review, rubric, thresholds, and tie rules.

# Report
Required sections in the exported report.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `BATTLE.MD`](./battle-md)
- [Portable `EVALUATION.md`](./evaluation-md)
- [Portable `RUN_REPORT.md`](./run-report-md)
