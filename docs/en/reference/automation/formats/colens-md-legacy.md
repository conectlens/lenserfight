---
title: COLENS.MD (legacy) — Portable Workflow
description: Legacy compatibility alias for a portable workflow with triggers, inputs, steps, and outputs.
---

# `COLENS.MD` — Legacy compatibility alias for a portable workflow

The legacy portable form of a workflow. Uses `kind: workflow` semantics with strict frontmatter and four required sections. Discovery also accepts the legacy `WORKFLOW.md` filename.

## Filename

- Canonical: `COLENS.MD`
- Legacy alias on disk: `WORKFLOW.MD`, `WORKFLOW.md` → migrated by `lenserfight migrate-terminology`
- Container: `colenses/<slug>/COLENS.MD` (legacy: `workflows/<slug>/WORKFLOW.md`)

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `workflow` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `workflow_type` (`manual`, `scheduled`, `triggered`), `triggers[]`, `steps[]`, plus owner/visibility/version/status.

## Required sections

- `# Purpose`
- `# Inputs`
- `# Steps`
- `# Outputs`

## Cross-reference validation

Every `steps[i].lens` resolves to a discovered lens; every `steps[i].lenser` / `lenser_ref` / `agent` / `agent_ref` resolves to a discovered lenser. Unknown references are reported as errors.

## Canonical template

```yaml
---
kind: workflow
schema_version: 1
id: wf_<uuid>
slug: competitor-research-report
name: Competitor Research Report
description: Research competitors, validate findings, and generate a report.
owner: { workspace_id: ws_<uuid> }
visibility: private
version: 0.1.0
status: draft
workflow_type: scheduled
triggers:
  - type: schedule
steps:
  - id: plan
    type: agent_task
    lenser_ref: lenser_research_lead
---

# Purpose
What the workflow automates and expected business outcome.

# Inputs
Input contract, defaults, and validation.

# Steps
Ordered steps, branches, tool and lenser bindings, and failure behavior.

# Outputs
Primary outputs, artifacts, and storage destinations.
```

## Migrating to native

Run `lenserfight migrate-terminology` to:

- Rename `WORKFLOW.md` / `WORKFLOW.MD` → `COLENS.MD`
- Rename `workflows/` → `colenses/`

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `COLENS.MD`](./colens-md-native)
- [Trigger Rule Schema](../trigger-rule-schema)
