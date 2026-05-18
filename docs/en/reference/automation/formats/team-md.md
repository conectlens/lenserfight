---
title: TEAM.MD — Native LENSER Team
description: Canonical file format for a ConectLens LENSER team.
---

# `TEAM.MD` — Native LENSER team definition

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


A **TEAM** groups multiple LENSERs around a shared outcome with explicit roles, collaboration rules, and a delegation/escalation policy. `TEAM.MD` is its native form.

## Filename

- Canonical: `TEAM.MD`
- Container: `teams/<slug>/TEAM.MD`

## Required frontmatter

Compact native form:

| Key | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | What the team owns |

## Required sections (legacy strict mode)

When `kind:` and `schema_version:` are present:

- `# Team Purpose`
- `# LENSERS`
- `# Collaboration Rules`

## Validation rules

- Frontmatter present, valid YAML, contains `name` and `description`.
- Disclosure references (`references[]`, `scripts[]`, `assets[]`, `evals[]`) must live under their respective subfolders and resolve to existing files.
- Legal/finance disclaimer markers enforced when applicable.

## Canonical template

```yaml
---
name: implementation-team
description: Use when a group of LENSERS coordinates on a shared outcome.
---

# Team Purpose
Describe what this team owns.

# LENSERS
List members, roles, and responsibility boundaries.

# Collaboration Rules
Define delegation, review, conflict resolution, and escalation rules.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Portable `AGENT_TEAM.md`](./agent-team-md)
- [Native `LENSER.MD`](./lenser-md-native)
