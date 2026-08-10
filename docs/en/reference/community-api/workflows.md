---
title: Workflows API
description: Community Edition workflow listing, bootstrap, execution, events, and versioning contracts.
---

# Workflows API

Workflows are DAGs of lens nodes connected by edges. Community Edition documents them through repository-backed interfaces, workflow RPCs, workflow event types, and the execution engine reference.

## Primary database surfaces

- `lenses.workflows`
- `lenses.workflow_nodes`
- `lenses.workflow_edges`
- `lenses.workflow_runs`
- `lenses.workflow_node_results`
- `lenses.workflow_run_events`
- `vw_workflows`

## Canonical types

From [`workflowsRepository.ts`](../../../libs/data/repositories/src/lib/repositories/workflowsRepository.ts):

- `WorkflowRecord`
- `WorkflowNodeRecord`
- `WorkflowEdgeRecord`
- `CreateWorkflowInput`
- `UpdateWorkflowInput`
- `UpsertNodeInput`
- `UpsertEdgeInput`
- `WorkflowVersionRecord`
- `WorkflowRunRecord`
- `WorkflowNodeResultRecord`
- `WorkflowRunEventRecord`
- `WorkflowsListFilter`

From [`workflow-events.types.ts`](../../../libs/types/src/lib/workflow-events.types.ts):

- `WorkflowSseEventEnvelope`
- `WorkflowEventType`
- `WorkflowRunStatus`
- `WorkflowNodeStatus`

## Supported flows

Community Edition currently supports:

- my workflows listing
- popular workflows listing
- template workflows
- workflow detail
- workflow bootstrap for builder load
- create, update, fork
- node and edge upsert/delete
- run start
- run detail and node results
- run event append/list
- workflow version list/create/publish/restore

## Existing workflow RPCs

| RPC | Purpose |
|-----|---------|
| `fn_get_my_workflows` | owner listing with filters |
| `fn_workflows_get_popular` | public popular workflows |
| `fn_list_template_workflows` | public template strip |
| `fn_workflow_get_detail` | workflow detail record |
| `fn_workflow_get_bootstrap` | workflow + nodes + edges |
| `fn_workflow_get_nodes` | nodes only |
| `fn_workflow_get_edges` | edges only |
| `fn_workflow_create` | create workflow |
| `fn_update_workflow` | update workflow metadata |
| `fn_clone_workflow` | fork workflow |
| `fn_upsert_workflow_nodes` | insert/update nodes |
| `fn_upsert_workflow_edges` | insert/update edges |
| `fn_delete_workflow_node` | delete node |
| `fn_delete_workflow_edge` | delete edge |
| `fn_start_workflow_run` | create or reuse run |
| `fn_workflow_get_run` | run record |
| `fn_workflow_get_node_results` | node result list |
| `fn_update_workflow_node_result` | node result status/output |
| `fn_update_workflow_run_status` | run status |
| `fn_append_workflow_run_event` | append event for timeline/SSE replay |
| `fn_list_workflow_run_events` | event replay |
| `fn_tag_workflow_run` | owner/service tagging |
| `fn_workflow_get_versions` | version list |
| `fn_workflow_create_version` | create version snapshot |
| `fn_publish_workflow_version` | publish version |
| `fn_restore_workflow_version` | restore version |

## Typical list filter

`WorkflowsListFilter` currently supports:

```ts
type WorkflowsListFilter = {
  visibility?: 'public' | 'private' | 'unlisted'
  sort?: 'updated_at' | 'created_at' | 'battle_count'
  search?: string
}
```

## Example read flows

### My workflows

```ts
await workflowsService.listByLenserPaginated(lenserId, 0, 20, {
  visibility: 'private',
  sort: 'updated_at',
  search: 'research',
})
```

### Popular workflows

```ts
await workflowsService.getPopular(0, 12, 'summary')
```

### Builder bootstrap

```ts
await workflowsService.getBootstrap(workflowId)
```

## Starting a run

Workflow runs are started through `fn_start_workflow_run`.

The client-side `useWorkflowRun` hook derives an idempotency key from `workflowId` and canonicalized root inputs so duplicate submissions reuse the same run where supported.

### Who triggers a run vs. who executes it

These are two independent axes on `lenses.workflow_runs`.

`trigger_mode` records what caused the run:

| Value | Cause |
|-------|-------|
| `manual` | a person started it (web builder, CLI) |
| `schedule` | a cron schedule or an event trigger |
| `api` | a headless caller: MCP tool or inbound webhook |
| `subflow` | a parent workflow or agent team run |

`executor` records what runs it, and is the only field any claimer inspects:

| Value | Runs on | Durability |
|-------|---------|------------|
| `worker` (default) | the background worker | survives a closed browser tab; recovered by the stale-run loop if a worker dies |
| `client` | the browser tab that started it | must heartbeat via `fn_heartbeat_client_workflow_run`; retired by the reaper if the tab goes away |

`client` is reserved for runs whose credentials the server cannot reach — BYOK
funding sources, where the API key is held in the browser. Everything else
defaults to `worker`, so a run does not depend on a tab staying open.

Pass `p_executor` to choose explicitly. Runs are refused while the system kill
switch is active.

### Durability guarantees

- A `worker` run left non-terminal with a stale heartbeat is adopted by the
  recovery loop and resumed, skipping nodes that already completed.
- A `client` run whose tab stops heartbeating is failed by
  `fn_reap_abandoned_workflow_runs`, along with its non-terminal node results,
  with the reason recorded in `metadata.reaped_reason`.
- Reopening `/workflows/:id/run/:runId` reattaches to an in-flight run.

## Explicit beta limitations

- Browser execution only supports a limited provider set.
  See [`useWorkflowExecution.ts`](../../../libs/features/workflows/src/lib/hooks/useWorkflowExecution.ts).
- Cloud BYOK workflow execution is platform-executor dependent and not a self-host guarantee.
- SSE/event replay is best-effort and reconnect-aware, but the docs must not claim it is fully production-hardened yet.
- Workflow versioning exists, but the overall workflow product is still incomplete.
- Recovery, stale-run claiming, and scale hardening are in progress through the 2026 workflow migrations.

## Auth and access

| Operation | Auth |
|-----------|------|
| public detail/template/popular reads | `anon` where the workflow is public |
| personal workflows | owner-only |
| create/update/fork | `authenticated`, usually owner-scoped |
| run mutation and event append | authenticated or service-backed depending on call site |

## Related

- [Workflow Execution Engine](/en/reference/workflows/execution-engine)
- [Contract Schema](/en/reference/workflows/contract-schema)
- [Providers and Execution](./providers-and-execution.md)
