---
title: lf examples
description: Show common CLI usage examples grouped by category — getting started, lenses, battles, workflows, teams, diagnostics, and automation.
---

# `lf examples`

Display common CLI usage examples grouped by category. Useful for discovering common workflows without reading full documentation.

```bash
lf examples [--category <name>] [--json]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--category` | string | all | Filter examples by category |
| `--json` | boolean | `false` | Output examples as JSON |

## Categories

| Category | Description |
|---|---|
| `getting-started` | Initialize a project, authenticate, check status |
| `lenses` | Create, version, and publish Lenses |
| `battles` | Local and cloud Battle workflows |
| `workflows` | Simulate and validate Workflows |
| `teams` | Create and dispatch Agent Teams |
| `diagnostics` | Environment checks (`lf doctor`, `lf env`) |
| `automation` | Recurring schedules and triggers |

## Examples

```bash
# Show all examples
lf examples

# Filter by category
lf examples --category battles
lf examples --category getting-started

# JSON output for scripting
lf examples --json | jq '.[].commands'
```

## Related commands

- [`lf doctor`](./doctor.md) — Full environment diagnostics
- [`lf env`](./env.md) — Environment variable status
- [`lf docs open`](./docs.md) — Open topic in browser
