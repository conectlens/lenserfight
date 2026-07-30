---
title: Workflow Tools — MCP Server
description: Reference for all 11 workflow tools in the LenserFight MCP server, including complete graph creation and validation.
---

# Workflow Tools

The MCP server provides **11 tools** for managing workflows and their runs. Workflows connect triggers, reusable Lenses, deterministic tools, and configured connectors.

Tools follow the `verb_noun` naming convention (`list_workflows`, `get_workflow`, `run_workflow`).

| Class               | Count | What it does                                               |
| ------------------- | ----- | ---------------------------------------------------------- |
| [Read](#read)       | 8     | List, fetch, explain, validate, poll, read logs, summarize |
| [Write](#write)     | 1     | Create a workflow definition                               |
| [Execute](#execute) | 2     | Start a run or retry a failed run                          |

Workflows have no `Destructive` tools — runs are immutable once started.

---

## Run lifecycle

```
pending → running → completed
                  ↓
               failed | cancelled
```

Use `get_workflow_run_status` to poll the current status of a run. Use `retry_workflow` to start a new run when a previous one failed or was cancelled.

## AI creation sequence

An AI assistant should build a workflow in this order:

1. State the outcome and identify values the user must provide.
2. Search for reusable Lenses. Call `create_lens` for missing AI instructions and keep the returned Lens IDs.
3. Choose one trigger: `manual_trigger`, `schedule_trigger`, `event_trigger`, `form_input_trigger`, or `webhook_trigger`.
4. Add Lens steps for AI reasoning and tool steps for deterministic actions.
5. For external services, pass a saved connector `connection_ref`. Never put API keys, tokens, passwords, or webhook secrets in workflow configuration.
6. Connect readable step keys by mapping an upstream `output_key` to the exact downstream `input_parameter`.
7. Call `create_workflow` with the complete blueprint.
8. Call `validate_workflow`. Only call `run_workflow` after structural validation succeeds.

---

## Read

Pure reads. Safe to call without per-call confirmation.

### `list_workflows`

List workflows with optional filters and pagination.

**Parameters**

| Name         | Type                                  | Required | Default | Description                                    |
| ------------ | ------------------------------------- | -------- | ------- | ---------------------------------------------- |
| `limit`      | number (1–100)                        | No       | `20`    | Results per page                               |
| `offset`     | number                                | No       | `0`     | Pagination offset                              |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | No       | —       | Filter by visibility                           |
| `lenser_id`  | UUID                                  | No       | —       | Filter to workflows owned by a specific lenser |

**Returns** Paginated list of workflow summaries.

---

### `get_workflow`

Get full details of a workflow including its head version and scheduling metadata.

**Parameters**

| Name          | Type | Required | Description              |
| ------------- | ---- | -------- | ------------------------ |
| `workflow_id` | UUID | Yes      | The workflow to retrieve |

**Returns** Workflow object with head version details and scheduling configuration.

---

### `get_workflow_graph`

Return the visibility-gated workflow, nodes, and edges. Credential references are redacted while Lens parameter assignments remain available.

### `describe_workflow`

Return a compact explanation of triggers, Lens/tool nodes, parameter assignments, and connections.

### `validate_workflow`

Check a workflow without executing it.

**Parameters**

| Name          | Type | Required | Description          |
| ------------- | ---- | -------- | -------------------- |
| `workflow_id` | UUID | Yes      | Workflow to validate |

**Returns** `valid`, `run_ready`, actionable errors and warnings, readable execution order, root nodes, and each step's configured and upstream-wired parameters.

Validation detects empty graphs, missing or duplicate node IDs, unknown node kinds, broken edge references, missing target parameters, and cycles. Missing or multiple triggers are reported as warnings.

---

### `get_workflow_run_status`

Poll the current status and credit cost of a running or completed workflow run.

**Parameters**

| Name     | Type | Required | Description     |
| -------- | ---- | -------- | --------------- |
| `run_id` | UUID | Yes      | The run to poll |

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

| Status      | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `pending`   | Queued, not yet started                                           |
| `running`   | Actively executing                                                |
| `completed` | All nodes finished successfully                                   |
| `failed`    | One or more nodes failed; use `get_workflow_run_logs` for details |
| `cancelled` | Run was cancelled manually                                        |

---

### `get_workflow_run_logs`

Read the node-level execution log for a run, ordered by start time.

**Parameters**

| Name     | Type | Required | Description        |
| -------- | ---- | -------- | ------------------ |
| `run_id` | UUID | Yes      | The run to inspect |

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

| Name     | Type | Required | Description          |
| -------- | ---- | -------- | -------------------- |
| `run_id` | UUID | Yes      | The run to summarize |

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

Create an empty container or atomically create a complete workflow graph. Prefer complete creation for AI-authored workflows.

**Parameters**

| Name          | Type                                  | Required | Default                                  | Description                                             |
| ------------- | ------------------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------- |
| `title`       | string (1–200 chars)                  | Yes      | —                                        | Display name                                            |
| `description` | string (max 2 000 chars)              | No       | —                                        | Human-readable description                              |
| `visibility`  | `'public' \| 'private' \| 'unlisted'` | No       | `'private'`                              | Initial visibility                                      |
| `lenser_id`   | UUID                                  | No       | Value of `LENSERFIGHT_LENSER_ID` env var | Owner of the workflow                                   |
| `steps`       | array                                 | No       | —                                        | Ordered trigger, Lens, and tool steps; maximum 100      |
| `connections` | array                                 | No       | `[]`                                     | Output-to-input mappings between step keys; maximum 300 |

Each step accepts:

| Name         | Type                            | Required     | Description                                                       |
| ------------ | ------------------------------- | ------------ | ----------------------------------------------------------------- |
| `key`        | lowercase string                | Yes          | Readable local reference such as `start` or `research`            |
| `kind`       | `'trigger' \| 'lens' \| 'tool'` | Yes          | Step responsibility                                               |
| `name`       | string                          | Yes          | Human-readable canvas label                                       |
| `node_type`  | string                          | Trigger/tool | Trigger type or available workflow palette tool                   |
| `lens_id`    | UUID                            | Lens         | ID returned by `create_lens`, `search_lenses`, or `get_lens`      |
| `version_id` | UUID                            | No           | Pin a Lens version; omit to use its head version                  |
| `parameters` | object                          | No           | User-filled Lens parameters or tool values                        |
| `config`     | object                          | No           | Non-secret trigger/tool configuration                             |
| `connector`  | object                          | No           | `{ provider, connection_ref, capability? }` for a saved connector |

Each connection accepts `{ from_step, output_key?, to_step, input_parameter }`.

**Example**

```json
{
  "title": "Weekly AI robotics digest",
  "visibility": "private",
  "steps": [
    {
      "key": "start",
      "kind": "trigger",
      "name": "Every Monday",
      "node_type": "schedule_trigger",
      "config": {
        "cronExpression": "0 9 * * 1",
        "timezone": "Europe/Istanbul"
      }
    },
    {
      "key": "research",
      "kind": "lens",
      "name": "Research Lens",
      "lens_id": "lens-uuid-returned-by-create_lens",
      "parameters": {
        "topic": "AI robotics"
      }
    },
    {
      "key": "publish",
      "kind": "tool",
      "name": "Publish to Notion",
      "node_type": "notion_write",
      "connector": {
        "provider": "notion",
        "connection_ref": "saved-notion-connection",
        "capability": "database"
      }
    }
  ],
  "connections": [
    {
      "from_step": "start",
      "to_step": "research",
      "input_parameter": "context"
    },
    {
      "from_step": "research",
      "output_key": "result",
      "to_step": "publish",
      "input_parameter": "content"
    }
  ]
}
```

The server generates node UUIDs, lays out the steps, validates the graph, and writes the workflow, nodes, and edges in one transaction.

**Returns** The workflow record, node and edge counts, a readable creation summary, and recommended next calls.

**Error codes** `MISSING_LENSER`, `INVALID_ARGUMENT`, `FORBIDDEN`, `DB_ERROR`

---

## Execute

Starts or restarts a workflow run. Hosts should treat these as side-effectful and may consume credits.

### `run_workflow`

Start a workflow execution. Returns a `run_id` immediately; use `get_workflow_run_status` to poll for completion.

**Parameters**

| Name              | Type                      | Required | Default | Description                                                                           |
| ----------------- | ------------------------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| `workflow_id`     | UUID                      | Yes      | —       | The workflow to execute                                                               |
| `inputs`          | `Record<string, unknown>` | No       | `{}`    | Input values passed to the first node                                                 |
| `global_model_id` | string                    | No       | —       | Override the model for all AI nodes                                                   |
| `idempotency_key` | string (max 128 chars)    | No       | —       | If a run with this key already exists, it is returned instead of creating a duplicate |

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

| Name     | Type | Required | Description                          |
| -------- | ---- | -------- | ------------------------------------ |
| `run_id` | UUID | Yes      | The failed or cancelled run to retry |

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
