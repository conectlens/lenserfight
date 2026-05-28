---
name: ai-cost-manager-reducer
description: Audit AI-powered features, API calls, agent workflows, prompt chains, tool calls, embeddings, vector search, retries, streaming flows, background jobs, cron tasks, caching layers, logs, and model selection logic to detect token waste, repeated AI calls, and inefficient prompt chains. Produces severity-ranked findings with safe optimization strategies that preserve reasoning quality and chain reliability. Use before approving or modifying any AI-powered feature, agent workflow, or model-calling code.
---

# AI Cost Manager & Reducer

Audit as an efficiency engineer, not a summarizer. Every finding must name a concrete waste pattern, its cost risk, and a safe optimization strategy that preserves reasoning quality and chain correctness.

## Quick Start

1. Identify all AI call sites: LLM API calls, embedding generation, vector search, tool dispatch, agent loops.
2. Trace each call's purpose, frequency, input size, output size, and model selection.
3. Detect waste patterns (see catalogue below).
4. Rank findings by severity and estimated cost impact.
5. Propose safe optimizations with validation steps.

**Never recommend removing a reasoning step unless you have verified the step is truly redundant or its output is unused downstream.**

---

## Audit Scope

### AI Call Sites to Inspect

- LLM completions: `openai`, `@anthropic-ai/sdk`, Supabase Edge Functions calling AI APIs, server actions, background workers, cron jobs
- Embedding generation: `embeddings.create()`, `embed()`, pgvector insert paths, semantic search pipelines
- Vector search: cosine similarity queries, `<=>` operator, HNSW/IVFFlat index queries
- Tool/function calls: agent tool dispatch loops, multi-step orchestration, MCP tool invocations
- Streaming flows: streamed completions feeding downstream parsers or UI
- Retry logic: exponential backoff, retry-on-failure wrappers, queue consumers
- Caching layers: Redis/KV caches keyed on prompts, memoization wrappers, CDN-cached AI responses
- Classification / extraction calls: sentiment, category, entity extraction, intent detection
- Summarization pipelines: document chunking, recursive summarization, context compression
- Model selection logic: environment switches, tier routing, fallback chains

---

## Waste Pattern Catalogue

### Token Waste

| ID | Pattern | Signal |
|----|---------|--------|
| TW-1 | Oversized system prompt injected on every call | System prompt > 500 tokens with mostly static content |
| TW-2 | Full conversation history resent without truncation | Context grows unboundedly per session |
| TW-3 | Redundant context injection | Same DB rows / user profile fetched and embedded in prompt on every request |
| TW-4 | Verbose output without `max_tokens` cap | Responses regularly exceed task requirements |
| TW-5 | Unstructured output where JSON/schema would halve tokens | Free-text response parsed by regex downstream |
| TW-6 | Recursive summarization without memoization | Same document re-summarized on every call |

### Repeated / Duplicate Calls

| ID | Pattern | Signal |
|----|---------|--------|
| RC-1 | Identical prompt sent multiple times per request | No cache; same user query triggers 2+ completions |
| RC-2 | Duplicate embedding generation | Same text embedded on insert and on query with no stored cache |
| RC-3 | Classification called once per item in a loop | Per-row intent/sentiment when batch classification is available |
| RC-4 | Agent re-reads same tool output in next iteration | Tool result not stored in agent state |
| RC-5 | Background job re-processes unchanged records | No `updated_at` / version gate before AI call |

### Model Overuse

| ID | Pattern | Signal |
|----|---------|--------|
| MO-1 | GPT-4/Claude Opus used for simple classification or formatting | Task needs < 200 tokens and has deterministic answer |
| MO-2 | Expensive model used in high-frequency cron | Cron calls Opus/GPT-4 every minute on potentially unchanged data |
| MO-3 | No model routing between tiers | Same model regardless of task complexity or latency budget |
| MO-4 | Embedding model overqualified for the retrieval task | Ada-3 on short single-word lookups where `text-embedding-3-small` suffices |

### Retry & Loop Storms

| ID | Pattern | Signal |
|----|---------|--------|
| RL-1 | Unbounded agent loop | `while (true)` or recursive agent with no step cap |
| RL-2 | Retry on every error including non-retryable (400s) | Retry wrapper doesn't skip validation errors |
| RL-3 | Retry storm on quota hit without jitter | Simultaneous retries after 429 with no backoff spread |
| RL-4 | Tool call in loop without early exit | Agent calls search tool repeatedly even after finding answer |

### Caching Gaps

| ID | Pattern | Signal |
|----|---------|--------|
| CG-1 | No prompt-level cache | Identical prompts hit the API on every call |
| CG-2 | No embedding cache | pgvector rows recalculated instead of reused |
| CG-3 | No semantic cache | Similar (not identical) prompts bypass cache |
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

## Review Workflow

### 1. Map the AI Call Graph

For each AI call site, record:

```
File → function → purpose → model → avg input tokens → avg output tokens → call frequency → cached?
```

Flag any call where: frequency × token-cost > threshold, or model tier doesn't match task complexity.

