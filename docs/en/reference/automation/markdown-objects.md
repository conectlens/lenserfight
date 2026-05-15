---
title: Markdown Object Formats
description: Canonical file-first formats for LenserFight automation objects.
---

# Markdown Object Formats

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


LenserFight's open-core automation layer is file-first.

The canonical portable objects are markdown files with YAML frontmatter plus structured sections.

## Common frontmatter

Native ConectLens units may use the compact Agent Skills-style frontmatter with only `name` and `description`. Legacy strict objects keep the full schema below.

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
| [`LENS.MD`](./formats/lens-md) | Native ConectLens lens/task unit | `name`, `description`; parameterized files also need `parameters[].label` + `tool_id` | frontmatter + parameter + disclosure checks |
| [`LENSER.MD`](./formats/lenser-md-native) | Native ConectLens agent/LENSER definition | `name`, `description` | frontmatter + disclosure checks |
| [`COLENS.MD`](./formats/colens-md-native) | Native ConectLens workflow/COLENS | `name`, `description` | frontmatter + disclosure checks |
| [`BATTLE.MD`](./formats/battle-md) | Native orchestration/comparison document | `name`, `description`, participants or orchestration references | frontmatter + battle reference checks |
| [`TEAM.MD`](./formats/team-md) | Native LENSER team definition | `name`, `description` | frontmatter + disclosure checks |
| [`LENS.md`](./formats/lens-md-legacy) | Legacy portable lens/task unit | `id`, `name`, prompt body, input/output schema | frontmatter + section checks |
| [`LENSER.MD`](./formats/lenser-md-legacy) | Legacy compatibility alias for a portable agent definition | metadata, instructions, permissions | frontmatter + section checks |
| [`AGENT_TEAM.md`](./formats/agent-team-md) | Portable team definition | members, purpose, collaboration rules | frontmatter + section checks |
| [`TOOL.md`](./formats/tool-md) | Portable tool contract | input/output schema, auth, risk | frontmatter + section checks |
| [`COLENS.MD`](./formats/colens-md-legacy) | Legacy compatibility alias for a portable workflow | triggers, inputs, steps, outputs | frontmatter + section checks |
| [`PRIVATE_BATTLE.md`](./formats/private-battle-md) | Portable comparison spec | participants, evaluation, report | frontmatter + section checks |
| [`SKILL.md`](./formats/skill-md) | Portable reusable capability | purpose, when to use, workflow | frontmatter + section checks |
| [`MEMORY_POLICY.md`](./formats/memory-policy-md) | Portable memory rules | scope, retention, promotion | frontmatter + section checks |
| [`EVALUATION.md`](./formats/evaluation-md) | Portable eval suite | rubric, dataset, metrics, judging | frontmatter + section checks |
| [`RUN_REPORT.md`](./formats/run-report-md) | Portable execution report | summary, inputs, results | frontmatter + section checks |

## CLI support

The current CLI foundation supports:

```bash
lenserfight validate ./automation
lenserfight import ./automation
lenserfight export lens --template --out .lenserfight/lenses/example/LENS.MD
lenserfight export lenser --template --out .lenserfight/lensers/example/LENSER.MD
lenserfight export colens --template --out .lenserfight/colenses/example/COLENS.MD
lenserfight export battle --template --out .lenserfight/battles/example/BATTLE.MD
lenserfight migrate-terminology
lenserfight migrate-terminology --apply
lenserfight workflow run .lenserfight/colenses/example/COLENS.MD
lenserfight tool test ./TOOL.md
lenserfight evaluate ./EVALUATION.md
lenserfight battle run ./PRIVATE_BATTLE.md
```

## Import/export behavior

- local mode treats markdown files as canonical
- `lenserfight import` indexes validated files into a local registry
- `lenserfight export <kind> <id>` re-emits an imported object
- `lenserfight export <kind> --template` writes a canonical starter template
- legacy `agent` and `workflow` template requests write canonical `LENSER.MD` and `COLENS.MD` unless `--legacy` is passed

## Design rules

- stable ids are preserved across import/export
- hosted sync should project from files, not replace them
- validation should fail fast on missing frontmatter or required sections
- files should remain readable and reviewable in Git
- native ConectLens units use folder-based progressive disclosure with `references/`, `scripts/`, `assets/`, and `evals/`
- private runtime state belongs in user runtime storage, not project-root `.lenserfight/`

## Related

- [ConectLens Agent Skills Ruleset](/en/reference/automation/ConectLens-agent-skills)
- [Automation Workspace Overview](/en/explanation/automation/index)
- [Agent Exploration API](/en/reference/automation/agent-exploration-api)
- [CLI Hub](/en/reference/cli/index)
