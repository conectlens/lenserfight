---
title: Build a Lens Chain
description: Connect multiple lenses into a single workflow that passes structured outputs through contracts, fans out, and merges cleanly.
---

# Build a Lens Chain

> **Prerequisites:** skim [Open Source Workflows](../../explanation/workflows/open-source-workflows.md).
> This guide assumes you have ≥ 2 published lenses and a workspace you can edit.

A **lens chain** is a workflow DAG where each node's `NodeOutputEnvelope` becomes input for downstream nodes. Done well, chains are:

- **Deterministic** — each node's contract fully describes what it consumes and produces.
- **Parallel-safe** — independent branches can run concurrently without sharing mutable state.
- **Resumable** — idempotent, observable, and traceable via `execution.vw_workflow_run_timeline`.

This how-to walks through the canonical **Intent → Plan → Research → Generate → Refine → Validate → Export** chain that ships as a seeded template.

---

## 1. Pick a backbone

The recommended 7-stage backbone, with recommended kinds:

| # | Stage | Kind | Responsibility |
|---|-------|------|----------------|
| 1 | Intent | `routing` | Normalise the user's request into a machine-readable brief. |
| 2 | Plan | `orchestration` | Decompose the brief into ordered sub-goals + required kinds. |
| 3 | Research | `research` | Retrieve + synthesise grounding evidence. |
| 4 | Generate | `text` / `image` / `video` | Produce the primary artifact. |
| 5 | Refine | `transform` | Apply style, tone, and structural corrections. |
| 6 | Validate | `validation` | Enforce contract + quality gates. |
| 7 | Export | `pdf` / custom | Serialise to final delivery format. |

You do not need all seven for every workflow — skip stages whose work is trivial. But keep them in order: Intent before Plan, Validate before Export.

## 2. Encode each contract

For every node, decide what enters and what leaves. Both are declared on the lens **version** via `input_contract` and `output_contract` (JSONB). See [Contract Schema Reference](../../reference/workflows/contract-schema.md).

Example — the Research lens output contract:

```json
{
  "kind": "research",
  "artifactKind": "text",
  "schema": {
    "findings":       { "type": "array", "itemType": "json", "required": true },
    "summary":        { "type": "string", "required": true, "minLength": 40 },
    "open_questions": { "type": "array", "itemType": "string" }
  },
  "tokens": ["output", "findings", "summary"]
}
```

The `tokens` array exposes additional pass-through keys so downstream nodes can reference `[[summary]]` or `[[findings]]` directly instead of destructuring `[[output]]` JSON.

## 3. Wire the edges

An edge connects a source node's output token to a target node's input param label:

| Field | Purpose |
|-------|---------|
| `source_node_id` | Upstream node (where the output came from) |
| `target_node_id` | Downstream node (where the value is injected) |
| `source_output_key` | Which token on the envelope to read (defaults to `output`) |
| `target_param_label` | Which `[[label]]` placeholder to fill on the target |
| `merge_strategy` | `last_write_wins` \| `concat` \| `array` \| `json_object` (only when multiple edges share a `target_param_label`) |
| `condition` | Optional JSONB predicate; when it returns false the edge is skipped |

### Example: fan-out Plan → { Research, StyleBrief } → Refine

```text
Intent → Plan ──┬─► Research ──┐
                └─► StyleBrief ┼─► Refine → Validate → Export
```

1. `Plan` returns `{ subgoals: string[], styleHint: string }`.
2. Edge `Plan.subgoals → Research.brief` (`source_output_key = 'subgoals'`, `target_param_label = 'brief'`).
3. Edge `Plan.styleHint → StyleBrief.hint`.
4. Two edges converge on `Refine.context`, one from `Research.output` and one from `StyleBrief.output`, both tagged `merge_strategy = 'json_object'`. The engine now hands `Refine` a dict `{ research: ..., styleBrief: ... }`.

## 4. Mark branches parallel-safe

A branch is parallel-safe when **all** of:

- Its inputs are derived only from nodes that have **already completed** when the wave starts.
- It does not write to any shared resource used by a sibling branch.
- Its failure policy is either `propagate` (default) or `skip` — never `substitute_default` referencing a sibling.

The scheduler computes waves via Kahn's topological sort: every node whose in-degree is zero starts in parallel. Your job is to model the graph so dependencies are explicit.

## 5. Configure per-node resilience

On each node's `config` JSONB:

```jsonc
{
  "timeoutMs": 60000,
  "retry": {
    "attempts": 3,
    "backoffMs": 500,
    "retryableCauses": ["timeout", "provider_error", "rate_limit"]
  },
  "onParentFailure": "skip",   // or "propagate" | "substitute_default"
  "moderation": "both"         // "off" | "input" | "output" | "both"
}
```

Defaults come from the execution engine — override only when the kind truly demands it. Avoid pushing `attempts` above `5`; at that point the upstream failure mode is the real fix.

## 6. Add validation gates

A `kind:validation` node before Export catches contract drift early. Its envelope should expose `{ valid: boolean, issues: string[] }` so you can attach a **conditional edge** that only runs Export when `valid === true`:

```jsonc
{
  "type": "equals",
  "path": "data.valid",
  "value": true
}
```

See [Test Plan §6](../../reference/workflows/test-plan.md#6-conditional-edges-unit) for the supported condition shapes.

## 7. Seed or save

Two ways to ship a chain:

- **Save** via `CreateWorkflowWizard` — creates rows in `lenses.workflows` + `lenses.workflow_nodes` + `lenses.workflow_edges` owned by your lenser.
- **Seed** via [`supabase/seeds/40_lens_chain_templates.sql`](../../../supabase/seeds/40_lens_chain_templates.sql) — use this for reusable starter chains. Tag the workflow with `template` so it shows up in the "Start from template" strip on `/workflows`.

## 8. Verify end-to-end

```bash
pnpm supabase:combine-seeds && pnpm supabase:db:reset
npx nx eslint:lint feature-workflows infra-execution
npx nx test infra-execution
```

Then run the chain through the builder with BYOK keys. Check that:

1. Every node reaches `completed`.
2. `execution.vw_workflow_run_timeline` shows interleaved `node_started` / `node_completed` events proving your parallel branches ran concurrently.
3. The Export artifact appears in `media.objects` and survives a page refresh (see [Phase 5 persistence](../../reference/workflows/execution-engine.md#pdf-artifacts)).

---

## Common pitfalls

- ❌ **Ambiguous prose between nodes.** If a downstream node needs a list, emit an array in `envelope.data`, not a bulleted string.
- ❌ **Implicit dependencies.** If node C truly depends on both A and B, add both edges — don't rely on execution order.
- ❌ **Silent merges.** Never rely on `last_write_wins` when both parents provide meaningfully different data — pick `json_object` or `array` explicitly.
- ❌ **No validation step.** Without a `kind:validation` gate, Export failures manifest as mysterious downstream 500s instead of actionable contract violations.

## Related

- [Create a Lens Kind](./create-a-lens-kind.md)
- [Contract Schema Reference](../../reference/workflows/contract-schema.md)
- [Execution Engine Reference](../../reference/workflows/execution-engine.md)
- [Workflow Test Plan](../../reference/workflows/test-plan.md)
