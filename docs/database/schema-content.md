# Schema: content

The `content` schema manages all forum and community content — threads, replies, prompt templates, tags, reactions, and media.

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
| `created_at` / `updated_at` | timestamptz | |

### thread_replies

Replies within a thread.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `thread_id` | uuid | FK → threads |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `body` | text | Reply content |
| `created_at` / `updated_at` | timestamptz | |

### prompt_templates

User-created prompt templates shared in the community.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `title` | text | |
| `body` | text | Template content with variables |
| `visibility` | `visibility_enum` | |
| `created_at` / `updated_at` | timestamptz | |

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

### reactions

User reactions on content (likes, saves, copies).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `entity_type` | `entity_type_enum` | |
| `entity_id` | uuid | |
| `reaction_type` | `reaction_enum` | `like`, `dislike`, `saved`, `copy` |

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
| `thread_visibility` | `public`, `community`, `private` |
| `tag_visibility_enum` | `public`, `private`, `hidden` |
| `entity_type_enum` | `thread`, `prompt_template` |
| `reaction_enum` | `like`, `dislike`, `saved`, `copy` |
