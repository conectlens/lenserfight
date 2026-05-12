# Lens Versioning Schema

## Tables

### `lenses.versions`

Immutable snapshots of a lens's template body. Published versions cannot be modified.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `lens_id` | uuid | FK -> `lenses.lenses` |
| `version_number` | int | Auto-incremented per lens |
| `template_body` | text | Lens template with `{{variable}}` placeholders. **Min 50 chars.** |
| `status` | content_status | `draft` -> `published` -> `archived` |
| `changelog` | text | Optional release note |
| `parent_version_id` | uuid | FK -> self (for forked versions) |
| `published_at` | timestamptz | Set automatically on publish |
| `created_at` | timestamptz | |

**Constraints:**
- `lens_versions_template_body_min_length`: `length(trim(template_body)) >= 50` for ALL statuses.
- `published_at` is non-null if and only if `status = 'published'` (CHECK constraint).

**Note:** `template_body` was removed from `lenses.lenses` in migration `20260324000000`. The canonical content now lives exclusively in `lenses.versions`.

### `lenses.version_parameters`

Typed parameter definitions per version. Parameters belong to versions, not to the lens asset.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `version_id` | uuid | FK -> `lenses.versions` |
| `key` | text | Template placeholder name |
| `type` | text | `text`, `number`, `boolean`, `select`, `textarea`, `json` |
| `required` | boolean | |
| `default_value` | text | |
| `validation_schema` | jsonb | Optional JSON Schema for validation |
| `options` | jsonb | For `select` type: `[{label, value}]` |

### `lenses.parameters` (DEPRECATED)

Legacy parameter definitions at the lens level. Use `lenses.version_parameters` instead.

### `lenses.version_resources`

Junction table binding resources to named version slots.

| Column | Type | Notes |
|--------|------|-------|
| `version_id` | uuid | FK -> `lenses.versions` |
| `resource_id` | uuid | FK -> `ai.resources` |
| `binding_key` | text | Named slot: `context_doc`, `reference_image`, etc. |

## Views

### `lenses.vw_lens_version_history`

All versions with parameter count. Use `.eq('status', 'published')` to filter published-only.

### `lenses.vw_published_versions`

Published versions only, with parameter count.

### `lenses.vw_lenses`

Lenses with latest non-archived version metadata (via LATERAL join), original translation, and author profile. `template_body` is sourced from the version, not from the lens row.

### `lenses.vw_fork_history`

Recursive fork ancestry chain. Query by `lens_id` to get all ancestors. Depth 1 = immediate parent. Capped at 20 levels.

## RPCs

| Function | Security | Description |
|----------|----------|-------------|
| `lenses.fn_create_lens(...)` | DEFINER | Atomic lens creation: lens + version 1 + translation + tags. |
| `lenses.fn_update_lens(...)` | DEFINER | Atomic lens update: visibility, template body (via version upsert), translation, tags. |
| `lenses.fn_upsert_draft_version(p_lens_id, p_template_body, ...)` | DEFINER | Creates/updates draft version. Validates 50-char minimum. |
| `lenses.fn_publish_version(p_version_id)` | DEFINER | Ownership check + atomic draft -> published transition. |
| `lenses.fn_clone_lens(p_source_lens_id, p_version_id)` | DEFINER | Clones from published version of public+published lens only. |
| `lenses.fn_list_versions(p_lens_id)` | INVOKER | Lists versions descending. Caller RLS applies. |

## Architecture

### Version lifecycle

```
draft -> published -> archived
```

- **Draft**: Editable. Only one draft per lens at a time. `fn_upsert_draft_version` reuses existing draft or creates new version.
- **Published**: Immutable. `published_at` is set. Cannot be modified.
- **Archived**: Soft-deleted. Excluded from "latest version" resolution in views.

### Content ownership

`template_body` lives exclusively in `lenses.versions`. The `lenses.lenses` table stores only metadata (visibility, status, fork lineage). This eliminates the previous dual-write sync via triggers.

### Cloning rules

- Only public + published lenses can be cloned.
- Only published versions can be selected as clone source.
- Cloned lens is created as private with `parent_lens_id` set to source.

## Rollback

```sql
-- See bottom of supabase/migrations/20260324000000_lens_schema_refactor.sql
```
