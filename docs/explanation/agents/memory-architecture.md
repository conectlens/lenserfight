---
title: Memory Architecture
description: Why memory is split into profiles and entries, how scopes work, why writes only commit on success, and what the redaction and future embedding paths look like.
---

# Memory Architecture

## Profile vs entry split

A **memory profile** is configuration — retention policy, isolation mode, injection strategy, seed entries. It changes rarely and is set by the agent's owner.

A **memory entry** is data — a single piece of content the agent learned, observed, or was told. Entries change constantly as agents run.

Keeping them in separate tables (`memory_profiles` vs `agents.memories`) avoids the pattern where configuration rows balloon into large, append-only blobs. It also lets RLS work cleanly: profiles are owned by the agent; entries inherit that ownership through `ai_lenser_id` without a costly join on every read.

## Scopes

| Scope | Semantics |
|-------|-----------|
| `project` | Persists across all runs for this agent. Used for observations about the task domain, recurring patterns, or operator-supplied context. |
| `conversation` | Intended to span one session. Not yet tied to a `conversation_id` in the dispatch contract — treated as `project`-scoped until threading is available. |
| `global` | Reserved for cross-agent knowledge sharing. No UI or dispatch integration today. |

The dispatch hook injects only `scope='project'` entries (limit 5). Other scopes can be read directly via the RPC or CLI.

## Write-on-success gate

Agents signal intent to write memory by including a `__lf_memory_writes` array in node output:

```json
{
  "result": "...",
  "__lf_memory_writes": [
    { "scope": "project", "source": "agent", "content": "...", "confidence": 0.85 }
  ]
}
```

`useTeamRunDispatch` buffers these in a local `pendingMemoryWrites[]` array. The buffer is:

- **Committed** (fire-and-forget via `memoryService.writeMemoryEntry`) when `finalStatus === 'completed'`.
- **Dropped silently** on failure, cancellation, or thrown error.

This gate prevents failed, partial, or adversarial runs from poisoning the agent's memory store.

## Redaction

Calling `fn_redact_memory_entry` does not delete the row. It replaces `content` with the literal string `'[redacted]'` and sets `is_redacted=true`. The row is excluded from `fn_read_memory_entries` (filter applied server-side) but remains in the access log chain.

This is intentional: deleting rows would silently break audit trails. Operators can see that a redaction happened, when, and why (stored in `memory_access_logs.context`).

## Audit trail

Every `fn_read_memory_entries` and `fn_write_memory_entry` call appends a row to `agents.memory_access_logs`. The `action` is `'read'`, `'write'`, or `'redact'`. The `team_run_id` links the access back to the run that caused it.

This gives operators a complete provenance chain: *which run read which entries, and which run wrote what*.

## Future: embeddings

The `embedding_metadata` jsonb column is reserved for vector-store integration. The design principle is:

1. Populate `embedding_metadata` with the vector on write (no schema change needed).
2. Add a `fn_search_memory_entries` RPC for semantic search (new function, no changes to existing callers).
3. The dispatch hook can be extended to call semantic search instead of (or in addition to) recency-ordered fetch without changing the `## Context Memory` block format.

The `fn_summarize_memory_profile` stub is similarly Open-Closed: when LLM summarization lands, the RPC signature stays identical. Callers won't change.

## Limits and follow-ups

- **5-entry injection limit** is hardcoded in the hook today. A `injection_limit` column on `memory_profiles` will move this to configuration.
- **`conversation` scope** needs a `conversation_id` threading primitive in `WorkflowExecutionContext` before it is meaningful.
- **Global scope** needs a cross-agent authorization model before it is safe to open.
