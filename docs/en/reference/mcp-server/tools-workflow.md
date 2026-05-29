---
title: Workflow Tools — MCP Server
description: Reference for all 8 workflow tools in the LenserFight MCP server, grouped by safety class (Read / Write / Execute).
---

# Workflow Tools

The MCP server provides **8 tools** for managing workflows and their runs. Workflows are reusable multi-step execution containers that chain lenses, models, and external services.

Tools follow the `verb_noun` naming convention (`list_workflows`, `get_workflow`, `run_workflow`).

| Class | Count | What it does |
|---|---|---|
| [Read](#read) | 5 | List, fetch, poll status, read logs, summarize |
| [Write](#write) | 1 | Create a workflow definition |
| [Execute](#execute) | 2 | Start a run or retry a failed run |

Workflows have no `Destructive` tools — runs are immutable once started.

---

## Run lifecycle

```
pending → running → completed
                  ↓
               failed | cancelled
```

Use `get_workflow_run_status` to poll the current status of a run. Use `retry_workflow` to start a new run when a previous one failed or was cancelled.

---

## Read

Pure reads. Safe to call without per-call confirmation.

### `list_workflows`

List workflows with optional filters and pagination.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | No | — | Filter by visibility |
| `lenser_id` | UUID | No | — | Filter to workflows owned by a specific lenser |

**Returns** Paginated list of workflow summaries.

---

### `get_workflow`

Get full details of a workflow including its head version and scheduling metadata.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `workflow_id` | UUID | Yes | The workflow to retrieve |

**Returns** Workflow object with head version details and scheduling configuration.

---

### `get_workflow_run_status`

Poll the current status and credit cost of a running or completed workflow run.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to poll |

**Returns**

```json
{
  "id": "run-uuid",
  "status": "running",
  "started_at": "2026-05-28T12:00:00Z",
  "completed_at": null,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 }
}
```

**Status values:**

| Status | Meaning |
|---|---|
| `pending` | Queued, not yet started |
| `running` | Actively executing |
| `completed` | All nodes finished successfully |
| `failed` | One or more nodes failed; use `get_workflow_run_logs` for details |
| `cancelled` | Run was cancelled manually |

---

### `get_workflow_run_logs`

Read the node-level execution log for a run, ordered by start time.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to inspect |

**Returns**

```json
{
  "run": {
    "id": "...",
    "status": "completed",
    "metadata": {},
    "cost_metadata": { "model_calls": 3, "tokens_used": 1840 },
    "started_at": "...",
    "completed_at": "..."
  },
  "node_results": [
    {
      "node_id": "...",
      "status": "completed",
      "output": { "text": "..." },
      "tokens_used": 620,
      "cost_credits": 4,
      "started_at": "...",
      "completed_at": "..."
    }
  ]
}
```

---

### `summarize_workflow`

Aggregate run metrics: overall status, wall-clock duration, credit cost, and per-node result counts. Useful for audit logs or post-run reporting.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to summarize |

**Returns**

```json
{
  "run_id": "...",
  "workflow_id": "...",
  "status": "completed",
  "duration_ms": 8420,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 },
  "nodes": {
    "total": 5,
    "completed": 5,
    "failed": 0,
    "skipped": 0
  }
}
```

**Error codes** `NOT_FOUND`

---

## Write

Mutates state — creates a new workflow definition.

### `create_workflow`

Create a new workflow as a reusable multi-step execution container.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200 chars) | Yes | — | Display name |
| `description` | string (max 2 000 chars) | No | — | Human-readable description |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | No | `'private'` | Initial visibility |
| `lenser_id` | UUID | No | Value of `LENSERFIGHT_LENSER_ID` env var | Owner of the workflow |

**Returns** New workflow object.

**Error codes** `MISSING_LENSER` (if neither `lenser_id` param nor `LENSERFIGHT_LENSER_ID` env var is set)

---

## Execute

Starts or restarts a workflow run. Hosts should treat these as side-effectful and may consume credits.

### `run_workflow`

Start a workflow execution. Returns a `run_id` immediately; use `get_workflow_run_status` to poll for completion.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `workflow_id` | UUID | Yes | — | The workflow to execute |
| `inputs` | `Record<string, unknown>` | No | `{}` | Input values passed to the first node |
| `global_model_id` | string | No | — | Override the model for all AI nodes |
| `idempotency_key` | string (max 128 chars) | No | — | If a run with this key already exists, it is returned instead of creating a duplicate |

**Returns**

```json
{
  "id": "run-uuid",
  "status": "pending",
  "created_at": "2026-05-28T12:00:00Z",
  "workflow_id": "..."
}
```

---

### `retry_workflow`

Retry a failed or cancelled run with the same inputs. Creates a new run linked to the original via `parent_run_id`.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The failed or cancelled run to retry |

**Returns**

```json
{
  "new_run": {
    "id": "new-run-uuid",
    "status": "pending",
    "created_at": "..."
  },
  "original_run_id": "..."
}
```

**Error codes** `NOT_FOUND`
