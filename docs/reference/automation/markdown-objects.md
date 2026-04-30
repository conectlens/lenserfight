---
title: Markdown Object Formats
description: Canonical file-first formats for LenserFight automation objects.
---

# Markdown Object Formats

LenserFight's open-core automation layer is file-first.

The canonical portable objects are markdown files with YAML frontmatter plus structured sections.

## Common frontmatter

```yaml
kind: <object_kind>
schema_version: 1
id: <stable_id>
slug: <slug>
name: <display_name>
owner:
  workspace_id: <id>
visibility: private|workspace|public
status: draft|active|archived
version: <semver>
tags: []
```

## Canonical formats

| Format | Purpose | Required fields | Validation |
|---|---|---|---|
| `LENS.md` | Portable lens/task unit | `id`, `name`, prompt body, input/output schema | frontmatter + section checks |
| `AGENT.md` | Portable agent definition | metadata, instructions, permissions | frontmatter + section checks |
| `AGENT_TEAM.md` | Portable team definition | members, purpose, collaboration rules | frontmatter + section checks |
| `TOOL.md` | Portable tool contract | input/output schema, auth, risk | frontmatter + section checks |
| `WORKFLOW.md` | Portable workflow | triggers, inputs, steps, outputs | frontmatter + section checks |
| `PRIVATE_BATTLE.md` | Portable comparison spec | participants, evaluation, report | frontmatter + section checks |
| `SKILL.md` | Portable reusable capability | purpose, when to use, workflow | frontmatter + section checks |
| `MEMORY_POLICY.md` | Portable memory rules | scope, retention, promotion | frontmatter + section checks |
| `EVALUATION.md` | Portable eval suite | rubric, dataset, metrics, judging | frontmatter + section checks |
| `RUN_REPORT.md` | Portable execution report | summary, inputs, results | frontmatter + section checks |

## CLI support

The current CLI foundation supports:

```bash
lenserfight validate ./automation
lenserfight import ./automation
lenserfight export agent --template --out ./AGENT.md
lenserfight workflow run ./WORKFLOW.md
lenserfight tool test ./TOOL.md
lenserfight evaluate ./EVALUATION.md
lenserfight battle run ./PRIVATE_BATTLE.md
```

## Import/export behavior

- local mode treats markdown files as canonical
- `lenserfight import` indexes validated files into a local registry
- `lenserfight export <kind> <id>` re-emits an imported object
- `lenserfight export <kind> --template` writes a canonical starter template

## Design rules

- stable ids are preserved across import/export
- hosted sync should project from files, not replace them
- validation should fail fast on missing frontmatter or required sections
- files should remain readable and reviewable in Git

## Related

- [Automation Workspace Overview](/explanation/automation/index)
- [Agent Exploration API](/reference/automation/agent-exploration-api)
- [CLI Hub](/reference/cli/index)
