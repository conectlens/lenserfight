# Open Source Workflows — Test Plan

> **Status:** authoritative since v0.7 (Phase 6, 2026-04-17).
> **Audience:** engineers adding/changing `WorkflowExecutionService`, lens kinds,
> template seeds, or workflow RPCs.
> **Scope:** behavioural matrix that *any* workflow runtime (browser hook,
> CF Worker, future server executor) must satisfy.

This document enumerates the scenarios every implementation of the workflow
execution engine MUST cover before a release. Each row names:

1. A **scenario** — the observable behaviour being tested.
2. The **layer** where the test lives (`unit`, `contract`, `integration`,
   `e2e`).
3. The **acceptance criteria** (what "passes" looks like).
4. The **fixtures** or seed data the test depends on.

When adding a new lens kind, fan-in strategy, fail-propagation mode, or
moderation policy, append a new row — do not retrofit an existing one.

---

## 1. Scheduler Correctness (`unit`)

| # | Scenario | Acceptance |
|---|---|---|
| 1.1 | Linear chain (A → B → C) executes in topological order | `executeWorkflow` emits `node_completed` in A, B, C order; `results[i].attempts === 1`. |
| 1.2 | Diamond (A → B, A → C, B → D, C → D) runs B and C in parallel | With a 50ms-latency provider, D's `started_at - A.completed_at ≤ B.duration + C.duration / 2 + slack`. |
| 1.3 | Cycle is rejected | Engine throws `WorkflowCycleError` before any node runs. |
| 1.4 | Disconnected nodes are executed | Two independent roots both complete; edge set is empty. |
| 1.5 | Cancellation mid-wave marks outstanding nodes `cancelled` | `ctx.signal.abort()` between waves → `nodeResults[next].status === 'cancelled'`. |

## 2. Input / Output Contracts (`contract`)

| # | Scenario | Acceptance |
|---|---|---|
| 2.1 | Missing required input fails fast (no provider call) | Node status = `failed`, `error = 'input_contract_violation'`, provider mock called **0** times. |
| 2.2 | Wrong type input (e.g. `string` for `number`) fails fast | Same as 2.1, errors list includes the field name. |
| 2.3 | Output envelope missing `data.foo` when contract requires it → `failed` | `error = 'output_contract_violation'`, `outputData.contractErrors[0].field === 'foo'`. |
| 2.4 | Unknown fields in output are allowed (schema is additive) | Node status = `completed`. |
| 2.5 | `fn_get_version_contracts` resolves inherited contract from `kind:*` tag when `output_contract` is NULL | Resolved contract defaults to the kind's canonical shape. |

## 3. Fan-In Merge Strategies (`unit`)

| # | Strategy | Two-parent output | Merged value |
|---|---|---|---|
| 3.1 | `last_write_wins` (default) | `"A"`, `"B"` | `"B"` |
| 3.2 | `concat` | `"A"`, `"B"` | `"A\nB"` |
| 3.3 | `array` | `"A"`, `"B"` | `["A", "B"]` |
| 3.4 | `json_object` (keyed by `sourceOutputKey`) | `{x:1}`, `{y:2}` | `{x:1, y:2}` |

## 4. Fail Propagation Policies (`unit`)

| # | Policy on C (child of B that failed) | Expected C status |
|---|---|---|
| 4.1 | `propagate` (default) | `failed`, `error = 'upstream_failure'` |
| 4.2 | `skip` | `skipped` (distinct from `cancelled`) |
| 4.3 | `substitute_default` | `completed` with `envelope = node.config.defaultEnvelope` |

## 5. Retry + Timeout (`unit`)

| # | Scenario | Acceptance |
|---|---|---|
| 5.1 | Provider throws `provider_error` twice, succeeds on 3rd; `retry.attempts = 3`, `backoff = 10ms` | `attempts === 3`, `status === 'completed'`. |
| 5.2 | Provider exceeds `timeoutMs = 50ms` | Node fails with `timeout`; AbortSignal on the provider is aborted. |
| 5.3 | `retry.retryableCauses = ['timeout']`, error cause = `contract_violated` → no retry | `attempts === 1`, status `failed`. |
| 5.4 | Global `ctx.signal` aborts during retry sleep | Node finalises as `cancelled`, **not** retried further. |

## 6. Conditional Edges (`unit`)

| # | Condition on edge B → C | B output | C executes? |
|---|---|---|---|
| 6.1 | `{ type: 'truthy' }` | `""` | no (skipped) |
| 6.2 | `{ type: 'equals', value: 'ship' }` | `"ship"` | yes |
| 6.3 | `{ type: 'contains', value: 'error' }` | `"no errors"` | **yes** (`contains` is substring) |
| 6.4 | `{ type: 'present' }` on a node that errored | B skipped → edge not traversed → C skipped. |

## 7. Idempotency (`integration`)

