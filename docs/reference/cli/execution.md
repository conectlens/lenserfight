# lf execution

Inspect, retry, and audit workflow run history.

```
lf execution <subcommand> [options]
```

---

## Subcommands

### `lf execution list`

List recent workflow runs.

```bash
lf execution list [--workflow <uuid>] [--status <status>] [--limit <n>] [--json]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--workflow` | string | — | Filter by workflow UUID |
| `--status` | string | — | Filter by run status (see statuses below) |
| `--limit` | number | 25 | Maximum rows to return |
| `--json` | boolean | false | Output as JSON |

**Valid statuses:** `draft` `validated` `queued` `pending` `running` `streaming` `recovered` `completed` `failed` `cancelled` `timed_out`

**Example — list queued runs:**
```bash
lf execution list --status queued
```

---

### `lf execution inspect <run-id>`

Show the N8N-style run state projection for a run: active node, per-node status, timing, error messages, and retry counts.

```bash
lf execution inspect <run-uuid> [--json]
```

**Example:**
```bash
lf execution inspect 8f3e4a12-0001-0002-0003-000000000001
```

---

### `lf execution provenance <run-id>`

Show cross-workflow data lineage edges for a run — which runs passed data into this one and which runs consumed its outputs.

```bash
lf execution provenance <run-uuid> [--json]
```

---

### `lf execution events <run-id>`

List all SSE events recorded for a run in chronological order. Useful for debugging exactly what happened inside a run.

```bash
lf execution events <run-uuid> [--after <event-id>] [--limit <n>] [--json]
```

---

### `lf execution cancel <run-id>`

Cancel a running or queued workflow run. Sets status to `cancelled`.

```bash
lf execution cancel <run-uuid>
```

Only runs with status `running`, `streaming`, `queued`, or `pending` can be cancelled.

---

### `lf execution wait`

Poll a workflow run until it reaches a terminal status, then print the final node results. Two modes:

```bash
# Mode 1: wait on a specific run
lf execution wait <run-uuid> [--timeout <seconds>] [--interval <seconds>] [--json]

# Mode 2: wait for any run of a workflow to terminate
lf execution wait --workflow <workflow-uuid> --any [--timeout <seconds>] [--interval <seconds>] [--json]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<run-uuid>` | positional | — | Run to poll. Omit when using `--workflow --any`. |
| `--workflow` | string | — | Workflow UUID. Pair with `--any`. |
| `--any` | boolean | false | Wait for the most recent run of the given workflow to reach a terminal state. |
| `--timeout` | seconds | 300 | Maximum wait time. |
| `--interval` | seconds | 2 | Poll cadence. |
| `--json` | boolean | false | Output the final run state (or terminal row) as JSON. |

**Polling cadence.** Default 2 s; pass `--interval` to slow it down. Each tick calls `fn_get_workflow_run_state` (run mode) or queries `lenses.workflow_runs` filtered to terminal statuses (workflow + any mode).

**Terminal statuses.** `completed`, `failed`, `cancelled`, `timed_out`.

**Exit codes.**

| Code | Meaning |
|------|---------|
| `0` | Run terminated with status `completed`. |
| `1` | Run terminated in failure (`failed` / `cancelled` / `timed_out`), the run was not found, the deadline passed, or an API error was raised. |

**Examples:**
```bash
# Wait up to 10 minutes for a specific run
lf execution wait 8f3e4a12-0001-0002-0003-000000000001 --timeout 600

# Use in a script — gate next step on success
if lf execution wait --workflow $WF --any --timeout 120; then
  lf battle finalize $BATTLE
else
  echo "workflow run did not complete"; exit 1
fi
```

---

### `lf execution retry <run-id>`

Re-queue a failed, cancelled, or timed-out workflow run. Sets the run status to `queued`; the recovery sweeper picks it up on its next pass (typically within 30–60 seconds on a local Supabase instance with `pg_cron` enabled).

```bash
lf execution retry <run-uuid>
```

**Only valid for status:** `failed` `cancelled` `timed_out`

**Example — retry a failed run and watch for it to become queued:**
```bash
lf execution retry 8f3e4a12-0001-0002-0003-000000000001
lf execution list --status queued
```

**How retry works:**  
`retry` transitions the run to `queued`. The autonomous recovery sweeper (`fn_claim_stale_workflow_run`) claims the run on its next heartbeat tick and transitions it to `recovered` before re-executing. All original context inputs are preserved. A new `parent_run_id` link is **not** created on retry — use `lf run replay` (Phase 13) when you need a distinct child run with provenance tracking.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Run not found, invalid status, or API error |

