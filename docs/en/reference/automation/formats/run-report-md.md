---
title: RUN_REPORT.md — Portable Execution Report
description: Portable execution report capturing summary, inputs, and results of a run.
---

# `RUN_REPORT.md` — Portable execution report

A **RUN_REPORT** captures the outcome of a single execution: of a workflow, a battle, or an evaluation. It is the artifact that `lenserfight workflow run`, `lenserfight battle run`, and `lenserfight evaluate` emit into the user runtime workspace (not `.lenserfight/`).

## Filename

- Canonical: `RUN_REPORT.md`
- Written to: `<lenserfight runtime>/workspaces/<workspace_hash>/reports/<slug>-<timestamp>.md`
- A sibling JSON snapshot is written to `…/runs/<slug>-<timestamp>.json`.

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `run_report` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `status` (`ready`, `blocked`, `failed`), `source_ref`, `started_at`, `finished_at`, `cost`, `latency_ms`.

## Required sections

- `# Summary`
- `# Inputs`
- `# Results`

## Generation

`buildWorkflowSimulationReport` in [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts) generates the canonical report skeleton. It is also written by `lenserfight workflow run`.

## Canonical template

```yaml
---
kind: run_report
schema_version: 1
id: run_report_<uuid>
slug: workflow-run-report
name: Workflow Run Report
owner: { workspace_id: ws_<uuid> }
visibility: workspace
status: active
version: 0.1.0
---

# Summary
Top-line outcome, cost, and latency.

# Inputs
Describe runtime inputs and references.

# Results
Summarize outputs, failures, and next actions.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `COLENS.MD`](./colens-md-native)
- [Native `BATTLE.MD`](./battle-md)
- [Portable `EVALUATION.md`](./evaluation-md)
