---
title: Thread Tools — MCP Server
description: Reference for the 5 thread tools in the LenserFight MCP server — create, list, get, update, and delete content-feed threads for the authenticated user.
---

# Thread Tools

The MCP server provides **5 tools** for managing content-feed threads on behalf of the authenticated LenserFight user.

Tools follow the sector-standard `verb_noun` naming convention.

| Class | Count | What it does |
|---|---|---|
| [Read](#read) | 2 | List your threads, fetch one thread |
| [Write](#write) | 2 | Create a thread, update title/content/visibility |
| [Destructive](#destructive) | 1 | Delete a thread |

**Underlying RPCs.** All five tools call existing public RPCs already used by the web app and the `lf` CLI (`fn_content_create_thread`, `fn_content_get_personal_threads`, `fn_get_thread_by_id_private`, `fn_get_entity_translation`, `fn_update_thread_translation`, `fn_update_thread_visibility`, `fn_delete_thread`) — no new database functions were added for this tool set.

**Authorship.** Every RPC resolves the acting lenser server-side from the caller's authenticated session (`lensers.get_auth_lenser_id()`). Thread authorship always follows the MCP session's signed-in user — it can never be spoofed by a client-supplied id, and it is unrelated to any AI Lenser (agent) identity.

**Ownership scope.** `get_thread`, `update_thread`, and `delete_thread` only ever see threads owned by the authenticated caller — the underlying RPCs return `NULL` (read) or silently no-op (write) for threads owned by someone else, even if that thread is public. Use `list_my_threads` or the public web feed to read other authors' public threads.

---

## Read

### `list_my_threads`

List the authenticated user's personalized thread feed, newest activity first.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number (1–100) | No | `20` | Page size |
| `offset` | number (≥ 0) | No | `0` | Pagination offset |

**Returns** `{ items, limit, offset, has_more }` — each item includes title, content, author profile, tags, reaction totals, and reply count.

**RPC** `public.fn_content_get_personal_threads`

---

### `get_thread`

Fetch one thread owned by the authenticated user, including its title and content.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `thread_id` | UUID | Yes | The thread to retrieve |

**Returns** The thread row hydrated with its original title/content translation.

**Error codes** `NOT_FOUND`

**RPC** `public.fn_get_thread_by_id_private` + `public.fn_get_entity_translation`

---

## Write

### `create_thread`

Create a content-feed thread posted as the authenticated user.

**Parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string (1–200) | Yes | — | Thread title |
| `content` | string (≥ 1) | Yes | — | Thread body content |
| `visibility` | `'public' \| 'community' \| 'private'` | No | `'public'` | Who can discover the thread |
| `tag_ids` | UUID[] | No | `[]` | Existing tag UUIDs to attach |

**Returns** `{ id }`

**Error codes** `UNAUTHENTICATED`

**RPC** `public.fn_content_create_thread`

---

### `update_thread`

Update a thread you own. At least one of `title`, `content`, or `visibility` must be supplied.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `thread_id` | UUID | Yes | The thread to update |
| `title` | string (1–200) | No | New title — title and content are rewritten together; the omitted one keeps its current value |
| `content` | string (≥ 1) | No | New body content |
| `visibility` | `'public' \| 'community' \| 'private'` | No | New visibility |

**Returns** `{ thread_id, updated: true }`

**Error codes** `VALIDATION_ERROR` (no field supplied) · `NOT_FOUND`

**RPC** `public.fn_update_thread_translation` + `public.fn_update_thread_visibility`

---

## Destructive

### `delete_thread`

Permanently delete a thread you own. Requires explicit `confirm: true`.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `thread_id` | UUID | Yes | The thread to delete |
| `confirm` | `true` (literal) | Yes | Must be exactly `true` |

**Returns** `{ thread_id, deleted: true }`

**RPC** `public.fn_delete_thread` — silently no-ops if the thread does not exist or is not owned by the caller.
