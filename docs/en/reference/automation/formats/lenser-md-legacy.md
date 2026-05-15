---
title: LENSER.MD (legacy) — Portable Agent Definition
description: Legacy compatibility alias for a portable agent definition.
---

# `LENSER.MD` — Legacy compatibility alias for a portable agent definition

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


In the legacy portable model, `LENSER.MD` is the canonical filename for a full **agent** definition: metadata, instructions, permissions, model/tool policy, memory policy reference. It exists for compatibility with tools that emit the older `kind: agent` schema; discovery accepts it as an alias.

## Filename

- Canonical: `LENSER.MD`
- Legacy aliases on disk: `AGENT.MD`, `AGENT.md` → migrated by `lenserfight migrate-terminology`
- Container: `lensers/<slug>/LENSER.MD` (legacy: `agents/<slug>/AGENT.md`)

## Required frontmatter

Legacy strict form uses the `agent` kind:

| Key | Type | Notes |
|---|---|---|
| `kind` | `agent` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Required by `REQUIRED_FRONTMATTER_KEYS[agent]` |

Common keys include `role`, `capabilities[]`, `model_policy`, `tool_policy`, `memory_policy_ref`, `workspace_permissions`, `allowed_actions`, plus owner / visibility / version / status.

## Required sections

- `# Purpose`
- `# Instructions`
- `# Execution Policy`

## Validation rules

- Frontmatter must include `kind: agent`, `schema_version`, `id`, `name`.
- All three sections must exist.
- Disclosure / disclaimer checks apply as for native LENSERs.

## Canonical template

```yaml
---
kind: agent
schema_version: 1
id: agent_<uuid>
slug: research-analyst
name: Research Analyst
description: Investigates topics, synthesizes findings, and drafts reports.
owner:
  workspace_id: ws_<uuid>
  created_by: user_<uuid>
visibility: private
version: 0.1.0
status: draft
role: researcher
capabilities: [workspace_exploration, competitor_research]
model_policy:
  mode: dynamic
  preferred_models: [openai:gpt-5]
tool_policy:
  allow: [web.search]
memory_policy_ref: memory_policy_workspace_default
workspace_permissions:
  read_scopes: [lenses/*]
allowed_actions: [read, suggest, draft]
---

# Purpose
…

# Instructions
…

# Execution Policy
…
```

## Migrating to native

Run `lenserfight migrate-terminology` to:

- Rename `AGENT.md` / `AGENT.MD` → `LENSER.MD`
- Rename `agents/` → `lensers/`

Then optionally convert to compact native frontmatter (just `name` + `description`).

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `LENSER.MD`](./lenser-md-native)
