# Prompt Versions Schema

Migrations 39–47 introduce prompt versioning, resource attachments, and typed execution inputs.

## Tables

### `content.prompt_versions` (migration 39)

Immutable snapshots of a prompt's template body. Published versions cannot be modified.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `prompt_id` | uuid | FK → `content.prompts` |
| `version_number` | int | Auto-incremented per prompt |
| `template_body` | text | Prompt template with `{{variable}}` placeholders |
| `status` | content_status | `draft` → `published` → `archived` |
| `changelog` | text | Optional release note |
| `parent_version_id` | uuid | FK → self (for forked versions) |
| `published_at` | timestamptz | Set automatically on publish |
| `created_at` | timestamptz | |

**Invariant:** `published_at` is non-null if and only if `status = 'published'` (CHECK constraint).

**Trigger:** `trg_prompts_create_initial_version` — automatically creates version 1 (draft) on every new `content.prompts` insert (migration 46).

### `content.prompt_version_parameters` (migration 40)

Typed parameter definitions per version. Parameters belong to versions, not to the prompt asset.

| Column | Type | Notes |
|--------|------|-------|
| `version_id` | uuid | FK → `content.prompt_versions` |
| `key` | text | Template placeholder name |
| `type` | text | `text`, `number`, `boolean`, `select`, `textarea`, `json` |
| `required` | boolean | |
| `default_value` | text | |
| `validation_schema` | jsonb | Optional JSON Schema for validation |
| `options` | jsonb | For `select` type: `[{label, value}]` |

### `content.resources` (migration 41)

First-class resource registry. Replaces ad-hoc text fields for AI execution inputs.

| Column | Type | Notes |
|--------|------|-------|
| `media_type` | text | `text`, `image`, `audio`, `video`, `document`, `json`, `binary` — TEXT, not enum |
| `mime_type` | text | Ground truth for provider capability validation |
| `storage_bucket` | text | Supabase Storage bucket |
| `object_key` | text | Supabase Storage object key |
| `content_text` | text | Inline content (avoids storage for small text/JSON) |
| `url` | text | External URL reference |

`media_type` is TEXT (not an enum) — extend without migrations.

### `content.version_resources` (migration 41)

Junction table binding resources to named version slots.

| Column | Type | Notes |
|--------|------|-------|
| `version_id` | uuid | FK → `content.prompt_versions` |
| `resource_id` | uuid | FK → `content.resources` |
| `binding_key` | text | Named slot: `context_doc`, `reference_image`, etc. |

### `execution.inputs` (migration 42)

Typed input bindings per execution run. Replaces untyped `input_snapshot` JSONB for versioned executions.

| Column | Type | Notes |
|--------|------|-------|
| `input_type` | text | `parameter`, `resource`, `tool_input` |
| `binding_key` | text | Param key, resource slot, or tool name |
| `scalar_value` | text | For `parameter` type |
| `resource_id` | uuid | FK → `content.resources` |
| `resource_snapshot` | jsonb | Immutable copy of resource at execution time (reproducibility) |

Legacy runs (pre-versioning) have no rows here; their inputs are in `execution.requests.input_snapshot`.

## RLS Summary

All new tables follow the same pattern:
- `service_role_all` — service role has full access.
- `authenticated_select_own` — authenticated users read only their own data (via `lensers.get_auth_lenser_id()`).
- `content.prompt_versions` also allows read of published versions on public prompts (mirrors `content.prompts` policies).

## RPCs

| Function | Security | Description |
|----------|----------|-------------|
| `fn_content_list_prompt_versions(p_prompt_id)` | INVOKER | Lists versions descending. Caller RLS applies. |
| `fn_content_publish_prompt_version(p_version_id)` | DEFINER | Ownership check + atomic status transition. Raises on wrong status or wrong owner. |

## Backfill Note (migration 46)

On apply, migration 46 inserts version 1 for every existing `content.prompts` row that has no version yet. All inserts are idempotent (`WHERE NOT EXISTS`). If `content.prompt_parameters` exists, parameters are copied to version 1.

## Rollback

Each migration includes a rollback comment. In order:

```sql
-- 47: DROP VIEW/FUNCTION
DROP VIEW IF EXISTS content.vw_prompt_published_versions;
DROP FUNCTION IF EXISTS content.fn_content_publish_prompt_version(uuid);
DROP FUNCTION IF EXISTS content.fn_content_list_prompt_versions(uuid);

-- 46: DROP trigger/function (rows must be deleted manually if needed)
DROP TRIGGER IF EXISTS trg_prompts_create_initial_version ON content.prompts;
DROP FUNCTION IF EXISTS content.create_initial_prompt_version();

-- 45: DROP columns
ALTER TABLE ai.models DROP COLUMN IF EXISTS input_modalities;
ALTER TABLE ai.models DROP COLUMN IF EXISTS output_modalities;

-- 44: DROP column
ALTER TABLE execution.prompt_runs DROP COLUMN IF EXISTS version_id;

-- 43: DROP columns
ALTER TABLE execution.artifacts DROP COLUMN IF EXISTS resource_id;
ALTER TABLE execution.artifacts DROP COLUMN IF EXISTS output_type;

-- 42: DROP TABLE
DROP TABLE IF EXISTS execution.inputs;

-- 41: DROP TABLEs
DROP TABLE IF EXISTS content.version_resources;
DROP TABLE IF EXISTS content.resources;

-- 40: DROP TABLE
DROP TABLE IF EXISTS content.prompt_version_parameters;

-- 39: DROP TABLE
DROP TABLE IF EXISTS content.prompt_versions;
```
