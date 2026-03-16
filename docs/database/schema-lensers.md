# Schema: lensers

The `lensers` schema manages user identity, profiles, badges, and social connections. Every authenticated user has exactly one `lensers.profiles` row.

## Tables

### profiles

The central user identity table. Links to `auth.users` via `user_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users`, default `auth.uid()` |
| `handle` | text | Unique, rate-limited changes via `last_handle_changed_at` |
| `display_name` | text | Public display name |
| `bio` | text | Optional profile bio |
| `headline` | text | Short tagline |
| `avatar_url` | text | Profile image |
| `banner_url` | text | Profile banner |
| `location` | text | Free-text location |
| `website_url` | text | Normalized (empty → NULL) |
| `status` | `lenser_status` enum | `active`, `suspended`, `deactivated` |
| `visibility` | `lenser_visibility` enum | `public`, `community`, `private` |
| `preferences` | jsonb | Locale, timezone, notification settings |
| `engagement` | jsonb | Cached counters (xp, followers, threads, etc.) |
| `is_in_waiting_list` | boolean | Beta gating |
| `is_super_admin` | boolean | Platform-wide admin flag |
| `join_order` | bigint | Sequential join number |
| `country` | text | ISO country code |
| `timezone` | text | IANA timezone |
| `preferred_language` | text | Default `'en'` |
| `deletion_requested_at` | timestamptz | Soft-delete marker |
| `created_at` / `updated_at` | timestamptz | Standard timestamps |

### badges

Achievement and prestige badges awarded to lensers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → profiles |
| `badge_type` | `lenser_badge_type` enum | e.g., `prestige_first_10`, `achievement_xp_level` |
| `category` | `lenser_badge_category` enum | `prestige` or `achievement` |

### social_links

External social platform links per profile.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → profiles |
| `platform` | `lenser_social_platform` enum | GitHub, X, LinkedIn, etc. |
| `url` | text | Full URL |

### waiting_list

Beta access queue.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `email` | text | Unique |
| `created_at` | timestamptz | |

## Key helper functions

- `lensers.get_auth_lenser_id()` — Returns the `profiles.id` for the currently authenticated user. Used as column defaults and in RLS policies throughout the database.
- `lensers.current_active_lenser_id()` — Similar to above, used by some RPC functions.

## Enums

| Enum | Values |
|------|--------|
| `lenser_status` | `active`, `suspended`, `deactivated` |
| `lenser_visibility` | `public`, `community`, `private` |
| `lenser_badge_type` | `system`, `community`, `challenge`, `prestige_first_10`, `prestige_first_100`, `prestige_first_1000`, `achievement_xp_level`, `achievement_xp_milestone`, `COUNTRY_TOP_1`, `COUNTRY_TOP_10`, `COUNTRY_TOP_100`, `FOUNDING_10`, `FOUNDING_100`, `FOUNDING_1000` |
| `lenser_badge_category` | `prestige`, `achievement` |
| `lenser_social_platform` | `Behance`, `Dribbble`, `GitHub`, `Instagram`, `LinkedIn`, `Twitch`, `Website`, `X`, `Twitter`, `Youtube` |
