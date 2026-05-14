---
title: MEMORY_POLICY.md — Portable Memory Rules
description: Portable memory rules — scope, retention, and promotion semantics.
---

# `MEMORY_POLICY.md` — Portable memory rules

A **MEMORY_POLICY** declares how memory is scoped (per-user, per-team, per-workspace), how long it is retained, what counts as durable vs. transient, and which items may be promoted from short-term to long-term memory.

## Filename

- Canonical: `MEMORY_POLICY.md`
- Container: `memory-policies/<slug>/MEMORY_POLICY.md`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `memory_policy` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `scope.readable[]`, `scope.writable[]`, `retention.short_term_days`, `retention.long_term_days`, `promotion_rules[]`.

## Required sections

- `# Purpose`
- `# What To Store`
- `# What Not To Store`

## Validation rules

- Frontmatter and all three sections must be present.
- `id` must be present and stable; LENSER and AGENT files reference memory policies by `memory_policy_ref: <id>`.

## Canonical template

```yaml
---
kind: memory_policy
schema_version: 1
id: memory_policy_<uuid>
slug: workspace-default-memory
name: Workspace Default Memory
owner: { workspace_id: ws_<uuid> }
visibility: workspace
status: active
version: 0.1.0
scope:
  readable: [workspace]
retention:
  short_term_days: 14
---

# Purpose
What memory supports and for whom.

# What To Store
Durable facts, stable preferences, approved summaries, and reusable artifacts.

# What Not To Store
Sensitive data, noisy transcripts, low-confidence claims, and temporary failures.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Legacy `LENSER.MD`](./lenser-md-legacy) (references memory policies via `memory_policy_ref`)
