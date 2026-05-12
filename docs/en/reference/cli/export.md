---
title: lf export
description: Export a local automation object or generate a canonical markdown template.
---

<!-- AUTO-GEN-START -->

# `lf export`

Export a local automation object or generate a canonical markdown template.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<kind>` | positional | yes | Object kind: lens | lenser | colens | battle | ray | team | tool | skill | memory_policy | evaluation | run_report |
| `<id>` | positional | no | Imported object id. Omit when using --template. |
| `--out` | string | no | Destination path |
| `--template` | boolean | no | Generate the canonical template file instead of exporting a registered object |
| `--legacy` | boolean | no | Generate a legacy compatibility template for legacy kinds such as agent or workflow |

<!-- AUTO-GEN-END -->
