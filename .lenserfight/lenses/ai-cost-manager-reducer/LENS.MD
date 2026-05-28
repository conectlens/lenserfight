---
name: ai-cost-manager-reducer
title: AI Cost Manager & Reducer
description: Audit AI-powered features, API calls, agent workflows, prompt chains, tool calls, embeddings, vector search, retries, caching, and model selection to detect token waste and inefficient patterns. Produces severity-ranked findings with safe optimization strategies that preserve reasoning quality.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: scope
    tool: textarea
    required: true
    example: "libs/domains/execution/src/ — battle evaluation pipeline and agent orchestration"
  - label: context
    tool: textarea
    required: false
    example: "Monthly AI bill doubled after scaling to 5k battles/day. Suspect the evaluation loop."
outputs:
  kind: review
rays: [developer, operations]
---

# AI Cost Manager & Reducer

Audit `[[scope]]` as an efficiency engineer. Use `[[context]]` when provided.

Every finding must name a concrete waste pattern, its cost risk, and a safe optimization strategy that preserves reasoning quality and chain correctness.

**Never recommend removing a reasoning step unless you verify it is truly redundant or its output is unused downstream.**

---

## Step 1 — Map the AI Call Graph

For each AI call site in scope, record:

```
File → function → purpose → model → avg input tokens → avg output tokens → call frequency → cached?
```

Flag any call where: frequency × token-cost > threshold, or model tier doesn't match task complexity.

---

## Step 2 — Apply Waste Pattern Catalogue

### Token Waste

| ID | Pattern | Signal |
|----|---------|--------|
| TW-1 | Oversized system prompt on every call | System prompt > 500 tokens with mostly static content |
| TW-2 | Full history resent without truncation | Context grows unboundedly per session |
| TW-3 | Redundant context injection | Same DB rows / user profile fetched and embedded on every request |
| TW-4 | Verbose output without `max_tokens` cap | Responses regularly exceed task requirements |
| TW-5 | Unstructured output where JSON would halve tokens | Free-text response parsed by regex downstream |
| TW-6 | Recursive summarization without memoization | Same document re-summarized on every call |

### Repeated / Duplicate Calls

| ID | Pattern | Signal |
|----|---------|--------|
| RC-1 | Identical prompt sent multiple times per request | No cache; same query triggers 2+ completions |
| RC-2 | Duplicate embedding generation | Same text embedded on insert and query with no stored cache |
| RC-3 | Classification called once per item in a loop | Per-row intent/sentiment when batch classification is available |
| RC-4 | Agent re-reads same tool output | Tool result not stored in agent state |
| RC-5 | Background job re-processes unchanged records | No `updated_at` / version gate before AI call |

### Model Overuse

| ID | Pattern | Signal |
|----|---------|--------|
| MO-1 | Opus/GPT-4 used for simple classification or formatting | Task needs < 200 tokens and has deterministic answer |
| MO-2 | Expensive model in high-frequency cron | Cron calls Opus/GPT-4 every minute on potentially unchanged data |
| MO-3 | No model routing between tiers | Same model regardless of task complexity |
| MO-4 | Embedding model overqualified for the retrieval task | Ada-3 on short lookups where text-embedding-3-small suffices |

### Retry & Loop Storms

| ID | Pattern | Signal |
|----|---------|--------|
| RL-1 | Unbounded agent loop | `while (true)` or recursive agent with no step cap |
| RL-2 | Retry on every error including non-retryable (400s) | Retry wrapper doesn't skip validation errors |
| RL-3 | Retry storm on quota hit without jitter | Simultaneous retries after 429 with no backoff spread |
| RL-4 | Tool call in loop without early exit | Agent calls search repeatedly even after finding answer |

### Caching Gaps

| ID | Pattern | Signal |
|----|---------|--------|
| CG-1 | No prompt-level cache | Identical prompts hit the API on every call |
| CG-2 | No embedding cache | pgvector rows recalculated instead of reused |
| CG-3 | No semantic cache | Similar prompts bypass cache |
| CG-4 | Short or missing TTL on AI responses | Cache evicts results before they can be reused |
| CG-5 | Streaming response not cached | Streamed output never stored; replays cost full tokens |

### Chain Inefficiency

| ID | Pattern | Signal |
|----|---------|--------|
| CI-1 | Sequential calls that could be parallelized | Step B doesn't need step A's output but waits for it |
| CI-2 | Multi-step chain where one call could replace two | Classify then reformat is one structured-output call |
| CI-3 | Intermediate results discarded and regenerated | Summarization result thrown away; re-run next request |
| CI-4 | Unnecessary tool calls | Agent calls `search` when result is already in context |

---

## Output Format

Each finding:

```
ID: <waste-pattern-id>
Severity: critical | high | medium | low
Affected: <file:line or function or workflow>
Current cost risk: <frequency × token-cost at scale, e.g. "1,000 battles/day × 4,000 tokens = $X/day">
Failure / explosion scenario: <what breaks or costs explode under load>
Optimization strategy: <model swap, caching, dedup, batching, prompt compression, etc.>
Preserves reasoning: yes / no + explanation
Validation steps:
  1. <unit test or integration check>
  2. <metric to observe before/after>
  3. <rollback condition>
```

Order by severity. Group by call site when multiple findings share a file.

---

## Constraints

- Do not recommend removing a reasoning step unless its output is unused or redundant.
- Do not recommend switching models without verifying the cheaper model produces equivalent quality.
- Do not recommend aggressive caching for calls where staleness breaks product correctness.
- Mark every recommendation with "Preserves reasoning: yes/no".
- If a call site cannot be safely optimized, say so and explain the constraint.
