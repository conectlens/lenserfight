---
title: Lens Tools — MCP Server
description: Reference for all 14 lens tools in the LenserFight MCP server — list, search, get, create, update, fork, run, validate, extract params, archive, delete, visibility, and versioning.
---

# Lens Tools

The MCP server provides **14 tools** for managing and executing lenses. Lenses are versioned prompt templates that accept named parameters — `[[ParamName]]` for required, `[[ParamName!]]` for optional.

---

## `lens_list`

List lenses with optional filters and pagination.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Number of results per page |
| `offset` | number (≥ 0) | No | `0` | Pagination offset |
| `visibility` | `'public' \| 'community' \| 'private'` | No | — | Filter by visibility tier |
| `status` | `'draft' \| 'published' \| 'archived'` | No | — | Filter by status |
| `lenser_id` | UUID | No | — | Filter to a specific lenser |
| `include_archived` | boolean | No | `false` | Include archived lenses |

**Returns** `{ items, total, limit, offset, has_more }`

---

## `lens_search`

Full-text search lenses by query string.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string (≥ 1 char) | Yes | — | Search terms |
| `visibility` | `'public' \| 'community' \| 'private'` | No | — | Filter by visibility |
| `limit` | number (1–100) | No | `20` | Results per page |
| `offset` | number | No | `0` | Pagination offset |

**Returns** Paginated results matching the query.

---

## `lens_get`

Get a lens including its head version template body and full parameter list.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to retrieve |

**Returns** Full lens object with `versions.template_body` and `version_parameters[{ id, label, optional }]`.

---

## `lens_create`

Create a new lens with a template body and optional parameter declarations.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200 chars) | Yes | — | Display name |
| `template_body` | string (≥ 50 chars) | Yes | — | Prompt template. Use `[[Name]]` for required params, `[[Name!]]` for optional. |
| `visibility` | `'public' \| 'community' \| 'private'` | No | `'public'` | Initial visibility tier |
| `params` | `Array<{ label: string, optional: boolean }>` | No | — | Explicit parameter declarations (inferred from template if omitted) |

**Returns** New lens object with its `id`.

**Example template body:**

```
Summarize the following text in [[Language]] using a [[Style!]] tone.

Text: [[InputText]]
```

This template has two required parameters (`Language`, `InputText`) and one optional parameter (`Style`).

---

## `lens_update`

Create an immutable new version of an existing lens. The original version is never modified.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to update |
| `template_body` | string (≥ 50 chars) | No | New template body (omit to keep existing) |
| `visibility` | `'public' \| 'community' \| 'private'` | No | New visibility |
| `params` | `Array<{ label: string, optional: boolean }>` | No | Updated parameter list |

**Returns** The new version object. The lens `head_version_id` is updated to point to the new version.

---

## `lens_archive`

Archive a lens. Archived lenses are hidden from listings but not deleted and can be restored.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to archive |

**Returns** `{ lens_id, status: 'archived' }`

**Error codes** `NOT_FOUND` · `FORBIDDEN`

---

## `lens_delete`

Soft-delete a lens. Requires explicit confirmation to prevent accidental deletion.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to delete |
| `confirm` | `true` (literal) | Yes | Must be exactly `true` |

**Returns** `{ deleted: true, ... }`

**Error codes** `NOT_FOUND` · `FORBIDDEN`

> Deletion is soft — the lens record is marked deleted and excluded from all queries. It is not physically removed from the database.

---

## `lens_set_visibility`

Change the visibility tier of a lens.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to update |
| `visibility` | `'public' \| 'community' \| 'private'` | Yes | New visibility |

**Returns** `{ lens_id, visibility }`

**Visibility tiers:**

| Tier | Who can see it |
|---|---|
| `public` | Everyone, including unauthenticated users |
| `community` | Authenticated LenserFight members |
| `private` | Only the owning lenser |

---

## `lens_run`

