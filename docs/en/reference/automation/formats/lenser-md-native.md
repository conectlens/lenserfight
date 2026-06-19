---
title: SKILL.md (native) — ConectLens Agent
description: Canonical file format for a ConectLens LENSER (agent definition).
---

# `SKILL.md` — Native ConectLens agent/LENSER definition

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


A **LENSER** is ConectLens's term for an agent: a persistent operator with a mission, activation rules, and operating constraints. `SKILL.md` is its native, file-first form, validated by `lenserfight validate` and exported by `lenserfight export lenser`.

## Filename

- Canonical: `SKILL.md`
- Container: `lensers/<slug>/SKILL.md`
- Legacy aliases recognised by discovery: `AGENT.MD`, `AGENT.md` (see `LEGACY_AUTOMATION_FILE_NAMES` in [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts))
- The `lenserfight migrate-terminology` command renames `AGENT.md` → `SKILL.md` and `agents/` → `lensers/`.

## Required frontmatter

Compact native form requires only:

| Key | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | One-line activation hint |

## Required sections (legacy strict mode)

When `kind:` and `schema_version:` are present, the body must contain:

- `# Mission`
- `# Activation`
- `# Operating Rules`

Compact native LENSERs (only `name` + `description`) skip section checks.

## Validation rules

- Frontmatter present, valid YAML, contains `name` and `description`.
- Progressive disclosure references (`references[]`, `scripts[]`, `assets[]`, `evals[]`) must resolve to existing files under the matching folder.
- Scripts marked `interactive: true` emit a warning — LENSER scripts must be non-interactive.
- Legal/finance disclaimer markers enforced when those tags or keywords appear.

## Canonical template

```bash
lenserfight export lenser --template --out .lenserfight/lensers/example/SKILL.md
```

```yaml
---
name: repository-lenser
description: Use when a LENSER should inspect a repository, follow local rules, and return implementation-ready guidance.
---

# Mission
Describe what this LENSER owns and when it should activate.

# Activation
Name the signals, files, or user requests that should trigger this LENSER.

# Operating Rules
Define boundaries, safety checks, scripts, references, and handoff expectations.
```

## Progressive disclosure layout

```
lensers/<slug>/
  SKILL.md
  references/        # markdown notes the LENSER reads on demand
  scripts/           # non-interactive helper scripts
  assets/            # static files
  evals/             # eval suites
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Legacy `SKILL.md` (portable agent definition)](./lenser-md-legacy)
- [Native `TEAM.MD`](./team-md)
- Implementation: [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts)
