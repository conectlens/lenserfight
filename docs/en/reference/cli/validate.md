---
title: lf validate
description: Validate file-first LenserFight markdown objects.
---

<!-- AUTO-GEN-START -->

# `lf validate`

Validate file-first LenserFight markdown objects.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<path>` | positional | no | File or directory containing automation markdown objects |
| `--json` | boolean | no | Output full validation results as JSON |
| `--no-global` | boolean | no | Do not include ~/.lenserfight templates in workspace validation |
| `--no-recursive` | boolean | no | Do not recursively discover nested .lenserfight directories |

<!-- AUTO-GEN-END -->

When `<path>` is omitted or `.`, `lf validate` uses workspace discovery: user-global `~/.lenserfight`, project-root `.lenserfight`, and nested `.lenserfight` directories. Pass a specific file or directory to validate only that path.
