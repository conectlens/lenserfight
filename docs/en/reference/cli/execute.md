---
title: lf execute
description: Unified hub for workflow, battle, lens, and team AI executions.
---

# `lf execute`

Professional entry point for running and observing AI work on LenserFight. Commands delegate to existing RPC paths (`callRpc` / `callRest`) — no duplicate data layer in the CLI.

## Execution health

```bash
lf execute status
lf execute status --json
```

Shows a **platform-wide snapshot** from LenserFight Cloud — not your local machine. In cloud mode the CLI ignores local `.env` `SUPABASE_URL` / API URLs and queries the official cloud Supabase project instead (you may see a warning about that).

Use this before dispatching workflows or battles when you want to know whether the platform is accepting new work.

| Metric | Meaning |
|--------|---------|
| **System Kill Switch** | Emergency stop. `inactive` = normal. `ACTIVE` = new executions are blocked platform-wide until an admin lifts the switch. |
| **Queue Frozen** | Scheduled dispatch gate. `running` = **queues are open** and new jobs can be enqueued. `FROZEN — …` = admins paused scheduling; in-flight runs may still finish. |
| **Active Runs** | Workflow runs currently `running`, `streaming`, or `recovered`. |
| **Queued Runs** | Workflow runs waiting in `queued` or `pending`. |
| **Active Battle Jobs** | Battle AI jobs claimed or running on workers. |
| **Queued Battle Jobs** | Battle jobs waiting for a worker. |
| **Active Workers** | API workers that sent a heartbeat in the last 2 minutes. |
| **Stale Workers** | Workers with no heartbeat for > 2 minutes (possible crash or network partition). |
| **Workflow DLQ** | Workflow runs in the dead-letter queue (failed after retries, unresolved). |
| **Battle DLQ** | Battle jobs in the dead-letter queue (failed after retries, unresolved). |

### Reading a healthy idle snapshot

When everything is fine and nothing is executing, you typically see:

- Kill switch `inactive`
- Queue Frozen **`running`** (this means the queue is **not** frozen — confusing label, but correct)
- All run/job/worker/DLQ counts at **0**

That does **not** mean your CLI or a daemon is running locally. It means the cloud execution plane is healthy and currently idle.

Watch for warnings after the table: kill switch active, stale workers, or non-zero DLQ counts.

## Execution history

```bash
lf execute history
lf execute history --lens <LENS-UUID>
lf execute history --workflow <WORKFLOW-UUID>
lf execute history --limit 50 --offset 0 --json
```

Lists **your** recent executions in the terminal:

| Mode | Flag | Source |
|------|------|--------|
| Activity feed (default) | *(none)* | Team runs, schedule dispatches, and agent actions across your AI lensers |
| Lens prompt runs | `--lens` | Model/provider executions for one lens |
| Workflow runs | `--workflow` | Runs for one owned workflow |

Use `lf execute workflow list` for the same workflow run table with optional `--status` / `--workflow` filters on the legacy path.

## Workflow runs

```bash
lf execute status
lf execute workflow list
lf execute workflow inspect <RUN-UUID>
lf execute workflow wait <RUN-UUID>
lf execute workflow stream <RUN-UUID>    # SSE-style event tail
lf execute workflow cancel <RUN-UUID>
```

`lf execution …` remains available; prefer `lf execute workflow …` for new scripts.

### Streaming events

```bash
lf execute workflow stream <RUN-UUID> --timeout 600
# or legacy:
lf execution events <RUN-UUID> --follow
```

Polls `lenses.workflow_run_events` and prints token chunks with terminal FX while you wait.

## Battles

```bash
lf execute battle exec <battle-id> …
lf execute battle dispatch <battle-id> …
lf execute battle file-run <slug>
lf execute battle jobs <battle-id>
```

## Lens / prompt

```bash
lf execute lens prompt --provider openai --model gpt-4o "Hello"
lf execute prompt …    # alias
```

Uses `@lenserfight/providers` for BYOK (env), Ollama, or cloud RPC.

## Team runs

```bash
lf execute team dispatch …
lf execute team list
```

## Dashboard

From `lf` (TUI): press **`e`** for the Execute sub-dashboard, **`k`** for Configure (BYOK / Ollama / providers).

See also [lf configure](./configure.md) and [CLI dashboard](/en/how-to/operations/cli-dashboard.md).