Resolve a lens template by substituting parameter tokens with provided values. Returns a ready-to-use prompt string. **This tool does not call any LLM** — the calling assistant decides whether and how to use the resolved prompt.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `lens_id` | UUID | Yes | — | The lens to run |
| `version_id` | UUID | No | Head version | Specific version to use |
| `param_values` | `Record<string, string>` | No | `{}` | Key-value map of parameter names to values (case-insensitive keys) |
| `workflow_id` | UUID | No | — | If provided, creates a `workflow_runs` record with `status='pending'` for tracking |

**Returns**

```json
{
  "resolved_prompt": "Summarize the following text in English using a formal tone.\n\nText: The quick brown fox.",
  "run_id": "uuid-or-null",
  "lens_id": "...",
  "version_id": "...",
  "params_used": ["Language", "InputText"],
  "estimated_input_tokens": 42,
  "persisted": true
}
```

**Token resolution rules:**

- Each `[[Name]]` token is replaced with `param_values[name]` (case-insensitive lookup).
- Required tokens with no provided value → `MISSING_PARAMS` error with a `missing` array.
- Optional tokens (`[[Name!]]`) with no provided value → replaced with an empty string `""`.

**Error codes** `NOT_FOUND` · `MISSING_PARAMS` (includes `{ missing: string[] }`)

---

## `lens_fork`

Fork a public or community lens into a new lens owned by the caller. The fork is linked to its source via `parent_lens_id`.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `source_lens_id` | UUID | Yes | — | The lens to fork |
| `title` | string (1–200 chars) | No | `"Fork of {id}"` | Title for the new lens |
| `template_body` | string (≥ 50 chars) | No | Copied from source | Custom template body (overrides source) |
| `visibility` | `'public' \| 'community' \| 'private'` | No | `'public'` | Initial visibility of the fork |

**Returns** New lens object with `forked_from: source_lens_id`.

---

## `lens_validate_params`

Check whether a set of parameter values satisfies the schema of a lens version.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to validate against |
| `version_id` | UUID | No | Specific version (defaults to head) |
| `values` | `Record<string, string>` | Yes | Parameter values to validate (case-insensitive keys) |

**Returns**

```json
{
  "valid": false,
  "missing": ["Language"],
  "unknown": ["Typo"],
  "total_params": 3,
  "provided": 2
}
```

Use this tool before calling `lens_run` when you want to surface validation errors to the user without attempting execution.

---

## `lens_extract_params`

Extract the parameter schema from a lens template — lists every `[[token]]` in the template and whether it is required or optional.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens to inspect |
| `version_id` | UUID | No | Specific version (defaults to head) |

**Returns**

```json
{
  "lens_id": "...",
  "version_id": "...",
  "params": [
    { "id": "uuid", "label": "Language", "optional": false },
    { "id": "uuid", "label": "Style", "optional": true }
  ],
  "raw_tokens_in_template": ["[[Language]]", "[[Style!]]", "[[InputText]]"]
}
```

---

## `lens_versions`

List all versions of a lens, ordered newest first.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The lens whose versions to list |

**Returns** `[{ id, semver, created_at, changelog }]` — or `{ lens_id, versions: [], count: 0 }` if no versions exist.

---

## `lens_get_version`

Get the full details of a specific lens version, including template body and parameter list.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lens_id` | UUID | Yes | The parent lens |
| `version_id` | UUID | No | Version UUID (one of `version_id` or `semver` required) |
| `semver` | string | No | Semantic version string, e.g. `"1.2.0"` |

**Returns**

```json
{
  "id": "...",
  "semver": "1.2.0",
  "template_body": "...",
  "changelog": "Added Style parameter.",
  "created_at": "2026-05-01T00:00:00Z",
  "version_parameters": [
    { "id": "...", "label": "Language", "optional": false },
    { "id": "...", "label": "Style", "optional": true }
  ]
}
```

**Error codes** `BAD_INPUT` (if neither `version_id` nor `semver` provided) · `NOT_FOUND`
