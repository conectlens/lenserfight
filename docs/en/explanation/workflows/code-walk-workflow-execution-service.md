---
title: "Code Walk: workflow-execution.service.ts"
description: An annotated tour of libs/infra/execution/src/lib/workflow-execution.service.ts. Section-by-section, with real line numbers.
---

# Code Walk: `workflow-execution.service.ts`

This page walks through `libs/infra/execution/src/lib/workflow-execution.service.ts` top-to-bottom. Sections are ordered the way the file is laid out so you can read the file alongside this page. For sequence diagrams of the same logic, see [Execution Engine — Internals](./execution-engine-internals.md).

## 1. Public types — lines 20–120

The first ~100 lines of the file are the public type surface. Everything downstream of the engine consumes these types.

- `NodeStatus` (line 22) — every state a node can be in. Mirrors the Postgres CHECK constraint in `supabase/migrations/20260420000000_workflow_status_alignment.sql:64`.
- `MergeStrategy` (line 37), `OnParentFailurePolicy` (line 39), `RetryCause` (line 41) — narrow union types that show up on per-node config.
- `RetryConfig` (line 43) and `ModerationConfig` (line 50) — per-node config slots, both optional.
- `MemoryWritePolicy` (line 67) — `'on_success'` (default, drop-on-failure) or `'checkpoint'` (per-node durability). The doc comment at lines 54–66 is the canonical explanation; copy it into any user-facing memory doc rather than restating.
- `WorkflowNodeConfig` (line 69), `WorkflowNode` (line 79), `WorkflowEdge` (line 89), `EdgeCondition` (line 100), `NodeResult` (line 106) — the engine's input shapes.

## 2. Engine context and event surface — lines 121–235

This section defines what the engine emits and what callers must supply.

- `WorkflowRunResult` (line 121) — the value returned by `executeWorkflow`.
- `EngineEventName` (line 127) — every event the engine can publish. The status enum at line 22 and this list at 127 must stay in sync; a new node status that doesn't have an event is invisible to consumers.
- `WaitingReason` (line 148) — populated on `awaiting_dependency`, `queued`, and `retrying` results so the run-state projection can explain *why* a node is paused.
- `WorkflowExecutionContext` (line 180) — the per-run input bag the caller hands to the engine. The `moderation` slot at line 201 is optional and omitted by default.
- `MemoryFlushSink` (line 233) — the two-method hook for memory persistence. Implementations live in `libs/data/repositories/`.

## 3. Defaults — lines 238–250

A short block of `const` defaults the engine falls back to when the per-node config does not pin a value:

- `DEFAULT_RETRY` (line 240) — 3 attempts, 250 ms base backoff, retry on `timeout`, `provider_error`, `rate_limit`. Notably does **not** include `contract_violated` — contract violations are non-retryable on purpose.
- `DEFAULT_TIMEOUT_MS = 60_000` (line 247).
- `DEFAULT_ON_PARENT_FAILURE = 'skip'` (line 248).
- `DEFAULT_MODERATION = 'off'` (line 250) — moderation is opt-in.

## 4. `executeWorkflow` entry point — lines 267–290

`WorkflowExecutionService` (line 267) is a stateless façade. The class exists to give the engine a stable identity for DI; the work is in the methods, not in instance state.

`executeWorkflow(input, ctx)` (line 287) is the only public method. It takes the workflow definition (nodes + edges) plus a `WorkflowExecutionContext` and returns a `WorkflowRunResult`. Everything from the wave loop to the run-terminal hook is invoked from this method.

## 5. Wave loop — lines 380–795

The body of `executeWorkflow` is the wave loop. Read it as: build initial wave, run the wave concurrently, build next wave, repeat until empty.

- The initial wave is the set of nodes with in-degree zero (line 382).
- `while (wave.length > 0)` at line 384 is the outer loop.
- The concurrent dispatch is `Promise.all(wave.map(async (nodeId) => …))` starting at line 393.
- The next-wave build at line 779 only decrements in-degrees for edges whose `condition` evaluated truthy. Skipped edges keep dependents in `awaiting_dependency`.

## 6. Per-node lifecycle inside the wave — lines 405–795

For each node in a wave, the engine runs the same ordered pipeline. The section comments inside the file mark the boundaries:

1. **Parent-failure gate** (line 405) — applies `OnParentFailurePolicy`. A `skip` short-circuits to `status='skipped'`; `propagate` causes the node to fail; `substitute_default` substitutes the contract's default value and continues.
2. **Input contract validation** (line 549) — runs `validateInputs` from `contract-validator`. A failure short-circuits to `status='failed'`, `error='contract_violated'`.
3. **Input moderation** (line 569) — only fires when `config.moderation` is `'input'` or `'both'`. Flagged inputs short-circuit to `error='moderation_blocked'`.
4. **Provider call with retry + timeout** (line 591) — the inner retry loop at line 596 wraps the provider call. `computeBackoff` at line 839 sets the inter-attempt delay.
5. **Output moderation** (line 687) — symmetric to input moderation. Only fires when `config.moderation` is `'output'` or `'both'`.
6. **Output contract validation** (line 713) — runs `validateOutput`. A failure short-circuits with `error='contract_violated'`.
7. **Success** (line 741) — persists the envelope, calls `onNodeCompleted` if a `MemoryFlushSink` is registered (line 760), and emits the success event.

## 7. Helpers — lines 797–end

Below line 797 is utility code that the wave loop calls but readers rarely need to dive into:

- `safeStringify` / `errorMessage` (lines 799, 809) — defensive serialization for log lines.
- `isAbortError`, `isTimeoutError`, `isRateLimitError` (lines 813, 822, 828) — error-class detectors that map raw errors to `RetryCause`.
- `computeBackoff` (line 839) — exponential backoff with jitter, capped at `maxBackoffMs`.
- `createLinkedController` (line 917) — wires per-node abort signals to the run-level controller so cancelling a run cancels in-flight provider calls.
- `toEnvelope` / `envelopeToExecutionResult` / `envelopeToOutputData` (lines 941, 977, 994) — provider response normalization.
- `resolveRenderedInputs` (line 1015), `applyMerge` (line 1072), `isEdgeConditionSatisfied` (line 1091) — the input merge pipeline.
- `renderPrompt` (line 1136) — `[[label]]` parameter substitution. Optional labels are detected by `isLabelOptional` at line 1159.
- `collectParentStatuses` (line 1171) — used by the parent-failure gate.
- `finish` (line 1208) — the run-terminal helper that calls `onRunCompleted` and assembles the `WorkflowRunResult`.

## When to skim this file vs. read it

Skim it when:

- You're touching memory hooks or run-terminal behavior — read sections 1, 2, 6, 7.
- You're adding a new `RetryCause` — touch sections 1, 6.4 (line 624 `shouldRetry`).
- You're adding a new node `status` — touch line 22 here, the migration at `supabase/migrations/20260420000000_workflow_status_alignment.sql:64`, and the `EngineEventName` list at line 127.

Read it end-to-end when you are debugging an "impossible" wave-ordering bug — the answer is almost always in the parent-failure gate (section 6.1) or the next-wave build (section 5).

## Related

- [Execution Engine — Internals](./execution-engine-internals.md) — sequence diagrams for the same logic.
- [Workflow Engine Architecture](./workflow-engine-architecture.md) — high-level model.
- [Workflow status migration](../../../supabase/migrations/20260420000000_workflow_status_alignment.sql) — the Postgres CHECK constraints that mirror `NodeStatus`.
