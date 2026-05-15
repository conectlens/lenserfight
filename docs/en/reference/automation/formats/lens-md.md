---
title: LENS.MD — Native ConectLens Lens
description: Canonical file format for a ConectLens lens (reusable task unit).
---

# `LENS.MD` — Native ConectLens lens/task unit

`LENS.MD` is the canonical, file-first representation of a **lens**: a reusable prompt/task unit with a structured body and optional parameter contract. It is the native ConectLens form, validated by `lenserfight validate`, exported by `lenserfight export lens`, and consumed by `lenserfight workflow run`.

## Filename

- Canonical: `LENS.MD` (upper-case `.MD`)
- Container directory: `lenses/<slug>/LENS.MD` (or any path on disk; folder containment matters for progressive disclosure)
- Lookup: case-insensitive — discovery normalises file names through `PRIMARY_FILE_KIND_BY_NAME` in [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts).

## Required frontmatter

Native ConectLens lenses can use the compact Agent-Skills-style frontmatter with just two keys:

| Key | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | One-line purpose used by discovery and UIs |

Optionally, when the lens body uses `[[parameter]]` placeholders, the frontmatter must declare each parameter:

```yaml
parameters:
  - label: topic          # required, normalised to snake_case for matching
    tool_id: <uuid>       # required, must be a UUID — mirrors lenses.version_parameters.tool_id
```

If the lens body declares `[[topic]]` but `parameters` is missing or empty, validation fails. Declared labels not used in the body emit a warning.

## Required sections (legacy strict mode)

When `kind:` and `schema_version:` are present (the legacy portable form), the lens body must contain these `#` headings:

- `# Purpose`
- `# Prompt`
- `# Inputs`
- `# Outputs`

Native compact lenses (only `name` and `description`) skip section checks.

## Validation rules

- **Frontmatter present and parsable as YAML.**
- **Required keys** (`name`, `description`).
- **Parameter contract:** every `[[placeholder]]` in the body must be declared, and every declared `parameters[i]` must have `label` and a UUID `tool_id`.
- **Progressive disclosure paths** (`references[]`, `scripts[]`, `assets[]`, `evals[]`) must live under `references/`, `scripts/`, `assets/`, `evals/` relative to the lens directory and resolve to existing files.
- **Disclaimer markers:** lenses tagged `legal` must say "not legal advice"; lenses tagged `finance` must say "not financial advice".

## Canonical template

```bash
lenserfight export lens --template --out .lenserfight/lenses/example/LENS.MD
```

```yaml
---
kind: lens
schema_version: 1
id: lens_<uuid>
slug: market-brief
name: Market Brief Lens
description: Structured task unit for a reusable market brief prompt.
owner:
  workspace_id: ws_<uuid>
visibility: workspace
status: draft
version: 0.1.0
tags: [research]
input_schema: { type: object }
output_schema: { type: object }
evaluation_refs: []
---

# Purpose
Explain what this lens is meant to do.

# Prompt
Write the structured prompt body here.

# Inputs
Describe runtime inputs and validation.

# Outputs
Describe the expected output shape and quality bar.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [ConectLens Agent Skills Ruleset](../ConectLens-agent-skills)
- Implementation: [automation-objects.ts](../../../../../../apps/cli/src/utils/automation-objects.ts)
