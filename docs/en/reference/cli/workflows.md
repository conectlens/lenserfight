---
title: lf workflows
description: Workflow hub — list, create, schedule, run history, and local file validation.
---

# `lf workflows`

Cloud workflow hub for listing, lifecycle management, schedules, triggers, and run history. Delegates to `lf workflow`, `lf schedule`, and `lf execution` where appropriate.

Press **`w`** in the TUI dashboard for key bindings.

## Subcommands

| Subcommand | Description |
|---|---|
| `list` | List your cloud workflows |
| `get <uuid>` | Lifecycle status and dependencies |
| `create` | Create a cloud workflow |
| `update <schedule-uuid>` | Update a workflow schedule |
| `delete <uuid>` | Dependency-aware workflow deletion |
| `insert <workflow-uuid>` | Insert a trigger (`cron`, `battle_event`, `webhook`, `manual`) |
| `stop <run-uuid>` | Cancel a workflow run |
| `schedule` | Create a cron schedule (wizard) |
| `runs [--workflow <uuid>]` | List recent workflow runs |
| `run <file>` | Simulate a local `WORKFLOW.md` |
| `validate <file>` | Validate a local workflow file |

## Examples

```bash
# List cloud workflows
lf workflows list

# Recent runs (all workflows)
lf workflows runs

# Runs for one workflow
lf workflows runs --workflow <WORKFLOW-UUID> --limit 50 --json

# Insert a manual trigger
lf workflows insert <WORKFLOW-UUID> --type manual

# Local file validation (no auth required)
lf workflows validate ./WORKFLOW.md
lf workflows run ./WORKFLOW.md --inputs '{"topic":"AI Safety"}'
```

## Related

- [`lf workflow`](workflow.md) — underlying workflow commands and lifecycle
- [`lf execute`](execute.md) — platform health, execution history, workflow run streaming
- [`lf schedule`](schedule.md) — full schedule management
- [`lf agents`](agents.md) — agent workspace for dispatch and team runs