### 2. Check Caching Coverage

- Is there a cache keyed on the normalized prompt or embedding input?
- What is the TTL? Is it appropriate for data freshness requirements?
- Is the cache hit rate observable?
- For embeddings: are vectors stored in pgvector and reused, or regenerated on every query?

### 3. Evaluate Model Routing

For each LLM call:
- Is the task classification/formatting/extraction with a deterministic answer? → Route to smallest capable model.
- Is the task reasoning/generation/planning with variable depth? → Justify the model tier.
- Is there a fallback to a cheaper model on timeout or quota?

### 4. Inspect Agent Loops

- Does the loop have an explicit step cap (`maxIterations`, `maxSteps`)?
- Is there an early-exit condition checked before each tool call?
- Are tool results stored and checked before re-calling the same tool?
- Are all tool calls necessary, or can some be replaced with deterministic code?

### 5. Assess Prompt Size

- What is the static vs. dynamic portion of the prompt? Can static parts use prompt caching (Anthropic prefix caching, OpenAI system message caching)?
- Is context truncated or summarized before injection?
- Is the conversation history bounded?

### 6. Measure Observability

Verify these metrics are tracked or identify where they should be added:
- Cost per request / per feature
- Token usage breakdown (input vs. output)
- Cache hit rate
- AI call count per workflow
- Model tier distribution
- Retry rate

---

## Output Format

Each finding must include:

```
ID: <waste-pattern-id>
Severity: critical | high | medium | low
Affected: <file:line or function or workflow name>
Current cost risk: <what happens at scale — e.g., "1,000 battle evaluations/day × 4,000 tokens = $X/day">
Failure / explosion scenario: <what breaks or costs explode under load>
Optimization strategy: <concrete change — model swap, caching, dedup, batching, prompt compression, etc.>
Preserves reasoning: <yes/no + explanation of why chain still works>
Validation steps:
  1. <unit test or integration check>
  2. <metric to observe before/after>
  3. <rollback condition>
```

Order findings by severity. Group by call site when multiple findings share a file.

---

## Optimization Strategies Reference

### Prompt Compression
- Strip redundant preamble; move static instructions to prefix-cached system prompt.
- Use bullet points over paragraphs for instructions.
- Replace examples with a reference to a cached few-shot prompt ID.

### Cheaper Model Routing
- Classification, extraction, formatting → `gpt-4o-mini`, `claude-haiku-4-5`, or `gemini-flash`.
- Reasoning, planning, long-form generation → justify Sonnet/GPT-4o; Opus only for highest complexity.
- Add a `model_tier: 'fast' | 'standard' | 'premium'` config to each call site.

### Call Deduplication / Memoization
- Hash the normalized prompt; store result in Redis/KV with appropriate TTL.
- For embeddings: store vector in pgvector at insert time; never recompute at query time.
- For classifications: store result in a `classifications` table keyed on `(content_hash, classifier_version)`.

### Semantic Caching
- Use embedding similarity to match near-identical prompts to cached responses.
- Apply only to read-heavy, low-variance query patterns (e.g., FAQ answering, tag suggestion).

### Batching
- Replace per-item loops with `embeddings.create({ input: [...] })` batch calls.
- Batch classification requests using structured multi-item prompts.
- Group background job records into single API calls with array inputs.

### Early Exits
- Check deterministic conditions before calling AI (e.g., if content is empty, skip summarization).
- Add tool result staleness check before re-calling the same tool in an agent loop.
- Add `if (cache.has(key)) return cache.get(key)` before every AI call.

### Stricter Output Control
- Always set `max_tokens` proportional to expected output size.
- Use `response_format: { type: 'json_object' }` or Zod schemas to prevent verbose free-text.
- Set `temperature: 0` for deterministic classification/extraction tasks.

### Reusable Intermediate Results
- Store summarization outputs in the DB; invalidate only on source update.
- Cache agent scratchpad state between steps; serialize to Redis on each tool return.

### Fallback Strategy
- On 429 / timeout: route to cheaper model before retrying same tier.
- On repeated tool failure: exit loop with partial result rather than infinite retry.

---

## Constraints

- Do not recommend removing a reasoning step unless you can show the output is unused or redundant.
- Do not recommend switching models unless you verify the cheaper model produces equivalent quality on this task.
- Do not recommend aggressive caching for calls where staleness would break product correctness (e.g., real-time scoring).
- Mark every recommendation with "Preserves reasoning: yes/no" and explain.
- If a call site cannot be safely optimized, say so and explain the constraint.
- Prefer observable, incremental changes (add a cache layer, tune max_tokens) over restructuring the entire chain.

---

## Example Triggers

- Review our AI battle evaluation pipeline for token waste and model overuse.
- Our monthly AI bill doubled; find the hotspots before we scale to 10k users.
- Audit agent workflows in `libs/domains/execution/src/` for unbounded loops and retry storms.
- Check whether our embedding pipeline is regenerating vectors that are already stored.
- Before we launch this new AI feature, review it for cost explosion scenarios under load.
