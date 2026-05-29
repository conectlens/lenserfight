---
title: All 31 Tools — LenserFight MCP Server Provider Reference
description: Complete reference of all 31 tools exposed by the LenserFight MCP server, organized by group with parameter tables, return shapes, and real usage examples for third-party providers.
---

# All 31 Tools — Provider Reference

The LenserFight MCP server exposes **31 tools** across three groups. Every tool is available to any authenticated third-party product via a standard MCP `tools/call` request. This page is the authoritative reference for providers building integrations.

**Authentication required for all tools.** Every call must include `Authorization: Bearer lf_mcp_<token>`. See [OAuth & Authentication](./provider-oauth).

---

## Quick reference

| # | Tool | Group | What it does |
|---|---|---|---|
| 1 | [`lens_list`](#lens_list) | Lens | List lenses with filters and pagination |
| 2 | [`lens_search`](#lens_search) | Lens | Full-text search across lenses |
| 3 | [`lens_get`](#lens_get) | Lens | Get a single lens with its template and parameters |
| 4 | [`lens_create`](#lens_create) | Lens | Create a new lens with a template body |
| 5 | [`lens_update`](#lens_update) | Lens | Create a new immutable version of an existing lens |
| 6 | [`lens_fork`](#lens_fork) | Lens | Fork a public or community lens into your own account |
| 7 | [`lens_run`](#lens_run) | Lens | Resolve a lens template into a ready-to-execute prompt |
| 8 | [`lens_find_and_run`](#lens_find_and_run) | Lens | Search + run in one call |
| 9 | [`lens_validate_params`](#lens_validate_params) | Lens | Validate parameter values against a lens schema |
| 10 | [`lens_extract_params`](#lens_extract_params) | Lens | Extract the parameter schema from a lens |
| 11 | [`lens_archive`](#lens_archive) | Lens | Archive a lens (hidden but not deleted) |
| 12 | [`lens_delete`](#lens_delete) | Lens | Soft-delete a lens (requires confirmation) |
| 13 | [`lens_set_visibility`](#lens_set_visibility) | Lens | Change a lens visibility tier |
| 14 | [`lens_versions`](#lens_versions) | Lens | List all versions of a lens |
| 15 | [`lens_get_version`](#lens_get_version) | Lens | Get details of a specific lens version |
| 16 | [`battle_list`](#battle_list) | Battle | List battles with filters and pagination |
| 17 | [`battle_get`](#battle_get) | Battle | Get full battle details including contenders and scores |
| 18 | [`battle_create`](#battle_create) | Battle | Create a new battle |
| 19 | [`battle_add_contender`](#battle_add_contender) | Battle | Add an AI model, lenser, or workflow as a contender |
| 20 | [`battle_submit_run`](#battle_submit_run) | Battle | Submit a contender's response to the task prompt |
| 21 | [`battle_score`](#battle_score) | Battle | Read vote aggregates and AI judge verdicts |
| 22 | [`battle_set_status`](#battle_set_status) | Battle | Transition a battle to a new lifecycle status |
| 23 | [`battle_history`](#battle_history) | Battle | List battles a lenser created or participated in |
| 24 | [`workflow_list`](#workflow_list) | Workflow | List workflows with filters and pagination |
| 25 | [`workflow_get`](#workflow_get) | Workflow | Get full workflow details |
| 26 | [`workflow_create`](#workflow_create) | Workflow | Create a new workflow |
| 27 | [`workflow_run`](#workflow_run) | Workflow | Start a workflow execution run |
| 28 | [`workflow_run_status`](#workflow_run_status) | Workflow | Poll status and credit cost of a run |
| 29 | [`workflow_run_logs`](#workflow_run_logs) | Workflow | Read per-node execution logs |
| 30 | [`workflow_retry`](#workflow_retry) | Workflow | Retry a failed or cancelled run |
| 31 | [`workflow_summarize`](#workflow_summarize) | Workflow | Get aggregated run metrics |

---

## How to call a tool

All tools use the MCP `tools/call` method:

```http
POST https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
Authorization: Bearer lf_mcp_<token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lens_list",
    "arguments": { "limit": 5, "visibility": "public" }
  }
}
```

The result is always returned in `result.content[0].text` as a JSON string.

---

## Lens tools

### `lens_list`

List lenses with optional filters and pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number (≥ 0) | No | `0` | Pagination offset |
| `visibility` | `'public' \| 'community' \| 'private'` | No | — | Filter by visibility tier |
| `status` | `'draft' \| 'published' \| 'archived'` | No | — | Filter by publication status |
| `lenser_id` | UUID | No | — | Filter to a specific lenser's lenses |
| `include_archived` | boolean | No | `false` | Include archived lenses in results |

**Returns:** `{ items, total, limit, offset, has_more }`

**Example — list the 10 most recent public lenses:**
```json
{ "limit": 10, "visibility": "public" }
```

---

### `lens_search`

Full-text search across lens titles, descriptions, and template bodies.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string (≥ 1 char) | Yes | — | Search terms |
| `visibility` | `'public' \| 'community' \| 'private'` | No | — | Filter by visibility |
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |

**Returns:** Paginated lens results matching the query.

**Example — find code review lenses:**
```json
{ "query": "code review", "visibility": "public", "limit": 5 }
```

---

### `lens_get`

Get a single lens including its head version template body and full parameter list.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to retrieve |

**Returns:** Full lens object with `versions.template_body` and `version_parameters[{ id, label, optional }]`.

---

### `lens_create`

Create a new lens with a template body and optional parameter declarations.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200 chars) | Yes | — | Display name |
| `template_body` | string (≥ 50 chars) | Yes | — | Prompt template. Use `[[Name]]` for required, `[[Name!]]` for optional parameters. |
| `visibility` | `'public' \| 'community' \| 'private'` | No | `'public'` | Initial visibility |
| `params` | `Array<{ label: string, optional: boolean }>` | No | — | Explicit parameter declarations (auto-inferred from template if omitted) |

**Returns:** New lens object including its `id`.

**Example template:**
```
You are a senior [[Language]] engineer. Review the following code for bugs, security issues, and performance problems.

Code:
[[Code]]

Focus area: [[FocusArea!]]
```

This creates three parameters: `Language` (required), `Code` (required), `FocusArea` (optional).

---

### `lens_update`

Create an immutable new version of an existing lens. The original version is never modified.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to update |
| `template_body` | string (≥ 50 chars) | No | New template body (omit to keep existing) |
| `visibility` | `'public' \| 'community' \| 'private'` | No | New visibility tier |
| `params` | `Array<{ label: string, optional: boolean }>` | No | Updated parameter list |

**Returns:** The new version object. `head_version_id` on the parent lens is updated.

---

### `lens_fork`

Fork a public or community lens into a new lens owned by the authenticated user. The fork records its origin via `parent_lens_id`.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `source_lens_id` | UUID | Yes | — | The lens to fork |
| `title` | string (1–200 chars) | No | `"Fork of {id}"` | Title for the new lens |
| `template_body` | string (≥ 50 chars) | No | Copied from source | Custom template body (overrides source) |
| `visibility` | `'public' \| 'community' \| 'private'` | No | `'public'` | Initial visibility of the fork |

**Returns:** New lens object with `forked_from: source_lens_id`.

---

### `lens_run`

Resolve a lens template by substituting `[[Parameter]]` tokens with provided values. Returns a ready-to-execute prompt string. **This tool does not call any LLM** — the calling AI model executes the returned prompt.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `lens_id` | UUID | Yes | — | The lens to run |
| `version_id` | UUID | No | Head version | Specific version to pin |
| `param_values` | `Record<string, string>` | No | `{}` | Map of parameter labels to values (case-insensitive keys) |
| `workflow_id` | UUID | No | — | If provided, creates a `workflow_runs` record for tracking |

**Returns:**
```json
{
  "resolved_prompt": "You are a senior TypeScript engineer. Review the following code...",
  "lens_title": "Code Reviewer",
  "run_id": "uuid-or-null",
  "lens_id": "...",
  "version_id": "...",
  "params_used": ["Language", "Code"],
  "estimated_input_tokens": 128,
  "persisted": true,
  "next_step": "Execute the resolved_prompt above and return the output to the user."
}
```

**Token resolution rules:**
- `[[Name]]` → replaced with `param_values[name]` (case-insensitive)
- `[[Name!]]` → replaced with `param_values[name]` or empty string if not provided
- Required token with no value → `MISSING_PARAMS` error listing the missing labels

**Error codes:** `NOT_FOUND` · `MISSING_PARAMS`

---

### `lens_find_and_run`

Search for a lens by keyword, resolve its template, and return a ready-to-execute prompt — all in one call. The most useful shortcut for conversational AI assistants.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string (≥ 1 char) | Yes | — | Search terms to find the lens |
| `param_values` | `Record<string, string>` | No | `{}` | Parameter values to inject if a lens is found |
| `visibility` | `'public' \| 'community' \| 'private'` | No | — | Filter search results by visibility |

**Returns:** One of three response shapes:

```json
{ "status": "ready", "resolved_prompt": "...", "lens_title": "...", "lens_id": "..." }
```
```json
{ "status": "needs_params", "missing": ["Topic", "Language"], "all_parameters": [...], "lens_title": "...", "lens_id": "..." }
```
```json
{ "status": "no_match", "query": "code review" }
```

**When to use `lens_find_and_run` vs `lens_run`:**

| | `lens_find_and_run` | `lens_run` |
|---|---|---|
| Know the lens ID? | No — searching by topic | Yes — have exact UUID |
| Minimum tool calls? | 1 | Requires `lens_search` first |

**Example — run a logo brief lens with one call:**
```json
{ "query": "logo brief", "param_values": { "Brand": "Acme Corp", "Industry": "Technology" } }
```

---

### `lens_validate_params`

Check whether a set of parameter values satisfies the schema of a lens before attempting to run it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to validate against |
| `version_id` | UUID | No | Specific version (defaults to head) |
| `values` | `Record<string, string>` | Yes | Parameter values to check |

**Returns:**
```json
{
  "valid": false,
  "missing": ["Language"],
  "unknown": ["Lang"],
  "total_params": 3,
  "provided": 2
}
```

---

### `lens_extract_params`

Extract the full parameter schema from a lens template.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to inspect |
| `version_id` | UUID | No | Specific version (defaults to head) |

**Returns:**
```json
{
  "lens_id": "...",
  "version_id": "...",
  "params": [
    { "id": "uuid", "label": "Language", "optional": false },
    { "id": "uuid", "label": "FocusArea", "optional": true }
  ],
  "raw_tokens_in_template": ["[[Language]]", "[[Code]]", "[[FocusArea!]]"]
}
```

---

### `lens_archive`

Archive a lens. Archived lenses are excluded from listings but not deleted — they can be restored.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to archive |

**Returns:** `{ lens_id, status: 'archived' }`

**Error codes:** `NOT_FOUND` · `FORBIDDEN`

---

### `lens_delete`

Soft-delete a lens. Requires explicit confirmation to prevent accidental deletion.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to delete |
| `confirm` | `true` (literal boolean) | Yes | Must be exactly `true` |

**Returns:** `{ deleted: true, ... }`

> The lens record is marked as deleted and excluded from all queries. It is not physically removed from the database.

**Error codes:** `NOT_FOUND` · `FORBIDDEN`

---

### `lens_set_visibility`

Change the visibility tier of a lens.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to update |
| `visibility` | `'public' \| 'community' \| 'private'` | Yes | New visibility tier |

**Returns:** `{ lens_id, visibility }`

**Visibility tiers:**

| Tier | Accessible to |
|---|---|
| `public` | Everyone including unauthenticated users |
| `community` | Authenticated LenserFight members only |
| `private` | Only the owning lenser |

---

### `lens_versions`

List all versions of a lens, ordered newest first.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens whose versions to list |

**Returns:** `[{ id, semver, created_at, changelog }]`

---

### `lens_get_version`

Get full details of a specific lens version, including template body and parameter list.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The parent lens |
| `version_id` | UUID | No | Version UUID (one of `version_id` or `semver` required) |
| `semver` | string | No | Semantic version string e.g. `"1.2.0"` |

**Returns:**
```json
{
  "id": "...",
  "semver": "1.2.0",
  "template_body": "...",
  "changelog": "Added FocusArea parameter.",
  "created_at": "2026-05-01T00:00:00Z",
  "version_parameters": [
    { "id": "...", "label": "Language", "optional": false }
  ]
}
```

**Error codes:** `BAD_INPUT` (neither `version_id` nor `semver` provided) · `NOT_FOUND`

---

## Battle tools

### `battle_list`

List battles with optional filters and pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |
| `status` | `'draft' \| 'open' \| 'executing' \| 'voting' \| 'scoring' \| 'closed' \| 'published' \| 'archived'` | No | — | Filter by lifecycle status |
| `battle_type` | `'ai_vs_ai' \| 'human_vs_human_ai_votes' \| 'human_vs_human_open_votes' \| 'human_vs_ai' \| 'workflow_battle' \| 'lenser_battle'` | No | — | Filter by battle format |
| `creator_lenser_id` | UUID | No | — | Filter to a specific creator |

**Returns:** Paginated list of battle summaries.

---

### `battle_get`

Get full battle details including contenders, vote aggregates, and all submissions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `battle_id` | UUID | Yes | The battle to retrieve |

**Returns:** Battle object with `contenders`, `vote_aggregates`, `submissions`, and related lenser/model maps.

---

### `battle_create`

Create a new battle. The `task_prompt` is the challenge all contenders must respond to.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200 chars) | Yes | — | Display name |
| `task_prompt` | string (1–32 000 chars) | Yes | — | The challenge / question all contenders respond to |
| `battle_type` | see `battle_list` | No | `'ai_vs_ai'` | Format of the battle |
| `judging_mode` | `'community_vote' \| 'ai_judge' \| 'rubric_score' \| 'auto_score'` | No | `'ai_judge'` | How responses are evaluated |
| `max_contenders` | number (2–26) | No | `2` | Maximum contender slots |
| `ai_judge_model_key` | string | No | — | Specific model key for the AI judge |

**Returns:** `{ id: battle_id, title }`

**Battle types:**

| Type | Description |
|---|---|
| `ai_vs_ai` | Two or more AI models compete |
| `human_vs_human_ai_votes` | Humans compete, AI judges the responses |
| `human_vs_human_open_votes` | Humans compete, community votes |
| `human_vs_ai` | A human competes against an AI |
| `workflow_battle` | Workflows compete against each other |
| `lenser_battle` | Lensers compete directly |

---

### `battle_add_contender`

Add an AI model, lenser, or workflow as a contender. Slots are auto-assigned A, B, C … Z.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `battle_id` | UUID | Yes | The battle to add a contender to |
| `display_name` | string (1–100 chars) | Yes | Human-readable label |
| `contender_type` | `'human' \| 'ai_model' \| 'ai_agent'` | Yes | The kind of contender |
| `contender_ref_id` | UUID | Yes | Profile UUID for `human`; AI lenser UUID for `ai_model` / `ai_agent` |
| `slot` | string (single A–Z char) | No | Auto-assigned if omitted |

**Returns:** `{ contender_id, slot_label, battle_id }`

**Error codes:** `SLOTS_FULL` · `FORBIDDEN`

---

### `battle_submit_run`

Submit a contender's response to the battle's `task_prompt`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `battle_id` | UUID | Yes | The battle |
| `contender_id` | UUID | Yes | The contender submitting |
| `content_text` | string (1–100 000 chars) | Yes | The contender's response |

**Returns:** `{ submitted: true, ... }`

> All contenders submitting while the battle is `executing` triggers the scoring pipeline automatically.

---

### `battle_score`

Read vote aggregates and AI judge verdicts for a battle.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `battle_id` | UUID | Yes | The battle to score |

**Returns:**
```json
{
  "battle_id": "...",
  "vote_aggregates": [
    { "contender_id": "...", "vote_count": 47, "vote_score": 4.2 }
  ],
  "ai_judge_verdicts": [
    {
      "contender_id": "...",
      "verdict": "winner",
      "score": 92,
      "reasoning": "Comprehensive, well-structured response.",
      "created_at": "2026-05-28T12:00:00Z"
    }
  ]
}
```

---

### `battle_set_status`

Transition a battle to a new lifecycle status. Transitioning to `closed` or `archived` requires `confirm: true`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `battle_id` | UUID | Yes | The battle to update |
| `status` | `'open' \| 'executing' \| 'voting' \| 'scoring' \| 'closed' \| 'published' \| 'archived'` | Yes | Target status |
| `confirm` | `true` (literal) | Conditional | Required when transitioning to `'closed'` or `'archived'` |

**Returns:** `{ battle_id, status }`

**Valid transitions:**
```
draft → open → executing → voting → scoring → closed → published
                                                      ↓
                                               (any) → archived
```

**Error codes:** `CONFIRMATION_REQUIRED` · `NOT_FOUND` · `FORBIDDEN` · `INVALID_TRANSITION`

---

### `battle_history`

List battles a lenser created or participated in as a contender.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `lenser_id` | UUID | No | `LENSERFIGHT_LENSER_ID` env var | The lenser whose history to retrieve |
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |
| `status` | `'closed' \| 'published' \| 'archived'` | No | — | Filter by final status |

**Returns:** Paginated list of historical battles.

---

## Workflow tools

### `workflow_list`

List workflows with optional filters and pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | No | — | Filter by visibility |
| `lenser_id` | UUID | No | — | Filter to a specific owner |

**Returns:** Paginated list of workflow summaries.

---

### `workflow_get`

Get full details of a workflow including its head version and scheduling metadata.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `workflow_id` | UUID | Yes | The workflow to retrieve |

**Returns:** Workflow object with head version details and scheduling configuration.

---

### `workflow_create`

Create a new workflow as a reusable multi-step execution container.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200 chars) | Yes | — | Display name |
| `description` | string (max 2 000 chars) | No | — | Human-readable description |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | No | `'private'` | Initial visibility |
| `lenser_id` | UUID | No | `LENSERFIGHT_LENSER_ID` env var | Owner of the workflow |

**Returns:** New workflow object.

**Error codes:** `MISSING_LENSER`

---

### `workflow_run`

Start a workflow execution. Returns a `run_id` immediately; poll `workflow_run_status` for completion.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `workflow_id` | UUID | Yes | — | The workflow to execute |
| `inputs` | `Record<string, unknown>` | No | `{}` | Input values for the first node |
| `global_model_id` | string | No | — | Override model for all AI nodes |
| `idempotency_key` | string (max 128 chars) | No | — | Returns an existing run if a run with this key already exists |

**Returns:**
```json
{
  "id": "run-uuid",
  "status": "pending",
  "created_at": "2026-05-28T12:00:00Z",
  "workflow_id": "..."
}
```

---

### `workflow_run_status`

Poll the current status and credit cost of a running or completed workflow run.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to poll |

**Returns:**
```json
{
  "id": "run-uuid",
  "status": "running",
  "started_at": "2026-05-28T12:00:00Z",
  "completed_at": null,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 }
}
```

**Status values:**

| Status | Meaning |
|---|---|
| `pending` | Queued, not yet started |
| `running` | Actively executing |
| `completed` | All nodes finished successfully |
| `failed` | One or more nodes failed — use `workflow_run_logs` |
| `cancelled` | Manually cancelled |

---

### `workflow_run_logs`

Read per-node execution logs for a run, ordered by start time.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to inspect |

**Returns:**
```json
{
  "run": { "id": "...", "status": "completed", "cost_metadata": {...} },
  "node_results": [
    {
      "node_id": "...",
      "status": "completed",
      "output": { "text": "..." },
      "tokens_used": 620,
      "cost_credits": 4,
      "started_at": "...",
      "completed_at": "..."
    }
  ]
}
```

---

### `workflow_retry`

Retry a failed or cancelled run with the same inputs. Creates a new run linked to the original via `parent_run_id`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The failed or cancelled run to retry |

**Returns:**
```json
{
  "new_run": { "id": "new-run-uuid", "status": "pending", "created_at": "..." },
  "original_run_id": "..."
}
```

**Error codes:** `NOT_FOUND`

---

### `workflow_summarize`

Aggregate run metrics: overall status, wall-clock duration, credit cost, and per-node result counts.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | UUID | Yes | The run to summarize |

**Returns:**
```json
{
  "run_id": "...",
  "workflow_id": "...",
  "status": "completed",
  "duration_ms": 8420,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 },
  "nodes": { "total": 5, "completed": 5, "failed": 0, "skipped": 0 }
}
```

**Error codes:** `NOT_FOUND`

---

## Common error codes

| Code | Meaning |
|---|---|
| `NOT_FOUND` | The resource does not exist or is not accessible to the authenticated user |
| `FORBIDDEN` | The user does not own or have write access to the resource |
| `MISSING_PARAMS` | A `lens_run` call is missing required parameter values; response includes `missing` list |
| `MISSING_LENSER` | No `lenser_id` was provided and `LENSERFIGHT_LENSER_ID` is not set |
| `SLOTS_FULL` | All 26 contender slots in a battle are assigned |
| `CONFIRMATION_REQUIRED` | A destructive transition requires `confirm: true` |
| `INVALID_TRANSITION` | The requested status transition is not allowed in the battle lifecycle |
| `BAD_INPUT` | Required input combination not satisfied (e.g., neither `version_id` nor `semver` provided) |
