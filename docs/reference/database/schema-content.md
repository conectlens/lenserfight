# Schema: content

The `content` schema manages all forum and community content — threads, replies, prompt templates, tags, reactions, translations, and media.

## Tables

### threads

Forum discussion threads created by lensers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles`, default `lensers.get_auth_lenser_id()` |
| `visibility` | `visibility_enum` | `public`, `community`, `private` |
| `view_count` | integer | Cached counter |
| `reply_count` | integer | Cached counter, updated by trigger |
| `thumbnail_url` | text | Optional thread thumbnail |
| `linked_prompt_id` | uuid | FK → `content.prompt_templates(id)` ON DELETE SET NULL. Replaces `prompt_data`. |
| `prompt_data` | jsonb | **DEPRECATED** — use `linked_prompt_id`. Retained for backward compatibility. |
| `created_at` / `updated_at` | timestamptz | |

### thread_replies

Replies within a thread.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `thread_id` | uuid | FK → threads |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `content` | text | Reply body |
| `parent_reply_id` | uuid | FK → thread_replies (nested replies), nullable |
| `deleted_at` | timestamptz | Soft delete timestamp; NULL = active |
| `created_at` / `updated_at` | timestamptz | |

### prompt_templates

User-created prompt templates shared in the community.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles`, default `lensers.get_auth_lenser_id()` |
| `visibility` | `visibility_enum` | |
| `parent_prompt_id` | uuid | FK → prompt_templates (fork origin), nullable |
| `forked_from_execution_id` | uuid | FK → execution record, nullable |
| `created_at` / `updated_at` | timestamptz | |

### entity_translations

Polymorphic translation table for threads and prompt templates. Replaces the former `thread_translations` and `prompt_translations` tables.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | `thread`, `prompt_template` |
| `entity_id` | uuid | References the typed entity |
| `language_code` | text | FK → `core.languages(code)` ON DELETE RESTRICT |
| `title` | text | |
| `description` | text | Prompt-only; nullable for threads |
| `content` | text | Body text |
| `params` | jsonb | Prompt parameterization; nullable for threads |
| `is_original` | boolean | `true` for the author's original language version |
| `created_at` | timestamptz | |

**Unique constraint:** `(entity_type, entity_id, language_code)`

**Indexes:**
- `(entity_type, entity_id)` — entity lookup
- `(entity_id, language_code)` — translation lookup
- GIN trigram on `lower(title)` — full-text search

**Migrated from:** `content.prompt_translations` and `content.thread_translations` (dropped).

### reactions

Unified polymorphic reactions table. Replaces the former `prompt_reactions`, `thread_reactions`, and `thread_reply_reactions` tables.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | `thread`, `thread_reply`, `prompt_template` |
| `entity_id` | uuid | References the typed entity |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `reaction` | `reaction_enum` | `like`, `love`, `clap`, `saved`, `copy` |
| `created_at` | timestamptz | |

**Uniqueness:** Partial unique index `(entity_type, entity_id, lenser_id, reaction) WHERE reaction <> 'copy'`. Copy reactions are unlimited; all other reaction types are deduplicated per user per entity.

**Indexes:**
- `(entity_type, entity_id)` — entity reactions
- `(lenser_id, created_at DESC)` — lenser history

**RLS:** lensers can SELECT all, INSERT own, DELETE own.

**Migrated from:** `content.prompt_reactions`, `content.thread_reactions`, `content.thread_reply_reactions` (all dropped).

### tags

Taxonomy system for categorizing content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `name` | text | Tag name |
| `slug` | text | URL-safe identifier |
| `visibility` | `tag_visibility_enum` | `public`, `private`, `hidden` |

### tag_map

Junction table linking tags to entities (threads, prompt templates).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `tag_id` | uuid | FK → tags |
| `entity_type` | `entity_type_enum` | `thread`, `prompt_template` |
| `entity_id` | uuid | Polymorphic reference |

### tag_suggestions

AI-generated tag suggestions for content entities.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | |
| `entity_id` | uuid | |
| `ai_model_id` | uuid | FK → `ai.models(id)` ON DELETE SET NULL. NULL = source unknown or model deleted. |
| `status` | `suggestion_status_enum` | `pending`, `accepted`, `rejected`. Default `pending`. |
| `created_at` | timestamptz | |

### reports

User-submitted content reports.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `reporter_lenser_id` | uuid | FK → `lensers.profiles` |
| `entity_type` | `entity_type_enum` | |
| `entity_id` | uuid | |
| `reason` | `report_reason_enum` | `spam`, `harassment`, `misinformation`, `off_topic`, `other` |
| `created_at` | timestamptz | |

### media_library

Uploaded media files linked to lensers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `url` | text | Storage URL |
| `mime_type` | text | |

## Trigger chain

- `thread_replies_after_insert` → increments `threads.reply_count`
- `trg_sync_thread_count` → updates `analytics.lenser_stats.thread_count`
- `trg_sync_prompt_count` → updates `analytics.lenser_stats.prompt_count`
- `tg_xp_thread_created` → awards XP via `xp.apply()`
- `ensure_public_tag` → prevents attaching non-public tags

## Enums

| Enum | Values |
|------|--------|
| `visibility_enum` | `public`, `community`, `private` |
| `tag_visibility_enum` | `public`, `private`, `hidden` |
| `entity_type_enum` | `thread`, `thread_reply`, `prompt_template` |
| `reaction_enum` | `like`, `love`, `clap`, `saved`, `copy` |
| `report_reason_enum` | `spam`, `harassment`, `misinformation`, `off_topic`, `other` |
| `suggestion_status_enum` | `pending`, `accepted`, `rejected` |
