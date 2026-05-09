---
title: lf export
description: Export a local automation object or generate a canonical markdown template.
---

<!-- AUTO-GEN-START -->

# `lf export`

Export a local automation object or generate a canonical markdown template.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<kind>` | positional | yes | Object kind: lens | agent | agent_team | tool | workflow | private_battle | skill | memory_policy | evaluation | run_report |
| `<id>` | positional | no | Imported object id. Omit when using --template. |
| `--out` | string | no | Destination path |
| `--template` | boolean | no | Generate the canonical template file instead of exporting a registered object |

<!-- AUTO-GEN-END -->
