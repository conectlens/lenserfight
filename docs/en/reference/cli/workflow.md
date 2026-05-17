---
title: lf workflow
description: Local-first and cloud workflow commands — simulate, validate, create, and manage LenserFight Workflows.
---

# `lf workflow`

Manage file-based and cloud Workflows. Use `lf workflow run` for local simulation and validation, and `lf workflow create` to publish to the LenserFight cloud.

## Subcommands

| Subcommand | Description |
|---|---|
| [`run`](#lf-workflow-run) | Simulate a WORKFLOW.md locally and emit a run report |
| [`validate`](#lf-workflow-validate) | Validate a workflow file without running it |
| [`create`](#lf-workflow-create) | Create a cloud workflow on LenserFight |
| [`list`](#lf-workflow-list) | List your cloud workflows |
| [`status`](#lifecycle-subcommands) | Show lifecycle state and delete blockers |
| [`archive`](#lifecycle-subcommands) | Archive a workflow without breaking historical runs |
| [`restore`](#lifecycle-subcommands) | Restore an archived or tombstoned workflow |
| [`delete`](#lifecycle-subcommands) | Request dependency-aware workflow deletion |
| [`pin`](#lifecycle-subcommands) | Pin a workflow to your saved artifacts |
| [`unpin`](#lifecycle-subcommands) | Remove your saved pin from a workflow |
| [`trigger`](#lf-workflow-trigger) | Manage workflow triggers (cron, event, webhook, manual) |

---

## `lf workflow run`

Parse a local `WORKFLOW.md` or `COLENS.MD`, classify each step by executability, and emit a JSON + Markdown run report.

```bash
lf workflow run <file> [--inputs <json>] [--json]
```

### Arguments

| Argument | Type | Required | Description |
|---|---|---|---|
| `file` | positional | yes | Path to `WORKFLOW.md` or `COLENS.MD` |

### Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--inputs` | string | `''` | JSON object of workflow inputs (e.g. `'{"topic":"AI Safety"}'`) |
| `--json` | boolean | `false` | Emit the full run summary as JSON |

### Node executability

Each workflow step is classified as **executable** or **design-only**:

- **Executable now:** `lens`, `lens_execute`, `prompt_template`, `output_parser`, `set_variables`, `json_transform`, `switch`, `if_condition`, `loop_map`, `wait_delay`, `code`, `error_catch`, trigger nodes
- **Design-only:** All other node types require the hosted DAG runner. Publish the workflow to LenserFight and run from the web UI.

### Examples

```bash
# Parse and classify steps
lf workflow run ./WORKFLOW.md

# Pass inputs
lf workflow run ./WORKFLOW.md --inputs '{"topic":"AI Safety","max_tokens":512}'

# JSON output for CI pipelines
lf workflow run ./WORKFLOW.md --json | jq '.step_details'
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Parsed successfully |
| `1` | Parse or validation failure |

---

## `lf workflow validate`

Validate a workflow file's frontmatter and structure without producing artifacts.

```bash
lf workflow validate <file> [--json]
```

### Arguments

| Argument | Type | Required | Description |
|---|---|---|---|
| `file` | positional | yes | Path to `WORKFLOW.md` or `COLENS.MD` |

### Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | boolean | `false` | Output validation result as JSON |

### Example

```bash
lf workflow validate ./WORKFLOW.md
lf workflow validate ./WORKFLOW.md --json | jq '.issues'
```

---

## `lf workflow create`

Create a cloud workflow on LenserFight. Requires authentication.

```bash
lf workflow create --name <name> [--template <template>] [--description <text>] [--json]
```

### Flags

| Flag | Type | Required | Default | Description |
|---|---|---|---|---|
| `--name` | string | yes | — | Workflow name |
| `--template` | string | no | `''` | Starter template |
| `--description` | string | no | `''` | Workflow description |
| `--json` | boolean | no | `false` | Output result as JSON |

### Available templates

| Template | Description |
|---|---|
| `single-agent` | Single AI agent execution |
| `multi-step-research` | Sequential research pipeline |
| `code-review-pipeline` | Code analysis and review flow |
| `judge-evaluation` | AI judge evaluation workflow |
| `team-debate` | Multi-agent debate format |

### Examples

```bash
# Blank workflow
lf workflow create --name "Market Research Pipeline"

# From template
lf workflow create --name "Weekly Review" --template single-agent

# With description
lf workflow create --name "Code Audit" --template code-review-pipeline \
  --description "Automated PR review and security scan"
```

---

## `lf workflow list`

List your cloud workflows. Requires authentication.

```bash
lf workflow list [--limit <n>] [--offset <n>] [--json]
```

### Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--limit` | string | `'20'` | Maximum number of results |
| `--offset` | string | `'0'` | Pagination offset |
| `--json` | boolean | `false` | Output as JSON |

### Example

```bash
lf workflow list
lf workflow list --limit 50 --offset 20 --json | jq '.[].id'
```

---

## Lifecycle subcommands

These commands manage workflow state. All require authentication and a workflow UUID.

```bash
lf workflow status <id>   # Show state, version, delete blockers
lf workflow archive <id>  # Archive (keeps historical runs intact)
lf workflow restore <id>  # Restore archived or tombstoned workflow
lf workflow delete <id>   # Request deletion (used workflows become tombstones)
lf workflow pin <id>      # Pin to saved artifacts
lf workflow unpin <id>    # Remove saved pin
```

---

## `lf workflow trigger`

Manage triggers attached to a cloud workflow.

### `lf workflow trigger add`

```bash
lf workflow trigger add <id> [--type <type>] [--condition <json>]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--type` | string | `battle_event` | `cron \| battle_event \| webhook \| manual` |
| `--condition` | string | `'{}'` | JSON condition object for the trigger |

### `lf workflow trigger webhook-url`

```bash
lf workflow trigger webhook-url <id>
```

Prints the webhook URL for triggering the workflow via HTTP POST. The request body must include a `secret` field — treat it like a password.

### `lf workflow trigger list`

```bash
lf workflow trigger list <id> [--json]
```

Lists all triggers attached to the workflow, including trigger type, enabled state, and last fired time.

---

## Related commands

- [`lf spec validate`](./spec.md) — Validate workflow frontmatter schema
- [`lf schedule`](./schedule.md) — Create recurring workflow schedules
- [`lf execution`](./execution.md) — Inspect workflow run history
- [`lf examples`](./examples.md) — See workflow usage examples
