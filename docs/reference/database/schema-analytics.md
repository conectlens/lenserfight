# Schema: analytics

The `analytics` schema tracks engagement metrics, page views, sharing, and product feedback. Tables in this schema are **not exposed via PostgREST** — all writes happen through `SECURITY DEFINER` RPC functions.

## Tables

### lenser_stats

Aggregated engagement counters per lenser. Updated by triggers on content tables.

| Column | Type | Notes |
|--------|------|-------|
| `lenser_id` | uuid (PK) | FK → `lensers.profiles`, 1:1 relationship |
| `thread_count` | integer | Synced by `content.sync_thread_count()` trigger |
| `prompt_count` | integer | Synced by `content.sync_prompt_count()` trigger |
| `reply_count` | integer | |
| `follower_count` | integer | |
| `following_count` | integer | |
| `updated_at` | timestamptz | |

### lenser_activity

Activity log for tracking user engagement patterns.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `activity_type` | text | Free-text activity category |
| `created_at` | timestamptz | |

### shared_links

Trackable share links for content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | Sharer |
| `target_type` | text | What was shared |
| `target_id` | uuid | |
| `short_code` | text | URL-safe short code |

### share_events

Click/view events on shared links.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `shared_link_id` | uuid | FK → shared_links |
| `created_at` | timestamptz | |

### page_views

Page view tracking across the platform.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `target_type` | `page_view_target_enum` | `thread`, `thread_reply`, `prompt`, `profile`, `page`, `battle` |
| `target_id` | uuid | |
| `viewer_id` | uuid | Optional (NULL for anonymous) |
| `created_at` | timestamptz | |

### tag_activity_events

Tag usage and interaction tracking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `tag_id` | uuid | FK → `content.tags` |
| `entity_type` | `entity_type_enum` | |
| `entity_id` | uuid | |
| `activity_type` | text | e.g., `viewed`, `clicked` |
| `actor_id` | uuid | |

### product_feedback

User feedback submissions with product tagging.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auto-set by trigger from `auth.uid()` |
| `category` | `product_tag_enum` | `bug`, `feature`, `ui_ux`, `general`, `other` |
| `status` | `feedback_status_enum` | `pending`, `in_progress`, `resolved`, `closed` |
| `body` | text | Feedback content |
| `start_date` / `end_date` | timestamptz | Protected by trigger |

## Write pattern

Analytics tables are written to via RPC functions, not direct table access:

```sql
-- Example: log a tag view
SELECT analytics.log_tag_view('thread'::content.entity_type_enum, thread_id, user_id);
```

## Enums

| Enum | Values |
|------|--------|
| `feedback_status_enum` | `pending`, `in_progress`, `resolved`, `closed` |
| `product_tag_enum` | `bug`, `feature`, `ui_ux`, `general`, `other` |
| `page_view_target_enum` | `thread`, `thread_reply`, `prompt`, `profile`, `page`, `battle` |
