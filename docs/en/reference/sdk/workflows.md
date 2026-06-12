---
title: "WorkflowClient — @lenserfight/sdk"
description: Full reference for lf.workflows — list, start, poll, and await multi-node workflow runs.
---

# `WorkflowClient` — `lf.workflows`

Manage and execute multi-node AI workflows. All methods require an **authenticated client** (`apiKey` in `createClient`).

---

## `lf.workflows.browse(options?)`

List workflows visible to the authenticated user. Calls `fn_mcp_workflow_list`.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.limit` | `number` | `20` | Max workflows to return. |
| `options.offset` | `number` | `0` | Records to skip. |
| `options.visibility` | `string` | `null` | Filter by visibility (`'public'`, `'community'`, `'private'`). `null` returns all accessible. |

**Returns** `Promise<SdkWorkflowSummary[]>`

```ts
const workflows = await lf.workflows.browse({ limit: 10, visibility: 'public' })
for (const w of workflows) {
  console.log(w.id, w.title)
}
```

**`SdkWorkflowSummary`**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID of the workflow. |
| `title` | `string` | Display name. |
| `description` | `string \| null` | Optional description. |
| `visibility` | `string` | `'public'` \| `'community'` \| `'private'` |
| `createdAt` | `string` | ISO 8601 timestamp. |

---

## `lf.workflows.getById(workflowId)`

Fetch full detail for a single workflow. Calls `fn_mcp_workflow_get`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `workflowId` | `string` | UUID of the workflow. |

**Returns** `Promise<SdkWorkflowDetail | null>`

Returns `null` if not found or not accessible to the caller.

```ts
const workflow = await lf.workflows.getById('550e8400-e29b-41d4-a716-446655440000')
if (workflow) {
  console.log(workflow.title, workflow.updatedAt)
}
```

**`SdkWorkflowDetail`** extends `SdkWorkflowSummary`:

| Additional field | Type | Description |
|---|---|---|
| `updatedAt` | `string` | ISO 8601 timestamp of the last update. |

---

## `lf.workflows.startRun(workflowId, inputs?, options?)`

Start a workflow run asynchronously. Returns immediately with a run ID and `pending` status. The actual execution happens on the server — use `getRunStatus` to poll or `awaitRun` to block until completion.

Calls `fn_mcp_workflow_run_start`. Requires an authenticated client.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `workflowId` | `string` | — | UUID of the workflow to run. |
| `inputs` | `Record<string, unknown>` | `{}` | Named input values passed to the first node. |
| `options.idempotencyKey` | `string` | `null` | Optional deduplication key. Submitting the same key twice returns the first run instead of creating a second one. |
| `options.modelId` | `string` | `null` | Override the model used by all nodes in this run. |

**Returns** `Promise<SdkWorkflowRun>`

```ts
const run = await lf.workflows.startRun(
  workflowId,
  { topic: 'TypeScript generics', depth: 'intermediate' },
  { idempotencyKey: `run-${Date.now()}` },
)
console.log(run.id, run.status)  // status is 'pending' immediately after start
```

**`SdkWorkflowRun`**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID of the run. Use this to poll or fetch logs. |
| `status` | `SdkWorkflowRunStatus` | Initial status — always `'pending'` on return from `startRun`. |
| `createdAt` | `string` | ISO 8601 timestamp. |

---

## `lf.workflows.getRunStatus(runId)`

Poll the current status of a workflow run. Calls `fn_mcp_workflow_run_status`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `runId` | `string` | UUID of the run (from `startRun` or `awaitRun`). |

**Returns** `Promise<SdkWorkflowRunState>`

Throws if `runId` is not found.

```ts
const state = await lf.workflows.getRunStatus(run.id)
console.log(state.status)         // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
console.log(state.activeNodeId)   // which node is currently executing, or null
console.log(state.creditsSpent)   // credits consumed so far
```

**`SdkWorkflowRunState`**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Run UUID. |
| `status` | `SdkWorkflowRunStatus` | Current lifecycle status. |
| `activeNodeId` | `string \| null` | The node currently executing. `null` when idle or finished. |
| `creditsSpent` | `number` | Cumulative credits consumed by this run. |

**`SdkWorkflowRunStatus`** values: `'pending'` → `'running'` → `'completed' | 'failed' | 'cancelled'`

---

## `lf.workflows.getRunLogs(runId)`

Fetch per-node execution logs for a **completed** run. Calls `fn_mcp_workflow_run_logs`. Calling this before the run reaches a terminal state returns partial or empty results.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `runId` | `string` | UUID of the run. |

**Returns** `Promise<SdkWorkflowRunLog[]>`

```ts
const logs = await lf.workflows.getRunLogs(run.id)
for (const log of logs) {
  console.log(`Node ${log.nodeId}: ${log.status} — ${log.durationMs}ms`)
  if (log.result) console.log('  result:', JSON.stringify(log.result).slice(0, 200))
  if (log.error) console.error('  error:', log.error)
}
```

**`SdkWorkflowRunLog`**

| Field | Type | Description |
|---|---|---|
| `nodeId` | `string` | UUID of the workflow node. |
| `status` | `string` | Node-level status: `'completed'`, `'failed'`, etc. |
| `result` | `unknown \| null` | Output produced by the node (arbitrary JSON). |
| `error` | `string \| null` | Error message if the node failed. |
| `durationMs` | `number` | Wall-clock time the node took to execute. |
| `tokenCount` | `number` | Total tokens consumed by this node (0 for non-LLM nodes). |

---

## `lf.workflows.awaitRun(workflowId, inputs?, options?)`

Start a run and **block until it reaches a terminal state**, then return the execution logs. Internally calls `startRun`, then polls `getRunStatus` every 3 seconds, and calls `getRunLogs` on success.

Use this for simple fire-and-forget execution where you want results synchronously.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `workflowId` | `string` | — | UUID of the workflow to run. |
| `inputs` | `Record<string, unknown>` | `{}` | Named inputs for the first node. |
| `options.idempotencyKey` | `string` | `null` | Optional dedup key (same as `startRun`). |
| `options.modelId` | `string` | `null` | Model override (same as `startRun`). |
| `options.timeoutMs` | `number` | `120000` | Maximum milliseconds to wait before throwing a timeout error. |

**Returns** `Promise<SdkWorkflowRunLog[]>`

Throws if:
- The run ends with status `'failed'` or `'cancelled'`.
- The timeout elapses before a terminal state is reached.

```ts
// Fire and await in one call
const logs = await lf.workflows.awaitRun(
  workflowId,
  { topic: 'AI safety' },
  { timeoutMs: 60_000 },
)

