---
title: Execution Engine — Internals
description: Wave scheduling, retry loop, contract validation, moderation gates, and memory flush hooks inside WorkflowExecutionService.
---

# Execution Engine — Internals

This page is the internals view of the workflow execution engine. It complements [Workflow Engine Architecture](./workflow-engine-architecture.md) (the high-level model) and [Code Walk: workflow-execution.service.ts](./code-walk-workflow-execution-service.md) (the annotated tour). The diagrams below cite specific line numbers in `libs/infra/execution/src/lib/workflow-execution.service.ts` so a reader can move between this page and the source without grepping.

## Wave scheduling

The engine uses Kahn's topological sort to bucket nodes into execution waves. All nodes in a wave run concurrently via `Promise.all`. The next wave is built only when the current one settles.

The orchestration loop lives in `libs/infra/execution/src/lib/workflow-execution.service.ts:384` (`while (wave.length > 0)`). The inner concurrent dispatch is the `Promise.all` over `wave.map(async (nodeId) => …)` starting at line 393. The next-wave computation runs at `libs/infra/execution/src/lib/workflow-execution.service.ts:779` and only decrements in-degrees for edges whose `condition` evaluated truthy.

```mermaid
sequenceDiagram
    participant Engine as WorkflowExecutionService
    participant Wave as Wave (n nodes)
    participant Provider as IExecutionProvider
    participant DB as workflow_runs / node_results

    Engine->>Engine: Kahn topo sort, in-degree map
    Engine->>Wave: build wave (in-degree == 0)
    loop per wave
      par concurrently for each node
        Wave->>Provider: input merge → validateInputs
        Provider-->>Wave: NodeOutputEnvelope
        Wave->>Engine: validateOutput
      end
      Wave-->>Engine: results.set(nodeId, NodeResult)
      Engine->>DB: persist node statuses
      Engine->>Engine: build next wave (decrement deps)
    end
```

## Retry loop

Each node executes inside a per-node retry loop. The loop wraps the provider call plus the per-node timeout. A retryable cause (`timeout`, `provider_error`, `rate_limit`) plus `attempt < retryCfg.attempts` triggers a backoff and another pass. A non-retryable cause or the final attempt surfaces the failure.

The loop entry is at `libs/infra/execution/src/lib/workflow-execution.service.ts:596` (`while (attempt < retryCfg.attempts)`). The shouldRetry guard is at line 624. The backoff timer between attempts is computed by `computeBackoff` at `libs/infra/execution/src/lib/workflow-execution.service.ts:839`.

```mermaid
sequenceDiagram
    participant Loop as Retry loop (line 596)
    participant Provider as IExecutionProvider
    participant Status as onNodeStatusChange
    participant Timer as computeBackoff (line 839)

    Loop->>Provider: provider.execute()
    alt success
      Provider-->>Loop: ok envelope
    else retryable cause
      Provider-->>Loop: retryable error (timeout / provider_error / rate_limit)
      Loop->>Status: status='retrying' (line 633)
      Loop->>Timer: delay = computeBackoff(base, max, attempt)
      Timer-->>Loop: ms
      Loop->>Loop: await delay; attempt++
      Loop->>Provider: provider.execute()
    else non-retryable
      Provider-->>Loop: terminal error
      Loop->>Status: status='failed'
    end
```

## Contract validation

A node validates inputs before it dispatches and validates the output envelope before it persists. Both validators come from `libs/infra/execution/src/lib/contract-validator.ts` and are imported at `libs/infra/execution/src/lib/workflow-execution.service.ts:1`.

Input validation runs at `libs/infra/execution/src/lib/workflow-execution.service.ts:550` (`validateInputs(renderedInputs, contracts.input)`). A failure short-circuits with `status='failed'` and `error='contract_violated'`. Output validation runs at `libs/infra/execution/src/lib/workflow-execution.service.ts:714` (`validateOutput(envelope, contracts.output)`).

```mermaid
sequenceDiagram
    participant Engine as WorkflowExecutionService
    participant Validator as contract-validator
    participant Provider as IExecutionProvider

    Engine->>Validator: validateInputs(renderedInputs, contracts.input) — line 550
    alt inputs ok
      Validator-->>Engine: ok
      Engine->>Provider: dispatch
      Provider-->>Engine: envelope
      Engine->>Validator: validateOutput(envelope, contracts.output) — line 714
      alt output ok
        Validator-->>Engine: ok
      else output fails
        Validator-->>Engine: errors[]
        Engine->>Engine: status='failed', error='contract_violated'
      end
    else inputs fail
      Validator-->>Engine: errors[]
      Engine->>Engine: status='failed', error='contract_violated'
    end
```

