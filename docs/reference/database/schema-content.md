# Schema: content

The `content` schema manages forum and community content — threads, replies, tags, reactions, translations, and reaction aggregates.

In Community Edition, this schema should be documented as the home of **threads and shared discovery metadata**, while versioned lenses live in the `lenses` schema.

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
| `linked_lens_id` | uuid | Optional link to a related lens |
| `prompt_data` | jsonb | Deprecated compatibility field |
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

### entity_translations

Polymorphic translation table used for content entities.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | Community Edition commonly uses `thread`, `thread_reply`, `lens`, `workflow` |
| `entity_id` | uuid | References the typed entity |
| `language_code` | text | FK → `core.languages(code)` ON DELETE RESTRICT |
| `title` | text | |
| `description` | text | Optional |
| `content` | text | Body text |
| `params` | jsonb | Optional structured metadata |
| `is_original` | boolean | `true` for the author's original language version |
| `created_at` | timestamptz | |

**Unique constraint:** `(entity_type, entity_id, language_code)`

### reactions

Unified polymorphic reactions table for threads, replies, lenses, and workflows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | `thread`, `thread_reply`, `lens`, `workflow` |
| `entity_id` | uuid | References the typed entity |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `reaction` | `reaction_enum` | `like`, `love`, `clap`, `saved`, `copy` |
| `created_at` | timestamptz | |

**Uniqueness:** Partial unique index `(entity_type, entity_id, lenser_id, reaction) WHERE reaction <> 'copy'`. Copy reactions are unlimited; all other reaction types are deduplicated per user per entity.

### tags

Taxonomy system for categorizing content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `name` | text | Tag name |
| `slug` | text | URL-safe identifier |
| `visibility` | `tag_visibility_enum` | `public`, `private`, `hidden` |

### tag_map

Junction table linking tags to entities.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `tag_id` | uuid | FK → tags |
| `entity_type` | `entity_type_enum` | typically `thread`, `lens`, `workflow` |
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
- `tg_xp_thread_created` → awards XP via `xp.apply()`
- `ensure_public_tag` → prevents attaching non-public tags

## Enums

| Enum | Values |
|------|--------|
| `visibility_enum` | `public`, `community`, `private` |
| `tag_visibility_enum` | `public`, `private`, `hidden` |
| `entity_type_enum` | `thread`, `thread_reply`, `lens`, `workflow` |
| `reaction_enum` | `like`, `love`, `clap`, `saved`, `copy` |
| `report_reason_enum` | `spam`, `harassment`, `misinformation`, `off_topic`, `other` |
| `suggestion_status_enum` | `pending`, `accepted`, `rejected` |