console.log(`Run completed. ${logs.length} nodes executed.`)
for (const log of logs) {
  console.log(`  ${log.nodeId}: ${log.status}  (${log.durationMs}ms)`)
}
```

::: tip When to use `startRun` vs `awaitRun`
Use `awaitRun` for simple scripts and short-lived server functions. Use `startRun` + `getRunStatus` when you need to store the `runId` in a database, display progress in a UI, or handle timeouts and retries yourself.
:::

---

## Full example — run a workflow and print results

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LF_URL!,
  anonKey: process.env.LF_ANON_KEY!,
  apiKey: process.env.LF_API_KEY!,
})

// List available workflows
const workflows = await lf.workflows.browse({ visibility: 'public' })
const target = workflows.find(w => w.title.includes('Research'))
if (!target) throw new Error('Workflow not found')

// Start and wait
try {
  const logs = await lf.workflows.awaitRun(
    target.id,
    { query: 'renewable energy storage breakthroughs 2025' },
    { timeoutMs: 90_000 },
  )
  console.log('Done!', logs.map(l => `${l.nodeId}: ${l.status}`))
} catch (err) {
  console.error('Workflow failed or timed out:', err)
}
```

---

## Related

- [Type reference — Workflow types](/en/reference/sdk/types#workflow-types)
- [SDK index](/en/reference/sdk/)
