---
title: Workflow Engine Architecture
description: How LenserFight executes, schedules, and recovers DAG-based workflows.
outline: deep
---

# Workflow Engine Architecture

## DAG Execution Model

Every workflow is a directed acyclic graph (DAG). Nodes represent discrete units of work; edges encode execution order and data dependencies. `WorkflowExecutionService` (`libs/infra/execution/src/lib/workflow-execution.service.ts`) is the central orchestrator — it resolves the traversal order, fans out to execution providers, and aggregates status.

Edges carry optional `condition` predicates. When a condition evaluates to `false`, the downstream node transitions to `skipped` rather than `pending`.

## Data flow and `source_output_key`

Bindings merge upstream `output_data` / envelope fields into the target lens template labels. `source_output_key` supports **dotted paths** into structured outputs (for example `data.summary` on a research node). Resolution is shared with the prompt resolver via `resolveMappedOutputValue` in `libs/infra/execution/src/lib/output-path.ts`.

When a rendered label value looks like an **image URL**, the engine attaches it as a vision `ExecutionInput.attachments` entry so text providers that support multimodal messages can consume upstream image nodes without ad-hoc string hacks.

## Per-node providers (mixed DAGs)

`WorkflowExecutionContext.resolveExecutionProvider` selects an `IExecutionProvider` **per node** (for example Claude for research, Fal for `fal-ai/...` image models). The browser hook caches providers by model key; the scheduled worker resolves from `workflow_nodes.config.model_id` with the same mechanism. If the hook is omitted, the service falls back to the single provider passed to `new WorkflowExecutionService(provider)`.

## Node Status State Machine

```
pending → running → completed
                 → failed
                 → skipped
```

- **pending** — node is queued; upstream deps not yet resolved.
- **running** — node has been claimed by the engine.
- **completed** — execution resolved without error.
- **failed** — execution threw or returned an error result; eligible for retry.
- **skipped** — upstream condition was false; treated as a no-op terminal.

## Execution Provider Registry

Node type → implementation is resolved at runtime via `getExecutionProvider()` from `libs/infra/execution/src/lib/execution.registry.ts`. Each provider implements `IExecutionProvider` and is registered once at bootstrap. Unknown node types cause an immediate `failed` transition with a registry-miss error.

## `onNodeStatusChange` Contract

The orchestrator emits progress events through this callback on every state transition:

```ts
type NodeStatusChange = {
  nodeId: string
  status: NodeStatus
  error?: string
  attemptNumber: number
}

onNodeStatusChange: (change: NodeStatusChange) => void
```

Consumers use this to stream progress to the UI or persist audit trails into `lenses.workflow_run_events`.

## Retry Policy

Retry behaviour is declared per node in `NodeRuntime` (`libs/infra/execution/src/lib/node-runtime.ts`):

```ts
interface RetryPolicy {
  maxRetries: number   // 0 = no retry
  backoffMs:  number   // flat delay between attempts
}
```

:::warning
There is no exponential backoff by default. If a node hits a rate-limited external API, set `backoffMs` conservatively or implement jitter inside the provider.
:::

## `fn_dispatch_scheduled_workflows_with_approval` — Critical Path

Invoked by `pg_cron` every minute. Execution order inside the dispatch loop:

1. **Kill switch** — reads `platform.system_flags.autonomy_dispatch_enabled`; aborts immediately if `false`.
2. **Budget check** — checks `agents.quota_snapshots.credits_spent` vs `agents.policies.spending_limit_credits`; sets `last_dispatch_status = 'budget_exceeded'` and skips if exceeded.
3. **Cycle check** — calls `lenses.fn_workflow_has_cycle()`; sets `last_dispatch_status = 'validation_failed'` if cyclic.
4. **Overlap check** — ensures no in-flight run exists for the same schedule.
5. **Dispatch** — inserts `lenses.workflow_runs` + `lenses.workflow_node_results`, optionally a `agents.team_runs` row with approval gate.

:::tip
Steps 1–4 are guard clauses that leave no partial state. A schedule either fully dispatches or produces a structured rejection in `last_dispatch_status`.
:::

## Worker Loop

`apps/platform-api/src/worker/scheduled-workflow-worker.ts` follows a claim → execute → complete cycle:

1. **Claim** — calls `fn_claim_scheduled_workflow_run`; receives an exclusive run ID or `null` if nothing is ready.
2. **Execute** — calls `WorkflowExecutionService.execute()` with the claimed run's context and node graph.
3. **Complete** — calls `fn_complete_scheduled_workflow_run` with final status and output.

The worker polls at a configurable interval (`WORKER_POLL_INTERVAL_MS`) and exits cleanly on `SIGTERM`.

## Dead-Letter / Error Handling

Unhandled throws inside the worker are caught at the top level. The worker calls `fn_complete_scheduled_workflow_run` with `status: 'failed'` and the serialised error message. The run lands in the `failed` partition of `lenses.workflow_runs`, queryable for ops triage.

:::warning
A crashed worker process (OOM, SIGKILL) leaves the run in `running`. A background cleanup job reaps stale `running` rows older than the configured run timeout and marks them `failed`.
:::
