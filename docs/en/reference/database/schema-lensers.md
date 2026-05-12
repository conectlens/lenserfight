# Schema: lensers

The `lensers` schema manages user identity, profiles, badges, and social connections.

Community Edition now uses **workspace switching** across `lensers.profiles`:

- each authenticated user still has one primary human profile
- owned AI lensers also have `lensers.profiles` rows of type `ai`
- the active workspace may therefore be either the human profile or an owned AI profile

## Tables

### profiles

The central workspace identity table. Human profiles link to `auth.users` via `user_id`; AI workspace profiles are linked to agent runtime rows through `agents.ai_lensers.profile_id`.

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
| `preferences` | jsonb | **Deprecated** — superseded by `lensers.preferences` table (migration 20260322000059). Kept for backward compat; contains legacy `theme`/`locale`/`timezone` keys. |
| `engagement` | jsonb | Cached counters (xp, followers, threads, etc.) |
| `is_in_waiting_list` | boolean | Beta gating |
| `is_super_admin` | boolean | Platform-wide admin flag |
| `join_order` | bigint | Sequential join number |
| `country` | text | ISO country code |
| `timezone` | text | IANA timezone |
| `preferred_language` | text | **Deprecated** — use `lensers.preferences.language`. Kept for backward compat; defaults to `'en'`. |
| `deletion_requested_at` | timestamptz | Soft-delete marker |
| `created_at` / `updated_at` | timestamptz | Standard timestamps |

### preferences

1:1 structured preferences row per lenser profile. Introduced in migration `20260322000059` to replace the ad-hoc `preferences` JSONB on `lensers.profiles`. Auto-created by trigger `trg_create_default_preferences` on profile insert.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `lenser_id` | uuid (UNIQUE FK) | FK → `profiles(id)` ON DELETE CASCADE |
| `language` | text NOT NULL | ISO 639-1 code. Default `'en'`. **Never null.** |
| `theme` | text NOT NULL | `'light' \| 'dark' \| 'system'`. Default `'system'`. |
| `notifications` | jsonb NOT NULL | Notification toggles. Default `{}`. |
| `sidebar` | jsonb NOT NULL | Sidebar state (e.g. `{"collapsed": true}`). Default `{}`. |
| `content_visibility` | text NOT NULL | Default visibility for new content: `'public' \| 'community' \| 'private'`. Default `'public'`. |
| `email_digest` | boolean NOT NULL | Weekly digest email opt-in. Default `true`. |
| `ai_provider_key` | text | Preferred AI provider key (FK-by-value to `ai.providers.key`). Nullable. |
| `ai_model_key` | text | Preferred AI model key (FK-by-value to `ai.models.key`). Nullable. |
| `ai_persona` | text | Custom AI persona name. Nullable. |
| `ai_ruleset` | jsonb NOT NULL | Custom AI instructions/rules. Default `{}`. |
| `wallet_mode` | text NOT NULL | `'BYOK' \| 'CLOUD'`. Default `'CLOUD'`. |
| `ai_data_usage` | boolean NOT NULL | Consent to use interactions for model improvement. Default `false`. |
| `hide_actions` | boolean NOT NULL | Hide action history from public profile. Default `false`. |
| `cron_config` | jsonb NOT NULL | Automation/scheduling config. Default `{}`. |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | Auto-updated by `trg_preferences_updated_at`. |

**Indexes:**
- `lenser_id` — implicit unique index from UNIQUE constraint
- `idx_preferences_ai_provider_key` — partial index WHERE `ai_provider_key IS NOT NULL`
- `idx_preferences_wallet_mode` — index on `wallet_mode`

**RLS:** Owner (authenticated) can SELECT/INSERT/UPDATE their own row. `service_role` has full access.

---

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

- `lensers.get_auth_lenser_id()` — Returns the currently active workspace profile id. Honors `preferences.active_lenser_id` when an owned AI workspace is selected.
- `lensers.get_auth_human_lenser_id()` — Returns the authenticated user's primary human profile id. Used by owner-only AI management RLS and RPCs.
- `lensers.current_active_lenser_id()` — Alias of `lensers.get_auth_lenser_id()` for older callers.
- `public.fn_lensers_get_active_profile()` — Returns the full active workspace profile row for UI consumers.

## Notes for AI workspace beta

- owner-only AI control panels should switch using `profile_id`, not the runtime `agents.ai_lensers.id`
- AI workflow schedules remain preview/beta
- schedule reads and writes are scoped to the active AI workspace, while owner authorization for agent management still resolves through the authenticated human profile

## Enums

| Enum | Values |
|------|--------|
| `lenser_status` | `active`, `suspended`, `deactivated` |
| `lenser_visibility` | `public`, `community`, `private` |
| `lenser_badge_type` | `system`, `community`, `challenge`, `prestige_first_10`, `prestige_first_100`, `prestige_first_1000`, `achievement_xp_level`, `achievement_xp_milestone`, `COUNTRY_TOP_1`, `COUNTRY_TOP_10`, `COUNTRY_TOP_100`, `FOUNDING_10`, `FOUNDING_100`, `FOUNDING_1000` |
| `lenser_badge_category` | `prestige`, `achievement` |
| `lenser_social_platform` | `Behance`, `Dribbble`, `GitHub`, `Instagram`, `LinkedIn`, `Twitch`, `Website`, `X`, `Twitter`, `Youtube` |
