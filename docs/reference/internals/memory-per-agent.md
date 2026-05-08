---
title: Memory Per Agent
description: How agents read and write structured memory entries, how memory is injected into workflow runs, and how the write-on-success gate protects against dirty writes from failed runs.
---

# Memory Per Agent

Each AI Lenser can have one or more **memory profiles** that configure retention, scope, isolation, and injection strategy. The **memory entries** stored inside those profiles are what the agent actually reads and writes at runtime.

## Primitives

| Primitive | What it is |
|-----------|-----------|
| **Memory Profile** | Configuration record: scope, retention, isolation mode, and seed entries. One profile is marked `is_default`. |
| **Memory Entry** | A single piece of content with a `scope`, `source`, `confidence` score, and optional expiry. Content is plain text today; forward-compatible with vector embeddings via `embedding_metadata`. |
| **Access Log** | An audit trail row written on every `read`, `write`, or `redact` action against a memory entry. |

## Data Model

### `agents.memories`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK → `agents.memory_profiles(id)` CASCADE |
| `ai_lenser_id` | uuid | Denormalized for RLS speed |
| `scope` | text | `'project' \| 'conversation' \| 'global'` |
| `source` | text | `'user' \| 'agent' \| 'tool' \| 'eval' \| 'manual'` |
| `content` | text | Redacted entries store literal `'[redacted]'` |
| `embedding_metadata` | jsonb | Reserved for future vector-store integration |
| `confidence` | numeric | 0–1; default `0.5` |
| `expires_at` | timestamptz | NULL = never expires |
| `team_run_id` | uuid | FK → `agents.team_runs(id)` SET NULL; which run wrote this |
| `is_redacted` | boolean | `true` after `fn_redact_memory_entry` |
| `created_at` | timestamptz | |

Indexes: `(profile_id, scope, created_at DESC)`, `(ai_lenser_id, expires_at)`.

### `agents.memory_access_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `memory_id` | uuid | FK → `agents.memories(id)` CASCADE |
| `team_run_id` | uuid | FK → `agents.team_runs(id)` SET NULL |
| `action` | text | `'read' \| 'write' \| 'redact'` |
| `context` | jsonb | Arbitrary metadata from the caller |
| `accessed_at` | timestamptz | |

Index: `(memory_id, accessed_at DESC)`.

### View — `agents.memories_v`

Joins `memory_profiles.name` as `profile_name`. Exposed to `authenticated` and `service_role`.

## RPCs

All RPCs are `SECURITY DEFINER` in the `public` schema.

| RPC | Purpose | Returns |
|-----|---------|---------|
| `fn_write_memory_entry(p_profile_id, p_scope, p_source, p_content, p_confidence?, p_expires_at?, p_team_run_id?, p_metadata?)` | Insert + log `'write'`. Resolves `ai_lenser_id` from profile. | `uuid` (new entry id) |
| `fn_read_memory_entries(p_profile_id, p_scope?, p_limit?, p_team_run_id?)` | Return entries ordered by `confidence DESC, created_at DESC`, filter expired and redacted. Log `'read'` once per call. | `SETOF agents.memories` |
| `fn_redact_memory_entry(p_memory_id, p_reason?)` | Set `content='[redacted]'`, `is_redacted=true`, log `'redact'`. | `void` |
| `fn_summarize_memory_profile(p_profile_id)` | Stub: return `{ count, scopes, last_written_at }`. Signature is stable — LLM summarization will land behind this same RPC. | `jsonb` |

### RLS

`agents.memories`: `USING/WITH CHECK agents.can_manage_ai_lenser(ai_lenser_id)`.
`agents.memory_access_logs`: joined through `memories` on the same helper.

## Dispatch Integration

### Memory injection

Before `resolveLensTemplate` assembles the prompt, `useTeamRunDispatch` calls `fn_read_memory_entries` for the agent's default profile with `scope='project'` and `limit=5`. If entries are found, a `## Context Memory` markdown block is prepended to the template body.

```
## Context Memory
- [0.9] Previous run found rate limiting on external API — use exponential backoff.
- [0.7] Customer preference: JSON output only, never YAML.
```

This is **best-effort** — if no profile is configured or the read fails, the run continues without memory context. The event `memory_injected` is emitted with an `entry_count` payload.

### Write gate

Nodes can signal pending memory writes by including a `__lf_memory_writes` array in their output:

```json
{
  "__lf_memory_writes": [
    { "scope": "project", "source": "agent", "content": "Rate limiter hit at 9:04 UTC", "confidence": 0.85 }
  ]
}
```

`useTeamRunDispatch` buffers these during the run. **Writes are committed only when `finalStatus === 'completed'`.** On failure or exception, the buffer is dropped — failed runs never pollute memory.

The event `memory_committed` is emitted with a `write_count` payload on success.

## UI

Open the **Memory** tab in any agent workspace.

| Tab | Purpose |
|-----|---------|
| Profiles | Create and configure memory profiles. One is default. |
| Entries | Browse, filter (scope / source), and write entries. Click a row to open `MemoryEntryDrawer`. |

### `MemoryEntryDrawer`

- Read-only display of all entry fields.
- **Manual write** form (visible to owner): scope, source, content, and confidence.
- **Redact** action: requires confirmation via `AlertDialog`. Content becomes `[redacted]` and the access log gains a `'redact'` row.

## CLI

```bash
# List profiles for an agent
lenserfight memory list-profiles --agent <ai-lenser-id>

# Browse entries in a profile (optionally scope-filtered)
lenserfight memory list-entries --profile <profile-id> [--scope project|conversation|global] [--limit 50]

# Write a manual entry
lenserfight memory write-entry --profile <profile-id> --scope project --source manual --content "..." [--confidence 0.8]

# Redact an entry
lenserfight memory redact <memory-entry-id> --reason "contains PII"

# Summarize a profile (count, scopes, last write)
lenserfight memory summarize --profile <profile-id>

# JSON output on any list command
lenserfight memory list-entries --profile <profile-id> --json
```

Source: [apps/cli/src/commands/memory.ts](../../apps/cli/src/commands/memory.ts)

## Verification

```bash
# 1. Services pass
pnpm nx test data-repositories --testFile memoryService.spec.ts

# 2. Dispatch write-gate test
pnpm nx test agents --testFile useTeamRunDispatch.spec.ts

# 3. CLI smoke
lenserfight memory list-profiles --agent <uuid>
lenserfight memory write-entry --profile <uuid> --scope project --source manual --content "hello"
lenserfight memory summarize --profile <uuid>
```

## Limitations and follow-ups

- **Injection limit is hardcoded to 5 entries.** A future `injection_limit` column on `memory_profiles` will make this configurable without changing the dispatch contract.
- **`fn_summarize_memory_profile` is a stub.** It returns raw counts today. LLM-powered summarization and deduplication will land behind the same signature.
- **Embeddings are reserved.** The `embedding_metadata` column exists but is not populated. Semantic search will be added as a separate migration — no schema change needed.
- **Cross-scope injection is not supported.** The dispatch hook injects only `scope='project'` entries. Conversation-scoped memory requires threading in a `conversation_id` that does not yet exist in the dispatch contract.
