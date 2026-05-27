---
title: lf spec
description: LenserFight spec governance: validate, inspect, migrate, and hash spec files.
---

<!-- AUTO-GEN-START -->

# `lf spec`

LenserFight spec governance: validate, inspect, migrate, and hash spec files.

## `lf spec validate`

Validate spec files and report apiVersion status.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<path>` | positional | no | File or directory to validate (default: current workspace) |
| `--json` | boolean | no | Output results as JSON |
| `--strict` | boolean | no | Treat missing apiVersion as an error instead of a warning |

## `lf spec inspect`

Print a structured summary of a spec file.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<file>` | positional | yes | Path to the spec Markdown file |
| `--json` | boolean | no | Output as JSON |

## `lf spec migrate`


| Flag | Type | Required | Description |
|---|---|---|---|
| `<path>` | positional | no | File or directory to migrate (default: current workspace) |
| `--dry-run` | boolean | no | Print what would change without writing files |
| `--json` | boolean | no | Output results as JSON |

## `lf spec digest`

Compute the SHA-256 content hash of a spec frontmatter.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<file>` | positional | yes | Path to the spec Markdown file |
| `--json` | boolean | no | Output as JSON |

## `lf spec kinds`

List all recognized LenserFight spec kinds.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

## `lf spec schema`

Print the JSON Schema for a given spec kind.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<kind>` | positional | yes | Spec kind (e.g. lens, lenser, colens, battle, ray, evaluation, execution) |

## `lf spec export-schema`

Export a spec frontmatter as a standalone YAML or JSON document (without the Markdown body).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<file>` | positional | yes | Path to the spec Markdown file |
| `--format` | string | no | Output format: yaml or json (default: yaml) |
| `--out` | string | no | Write output to this file instead of stdout |

<!-- AUTO-GEN-END -->