| # | Scenario | Acceptance |
|---|---|---|
| 7.1 | `fn_start_workflow_run(... p_idempotency_key := 'k1')` called twice with same inputs | Second call returns the **same** `run_id`; no duplicate `workflow_node_results`. |
| 7.2 | Same key but different `p_inputs` | Second call raises `conflicting_idempotency_key`. |
| 7.3 | Retry after 24h (expired) | New run_id is issued. |

## 8. Moderation (`integration`)

| # | Scenario | Acceptance |
|---|---|---|
| 8.1 | Pre-call moderation blocks with `category: 'violence'` | Provider not called; node status = `failed`, `error = 'moderation_blocked'`, `outputData.moderation.reasons` populated. |
| 8.2 | Post-call moderation flags output | Node status = `failed`, artifact is NOT persisted to `media.objects`. |
| 8.3 | `config.moderation = 'off'` on the node | Gateway skipped even when global `enableModeration = true`. |

## 9. Streaming (`integration`)

| # | Scenario | Acceptance |
|---|---|---|
| 9.1 | `IStreamingExecutionProvider.stream()` emits 3 chunks then `done` | `PartialOutputSink.onChunk` called 3 times; `workflow_node_results.output_data.partial` reflects the last chunk. |
| 9.2 | Stream aborts via `signal` | Final node status = `cancelled`, no `done` chunk recorded. |

## 10. Kind-Specific Providers (`integration`)

| # | Lens Kind | Scenario | Acceptance |
|---|---|---|---|
| 10.1 | `kind:text` | OpenAI + Anthropic + Google with BYOK | All three return envelopes with `artifactKind = 'text'`. |
| 10.2 | `kind:image` | FalAI local BYOK returns blob URL | `envelope.media.url.startsWith('blob:')`, `persistNodeMediaArtifact` uploads to `media.objects`. |
| 10.3 | `kind:video` | FalAI local BYOK | Same as 10.2 with `mediaType='video'`. |
| 10.4 | `kind:research` | `ResearchProvider` with stubbed retrieval backend | Envelope `data.findings` is an array of `{claim, source}` objects; `data.summary` is non-empty. |
| 10.5 | `kind:pdf` | `PdfExportProvider` with 3-section manifest | Envelope `media.mime === 'application/pdf'`, `media.bytes > 0`, blob URL resolvable, resulting PDF has ≥ 3 pages. |
| 10.6 | `kind:routing` | Router lens picks branch B over C based on inputs | Only B's subgraph runs; C's nodes end `skipped`. |
| 10.7 | `kind:orchestration` | Planning lens emits a JSON plan that a downstream transform consumes | No contract violations; plan fields propagate. |
| 10.8 | `kind:validation` | Validation lens on malformed input returns `valid: false` | Downstream node sees `envelope.data.valid === false` and can branch via conditional edge (6.x). |

## 11. Observability (`integration`)

| # | Scenario | Acceptance |
|---|---|---|
| 11.1 | `execution.vw_workflow_run_timeline` for a 3-node run | Returns 2 (run_started/completed) + 2*3 (node_started/completed) = 8 rows. |
| 11.2 | `fn_tag_workflow_run` by non-owner | Raises `insufficient_privilege`. |
| 11.3 | `partial_success` tag is written when any node failed but engine completed | `workflow_run_tags` has one row with `tag='partial_success'`. |
| 11.4 | `high_token_usage` tag fires when `sum(output_tokens) > threshold` | Tag written with `severity='warn'`. |

## 12. Template Workflows (`e2e`)

| # | Scenario | Acceptance |
|---|---|---|
| 12.1 | `WorkflowsPage` renders "Start from template" strip | `useTemplateWorkflows()` returns ≥ 4 items after seeding. |
| 12.2 | Clicking a template forks into the caller's workspace | `useForkWorkflow` resolves with new run-editable workflow; original is read-only. |
| 12.3 | Forked 7-stage chain executes end-to-end with BYOK | All 7 nodes reach `completed`; final PDF artifact is uploaded to `media.objects`. |

---

## Fixtures

Shared test fixtures live under `lenserfight-web/libs/infra/execution/src/lib/__fixtures__/`:

- `provider.mock.ts` — scriptable `IExecutionProvider` (returns queued outputs or throws queued errors).
- `moderation.mock.ts` — scriptable `ModerationGateway`.
- `dag.samples.ts` — pre-built `WorkflowNode` + `WorkflowEdge` arrays for sections 1, 3, 4, 6.
- `contracts.samples.ts` — representative `LensInputContract` / `LensOutputContract` pairs for section 2.

## Running the Matrix

```bash
# Unit / contract suites
npx nx test infra-execution

# Integration suites (requires a running Supabase instance)
npx nx test feature-workflows --testNamePattern='execution'

# E2E template smoke test (Playwright)
pnpm -F lenserfight-web e2e --grep @workflows-templates
```

Any new scenario MUST be added to this file in the same commit as the
implementation. Reviewers reject PRs that ship engine changes without the
corresponding row.