## Moderation gates

Moderation is opt-in per node via `config.moderation`: `'off' | 'input' | 'output' | 'both'`. The default is `'off'`. The engine consults `ctx.moderation` (a `ModerationGateway`) and short-circuits the node when a phase reports `flagged`.

The moderation policy is read at `libs/infra/execution/src/lib/workflow-execution.service.ts:447`. The input gate fires at line 570 and produces `error: 'moderation_blocked'` at line 576 on a flag. The output gate fires at line 690 and produces the same error at line 698 on a flag.

```mermaid
sequenceDiagram
    participant Engine as Engine (per node)
    participant ModGate as ModerationGateway
    participant Provider as IExecutionProvider

    Engine->>Engine: read config.moderation (line 447)
    alt 'input' or 'both'
      Engine->>ModGate: check('input', resolvedPrompt) — line 570
      alt flagged
        ModGate-->>Engine: { decision: 'flagged' }
        Engine->>Engine: status='failed', error='moderation_blocked' (line 576)
      else allowed
        Engine->>Provider: dispatch
        Provider-->>Engine: envelope
        opt 'output' or 'both'
          Engine->>ModGate: check('output', envelope.output) — line 690
          alt flagged
            ModGate-->>Engine: { decision: 'flagged' }
            Engine->>Engine: status='failed', error='moderation_blocked' (line 698)
          else allowed
            Engine->>Engine: continue to validateOutput
          end
        end
      end
    else 'off'
      Engine->>Provider: dispatch
    end
```

## Memory flush hooks

The engine offers two hooks for buffered memory writes: `onNodeCompleted(nodeId, policy)` after each successful node and `onRunCompleted(status)` once the run reaches a terminal state. The shape lives at `libs/infra/execution/src/lib/workflow-execution.service.ts:233` (`MemoryFlushSink`). The two policies — `on_success` and `checkpoint` — are documented inline at lines 54–66.

`onNodeCompleted` is invoked at `libs/infra/execution/src/lib/workflow-execution.service.ts:760`. `onRunCompleted` is invoked from the helper around line 374 and only fires when a sink is registered.

```mermaid
sequenceDiagram
    participant Engine as Engine
    participant Sink as MemoryFlushSink
    participant Store as Memory store

    Note over Engine,Sink: Per node
    Engine->>Engine: node completes successfully
    alt sink registered
      Engine->>Sink: onNodeCompleted(nodeId, policy) — line 760
      alt policy === 'checkpoint'
        Sink->>Store: flush buffered entries now
      else policy === 'on_success'
        Sink->>Sink: keep buffered (run-level decision)
      end
    end
    Note over Engine,Sink: At run terminal
    Engine->>Sink: onRunCompleted(status) — line 374
    alt status === 'completed'
      Sink->>Store: flush remaining buffered entries
    else status in {failed, cancelled}
      Sink->>Sink: drop buffered entries from on_success nodes
    end
```

## Node status state machine

The status enum is defined at `libs/infra/execution/src/lib/workflow-execution.service.ts:22` and mirrored in the Postgres CHECK constraint shipped with `supabase/migrations/20260420000000_workflow_status_alignment.sql:64`. Both must change together.

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> awaiting_dependency: parent not ready
    awaiting_dependency --> queued: parent done
    pending --> queued: no parents
    queued --> running: claimed by worker
    running --> streaming: provider streams
    streaming --> running: stream collapses to single result
    running --> retrying: retryable cause + attempts left
    retrying --> running: backoff complete
    running --> completed: ok envelope + contract ok
    running --> failed: contract violation / non-retryable error / moderation_blocked
    running --> timed_out: per-node timeout exceeded
    running --> cancelled: run cancelled by caller
    running --> blocked: approval gate hit
    [*] --> skipped: parent edge condition false
    [*] --> invalidated: dependent of an invalidated upstream
    completed --> [*]
    failed --> [*]
    cancelled --> [*]
    skipped --> [*]
    timed_out --> [*]
    blocked --> [*]
    invalidated --> [*]
```

## Related

- [Workflow Engine Architecture](./workflow-engine-architecture.md) — high-level model and rationale.
- [Code Walk: workflow-execution.service.ts](./code-walk-workflow-execution-service.md) — annotated tour of the same file.
- [Workflow status migration](../../../supabase/migrations/20260420000000_workflow_status_alignment.sql) — Postgres CHECK constraints that mirror the engine state machine.
