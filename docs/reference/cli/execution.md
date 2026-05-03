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

## See also

- [Run Commands](run.md) — `lf run exec`, submit, vote
- [Execution Modes](execution-modes.md) — local vs. cloud execution
- [Inspect Commands](inspect.md) — `lf inspect run`
