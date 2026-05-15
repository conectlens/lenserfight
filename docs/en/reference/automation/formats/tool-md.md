---
title: TOOL.md — Portable Tool Contract
description: Portable contract for an external tool used by lensers and lenses.
---

# `TOOL.md` — Portable tool contract

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


A **TOOL** is a typed, side-effect-bearing capability that LENSERs and LENSes can call. `TOOL.md` declares its input/output schema, auth requirements, risk class, and failure modes. The CLI command `lenserfight tool test ./TOOL.md` runs a smoke test against the contract.

## Filename

- Canonical: `TOOL.md`
- Container: `tools/<slug>/TOOL.md`

## Required frontmatter

| Key | Type | Notes |
|---|---|---|
| `kind` | `tool` | Discriminator |
| `schema_version` | number | `1` |
| `id` | string | Stable id |
| `name` | string | Display name |

Common keys: `category` (`read_only`, `write`, `external`, …), `permission_level`, `cost_level`, `risk_level`, `input_schema`, `output_schema`.

## Required sections

- `# Capability Description`
- `# Inputs`
- `# Outputs`
- `# Failure Modes`

## Validation rules

- Frontmatter and all four sections must be present.
- `id` must be present and stable across import/export.

## CLI

```bash
lenserfight tool test ./TOOL.md
```

## Canonical template

```yaml
---
kind: tool
schema_version: 1
id: tool_<uuid>
slug: web-search
name: Web Search
description: Query public web sources and return ranked results.
owner: { workspace_id: ws_<uuid> }
visibility: workspace
status: active
version: 0.1.0
category: read_only
permission_level: read
cost_level: low
risk_level: safe
input_schema: { type: object }
output_schema: { type: object }
---

# Capability Description
What the tool does and what it does not do.

# Inputs
Describe accepted inputs and validation.

# Outputs
Describe the output contract.

# Failure Modes
Timeout, rate limit, auth error, malformed upstream data, and empty result.
```

## Related

- [Markdown Object Formats overview](../markdown-objects)
- [Native `LENS.MD`](./lens-md) (lenses call tools via `parameters[i].tool_id`)
