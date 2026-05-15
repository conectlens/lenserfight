---
title: ConectLens Agent Skills Ruleset
description: Native LENS, LENSER, COLENS, BATTLE, and team package rules for file-first LenserFight automation.
---

# ConectLens Agent Skills Ruleset

ConectLens adapts Agent Skills conventions into LenserFight terminology without replacing the existing automation layer.

## Current State

- File-first automation already exists through markdown objects and `lf validate`.
- Native ConectLens primary files are now discovered by filename: `LENS.MD`, `LENSER.MD`, `COLENS.MD`, `BATTLE.MD`, and `TEAM.MD`.
- Compatibility files remain valid: `SKILL.MD`, `AGENT.MD`, `AGENT_TEAM.md`, `WORKFLOW.MD`, and `PRIVATE_BATTLE.md`.
- Parameter placeholders use `[[name]]`; stored database templates may use `[[:uuid]]`.
- Lens parameter declarations mirror `lenses.version_parameters`: each declaration needs `label` and `tool_id`.
- Local battle runtime state is private runtime data and is written outside the project by default.

## Terminology

| Agent Skills term | ConectLens term | Native file |
|---|---|---|
| Skill | LENS | `LENS.MD` |
| Agent | LENSER | `LENSER.MD` |
| Workflow | COLENS | `COLENS.MD` |
| Orchestration / comparison | BATTLE | `BATTLE.MD` |
| Skill team | Team | `TEAM.MD` |
| references | references | `references/` |
| scripts | scripts | `scripts/` |
| assets | assets | `assets/` |
| evals | evals | `evals/` |

`SKILL.MD` can be used as a compatibility wrapper, but `LENS.MD` is the native source of truth.

## Package Layout

Use folder-based units:

```txt
.lenserfight/
  lenses/example-lens/LENS.MD
  lensers/example-lenser/LENSER.MD
  colenses/example-colens/COLENS.MD
  battles/example-battle/BATTLE.MD
  teams/example-team/TEAM.MD
```

Optional supporting material belongs next to the primary file:

```txt
references/   long reference material
scripts/      non-interactive reusable scripts
assets/       templates and static files
evals/        fixtures, rubrics, and behavior checks
```

Frontmatter references to these files must be relative to the package root and stay inside the expected folder. For example, a script reference must point to `scripts/...`.

## LENS Rules

A basic `LENS.MD` can stay simple:

```md
---
name: repo-architect
description: Use when repository structure must be discovered before planning changes.
---

# Mission
Inspect the codebase before proposing abstractions.
```

Parameterized lenses must declare every `[[parameter_name]]` placeholder:

```yaml
parameters:
  - label: parameter_name
    tool_id: 11111111-1111-4111-8111-111111111111
```

`tool_id` is a UUID because it mirrors `lenses.version_parameters.tool_id`, which references `lenses.tools(id)`.

## BATTLE Rules

`BATTLE.MD` is an orchestration document, not a generic skill file. It may reference LENS, COLENS, LENSER, teams, models, humans, evals, scoring, comparison settings, and runtime execution details.

A valid battle should declare participants or orchestration references:

```yaml
participants:
  - type: lens
    ref: ../lenses/a/LENS.MD
  - type: lenser
    ref: ../lensers/reviewer/LENSER.MD
```

## Storage Rules

Commit project-safe packages under `.lenserfight/`, such as reusable `LENS.MD` files and their public `references/`, `scripts/`, `assets/`, and `evals/`.

Keep private runtime data outside the project:

- local battle state
- tokens and auth state
- provider keys and BYOK material
- execution traces containing private prompts or outputs
- private logs

The CLI writes new local battle state to user runtime storage. Existing `.lenserfight/local-battles/*.json` files are read for compatibility and migrated on access when possible.

## Migration Notes

- Move reusable local prompt packages into folder units with native primary files.
- Rename `agents/` to `lensers/`, `workflows/` to `colenses/`, `AGENT.MD` to `LENSER.MD`, and `WORKFLOW.MD` to `COLENS.MD`.
- Compatibility aliases remain readable, but canonical files win mixed-state conflicts and new files must use `lensers/`, `colenses/`, `LENSER.MD`, and `COLENS.MD`.
- Use `lf migrate-terminology` for a dry-run plan or `lf migrate-terminology --apply` to rename safely. The bash helper `scripts/migrate-lenserfight-terminology.sh` supports the same migration for project, nested, and user-global `.lenserfight` directories.
- Keep legacy `SKILL.MD`, `LENSER.MD`, `COLENS.MD`, and `PRIVATE_BATTLE.md` files only while consumers are migrating.
- Do not add secrets to markdown frontmatter, YAML templates, scripts, or examples.
- Add `parameters` only when the body uses `[[...]]` placeholders.
- Move project-root local battle JSON files out of Git history and into user runtime storage.

## Validation

Use the CLI validator:

```bash
lf validate .lenserfight
```

Validation checks primary-file discovery, frontmatter parsing, parameter declarations, unit-root reference paths, script paths, eval paths, and BATTLE participant shape.