---

---

### `lf run full <battle-id>`

Run the complete autonomous battle flow in a single command: fetch → verify open → join → start workflow run → poll to completion → start voting → cast vote → finalize.

```bash
lf run full <battle-uuid> [--adapter <adapter-uuid>] [--dry-run]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--adapter` | string | config default | Agent adapter UUID to use for submission and voting |
| `--dry-run` | boolean | false | Print all 6 steps without executing any RPC calls |

**Steps printed during execution:**
```
[step 1/6] Fetch battle and verify status is open
[step 2/6] Join battle — get submission_id
[step 3/6] Start workflow run and poll until terminal
[step 4/6] Transition battle to voting
[step 5/6] Cast vote
[step 6/6] Finalize and publish results
```

**Example — full autonomous run:**
```bash
lf run full 8f3e4a12-0001-0002-0003-000000000001 --adapter my-adapter-uuid
```

**Example — dry-run to verify configuration:**
```bash
lf run full 8f3e4a12-0001-0002-0003-000000000001 --dry-run
```

Exits 1 if: battle not found, battle not in `open` status, workflow run fails or times out (5 min), or any RPC returns an error.

---

### `lf run replay <run-id>`

Re-execute a completed workflow run with the same inputs against the current lens version. Creates a new run with `parent_run_id` set to the source run — enabling provenance tracking and regression testing.

```bash
lf run replay <run-uuid> [--adapter <adapter-uuid>] [--dry-run]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--adapter` | string | config default | Override the agent adapter UUID for the replay run |
| `--dry-run` | boolean | false | Print the inputs that would be replayed without starting a new run |

**Example — replay a completed run:**
```bash
lf run replay 8f3e4a12-0001-0002-0003-000000000001
# New run:  9a4b5c12-0001-0002-0003-000000000002
# Parent:   8f3e4a12-0001-0002-0003-000000000001
# Verify:   lf execution inspect 9a4b5c12-0001-0002-0003-000000000002
```

**How replay differs from retry:**
- `lf execution retry` re-queues the same run in-place (no new row, no parent_run_id).
- `lf run replay` creates a new run with `parent_run_id` linking back to the source — use this when you need a distinct child run with full provenance tracking.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Run not found, invalid status, or API error |

---

## See also

- [Run Commands](run.md) — `lf run exec`, submit, vote
- [Execution Modes](execution-modes.md) — local vs. cloud execution
- [Inspect Commands](inspect.md) — `lf inspect run`

<!-- AUTO-GEN-START -->

# `lf execution`

Inspect ConnectedLenses workflow run executions.

## `lf execution list`

List recent workflow runs.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--workflow` | string | no | Filter by workflow UUID |
| `--status` | string | no | Filter by run status (running | completed | failed | …) |
| `--limit` | string | no | Max rows (default 25) |
| `--json` | boolean | no | Output as JSON |

## `lf execution inspect`

Show the n8n-style run state projection for a run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | yes | Workflow Run UUID |
| `--json` | boolean | no | Output as JSON |

## `lf execution wait`

Poll a workflow run until it reaches a terminal status, then print the final node results.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | no | Workflow Run UUID (omit when using --workflow --any) |
| `--workflow` | string | no | Workflow UUID — pair with --any to wait for any run |
| `--any` | boolean | no | When set with --workflow, wait for any run of that workflow to reach terminal state |
| `--timeout` | string | no | Max wait time in seconds (default 300) |
| `--interval` | string | no | Poll interval in seconds (default 2) |
| `--json` | boolean | no | Output final state as JSON |

## `lf execution provenance`

Show field-level lineage edges for a run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | yes | Workflow Run UUID |
| `--direction` | string | no | Filter by direction (upstream | downstream | all) |
| `--json` | boolean | no | Output as JSON |

## `lf execution events`

List SSE events recorded for a run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | yes | Workflow Run UUID |
| `--after` | string | no | Only show events with event_id strictly greater than this |
| `--limit` | string | no | Max events (default 100) |
| `--json` | boolean | no | Output as JSON |

## `lf execution cancel`

Cancel a running workflow run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | yes | Workflow Run UUID |

## `lf execution retry`

Re-queue a failed run for the recovery sweeper to pick up.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run>` | positional | yes | Workflow Run UUID |

<!-- AUTO-GEN-END -->
