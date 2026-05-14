---
title: EVALUATION.md — Portable Eval Suite
description: Portable evaluation suite with rubric, dataset, metrics, and judging.
---

# `EVALUATION.md` — Portable eval suite

An **EVALUATION** declares a reusable quality benchmark: a dataset of cases, a rubric, metrics with pass thresholds, and a judging policy (rubric scoring, judge lenser, or human review). Used by battles and by CI gates.

## Filename

- Canonical: `EVALUATION.md`
- Container: `evals/<slug>/EVALUATION.md` (or `eval/`)

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `evaluation` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id (referenced by lenses via `evaluation_refs[]`) |
| `name` | string | Display name |

Common keys: `rubric_ref`, `dataset_ref`, `metrics[]`, `thresholds`, `judges`.

## Required sections

- `# Purpose`
- `# Dataset`
- `# Metrics`
- `# Judging`

## CLI

```bash
lenserfight evaluate ./EVALUATION.md
```

## Canonical template

```yaml
---
kind: evaluation
schema_version: 1
id: evaluation_<uuid>
slug: research-quality-eval
name: Research Quality Evaluation
owner: { workspace_id: ws_<uuid> }
visibility: workspace
status: draft
version: 0.1.0
rubric_ref: rubric_research_quality
dataset_ref: dataset_research_cases_v1
metrics: [completeness, citation_quality]
---

# Purpose
What quality signal this evaluation is responsible for.

# Dataset
Describe the cases, fixtures, or benchmark dataset.

# Metrics
Define the metrics, thresholds, and pass conditions.

# Judging
Describe rubric scoring, judge agent use, and human overrides.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `BATTLE.MD`](./battle-md)
- [Portable `PRIVATE_BATTLE.md`](./private-battle-md)
- [Portable `RUN_REPORT.md`](./run-report-md)
