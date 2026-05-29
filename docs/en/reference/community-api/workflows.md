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
