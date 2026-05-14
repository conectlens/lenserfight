---
title: SKILL.md — Portable Reusable Capability
description: Portable, reusable capability with activation rules and a step-by-step workflow.
---

# `SKILL.md` — Portable reusable capability

A **SKILL** is a packaged, reusable method a LENSER can invoke — closer to a runbook than to a single prompt. It declares activation rules (keywords, file patterns, signals), a workflow, and anti-patterns.

## Filename

- Canonical: `SKILL.md`
- Container: `skills/<slug>/SKILL.md`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `skill` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |
| `description` | string | One-line activation hint |

Common keys: `activation.keywords[]`, `activation.files[]`, `inputs[]`, `outputs[]`.

## Required sections

- `# Purpose`
- `# When To Use`
- `# Workflow`

## Validation rules

- Frontmatter and all three sections must be present.
- Disclaimer markers applied for legal/finance tags or keywords.

## Canonical template

```yaml
---
kind: skill
schema_version: 1
id: skill_<uuid>
slug: competitor-research-skill
name: Competitor Research Skill
description: Repeatable method for researching competitors and building structured reports.
owner: { workspace_id: ws_<uuid> }
visibility: workspace
version: 0.1.0
status: active
activation:
  keywords: [competitor research]
---

# Purpose
What the skill helps accomplish.

# When To Use
Activation conditions, preconditions, and anti-patterns.

# Workflow
Step-by-step instructions the lenser should follow.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [ConnectLens Agent Skills Ruleset](../connectlens-agent-skills)
- [Native `LENSER.MD`](./lenser-md-native)
