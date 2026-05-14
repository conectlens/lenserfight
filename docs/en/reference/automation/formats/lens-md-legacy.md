---
title: LENS.md (legacy) — Portable Lens
description: Legacy portable form of a lens/task unit with full strict frontmatter.
---

# `LENS.md` — Legacy portable lens/task unit

The legacy portable form of a lens. Identical filename to the native form (`LENS.MD` — discovery is case-insensitive), but uses the **full** frontmatter schema (`kind`, `schema_version`, `id`, …) plus the strict section structure. Use this when interchanging lenses between tools or when stricter validation is needed.

## Filename

- Canonical: `LENS.MD` / `LENS.md`
- Container: `lenses/<slug>/LENS.MD`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `lens` | Discriminator |
| `schema_version` | number | `1` today |
| `id` | string | Stable id, preserved across import/export |
| `name` | string | Display name |
| `description` | string | One-line purpose |

Plus the canonical lens body must contain a `Prompt` and input/output schemas:

```yaml
input_schema:  { type: object }
output_schema: { type: object }
evaluation_refs: []
```

## Required sections

- `# Purpose`
- `# Prompt`
- `# Inputs`
- `# Outputs`

## Validation rules

- All native lens rules apply (frontmatter, parameters, disclosure).
- Additionally: `kind`, `schema_version`, `id`, and all four sections must be present (no "minimal unit" shortcut).
- Body `[[parameter]]` placeholders must be declared in `parameters[]` with a UUID `tool_id`.

## Canonical template

```bash
lenserfight export lens --template --legacy --out ./LENS.md
```

(Without `--legacy`, the canonical native template is written instead.)

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
…

# Prompt
…

# Inputs
…

# Outputs
…
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `LENS.MD`](./lens-md)
