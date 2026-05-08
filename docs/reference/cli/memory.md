---
title: Memory Commands
description: CLI reference for managing per-agent memory profiles and entries — list, search, write, redact, and summarize.
---

# `lf memory`

Manage agent memory: persistent context that survives across runs and is scoped to a memory profile (`project | conversation | global`).

Backing schema: `agents.memory_profiles`, `agents.memories`, `agents.memory_access_logs`.

## `lf memory list-profiles`

List memory profiles for an agent.

```bash
lf memory list-profiles --agent <ai-lenser-id>
lf memory list-profiles --agent <id> --json
```

| Flag | Description |
|---|---|
| `--agent <id>` | Required. AI lenser ID. |
| `--json` | Output as JSON. |

## `lf memory list-entries`

Read memory entries from a profile. Each invocation is logged as a `read` access in `agents.memory_access_logs`.

```bash
lf memory list-entries --profile <profile-id>
lf memory list-entries --profile <id> --scope project --limit 50
lf memory list-entries --profile <id> --workflow <workflow-id>
```

| Flag | Description |
|---|---|
| `--profile <id>` | Required. Memory profile ID. |
| `--scope <name>` | Filter to `project`, `conversation`, or `global`. |
| `--limit <n>` | Max entries. Default 20. |
| `--workflow <id>` | Phase N3. Cross-run rollup — show entries written by any run of the given workflow. |
| `--json` | Output as JSON. |

## `lf memory search`

Phase N1. Full-text search over `agents.memories.content` using a Postgres `english` tsvector and a GIN index. Results are ranked by `ts_rank`.

```bash
lf memory search "pizza preferences"
lf memory search "weekly standup" --profile <id>
lf memory search "pizza" --limit 5 --json
```

| Flag | Description |
|---|---|
| `--profile <id>` | Limit search to a single memory profile. Optional. |
| `--limit <n>` | Max results. Default 20. Max 50. |
| `--json` | Output as JSON. |

::: tip Language
The `english` dictionary biases ranking toward English stemming. Non-English content is searchable but ranking is approximate. See [Known Limitations](/reference/known-limitations#tools-and-memory).
:::

## `lf memory write-entry`

Write a manual memory entry that will be visible to the agent on the next run.

```bash
lf memory write-entry \
  --profile <profile-id> \
  --scope project \
  --source manual \
  --content "User prefers concise summaries" \
  --confidence 0.9
```

| Flag | Description |
|---|---|
| `--profile <id>` | Required. |
| `--scope <name>` | `project`, `conversation`, or `global`. Default `project`. |
| `--source <kind>` | `manual`, `user`, `agent`, `tool`, or `eval`. Default `manual`. |
| `--content <text>` | Required. |
| `--confidence <0-1>` | Default `0.7`. |

## `lf memory redact`

Redact an entry. Content is replaced with `[redacted]`; the original is preserved in audit logs.

```bash
lf memory redact <memory-id> --reason "PII removed"
```

## `lf memory summarize`

Summarize a memory profile — entry count, scope distribution, last write timestamp.

```bash
lf memory summarize --profile <profile-id>
lf memory summarize --profile <id> --json
```
