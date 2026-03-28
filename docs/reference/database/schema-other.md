# Schemas: authz, core, system, ops, billing

These schemas handle platform infrastructure. They are **not exposed via PostgREST** and are accessed only through RPC functions or direct database connections.

## authz

Private authentication support schema for device approval and developer tokens.

### device_approval_requests

Short-lived approval requests created by the CLI and approved in the auth app.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Request ID |
| `user_code` | text | Human-friendly approval code |
| `request_secret_hash` | text | One-way hash of the exchange secret |
| `label` | text | Optional token label |
| `requested_by_user_id` | uuid | Supabase user that started the request |
| `requested_by_lenser_id` | uuid | Lenser profile that started the request |
| `requested_token_ttl_hours` | integer | Requested developer-token TTL, capped server-side |
| `status` | enum | `pending`, `approved`, `exchanged`, `expired` |
| `approved_at` | timestamptz | Approval timestamp |
| `approved_by_user_id` | uuid | Authenticated approver |
| `approved_by_lenser_id` | uuid | Approver lenser profile |
| `developer_token_id` | uuid | Linked developer token row |
| `expires_at` | timestamptz | Approval expiry |
| `exchanged_at` | timestamptz | Token exchange timestamp |
| `created_at` | timestamptz | Request creation time |

### developer_tokens

Time-bounded developer tokens used for CLI and automation workflows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Token ID |
| `lenser_id` | uuid | Owning lenser profile |
| `label` | text | Optional user-supplied label |
| `token_hash` | text | One-way hash of the token value |
| `token_prefix` | text | Short display prefix |
| `status` | enum | `active`, `revoked`, `expired` |
| `issued_from_request_id` | uuid | Optional approval request link |
| `expires_at` | timestamptz | Token expiry |
| `revoked_at` | timestamptz | Revocation time |
| `last_used_at` | timestamptz | Last successful use |
| `created_at` | timestamptz | Token creation time |

The schema is intentionally private and is not listed in `supabase/config.toml` `api.schemas`. Clients must go through the `public.fn_auth_*` RPC wrappers.

## core

Platform-wide configuration and primitives.

### features

Feature flags and capability definitions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `key` | text | Unique feature key, e.g., `ai.chat.basic` |
| `name` | text | Display name |
| `is_active` | boolean | Global feature toggle |

### languages

Supported platform languages.

| Column | Type | Notes |
|--------|------|-------|
| `key` | text (PK) | ISO code, e.g., `en`, `tr`, `zh-CN` |
| `english_name` | text | e.g., "Turkish" |
| `native_name` | text | e.g., "Turkce" |
| `is_rtl` | boolean | Right-to-left flag |
| `is_active` | boolean | |

### settings

Key-value platform settings.

## system

### translations

Internationalization strings for entities across the platform.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `entity_type` | `entity_type_enum` | `challenge`, `prompt`, `thread`, `badge`, etc. |
| `entity_id` | uuid | |
| `field` | `translation_field_enum` | `title`, `body`, `description`, `rules`, `cta`, `name` |
| `language` | text | ISO language code |
| `value` | text | Translated content |

## billing

Payment and subscription management.

### Key tables

- **plans** — Pricing tiers (free, pro, enterprise)
- **product_entitlements** — Feature access per plan (links `core.features` to billing plans)
- **credits** — Consumable credits for AI usage

### Trigger

- `trg_product_entitlements_feature_active` — Validates that entitled features are active.

## ops

Internal operations schema for admin and moderation tools. Not documented publicly — used by the `admin.lenserfight.com` console.

## Enums

| Schema | Enum | Values |
|--------|------|--------|
| `system` | `entity_type_enum` | `challenge`, `challenge_template`, `prompt`, `prompt_template`, `community`, `thread`, `xp_rule`, `pricing_plan`, `badge`, `ai_persona`, `lens` |
| `system` | `translation_field_enum` | `title`, `body`, `description`, `rules`, `cta`, `name` |
| `public` | `pricing_tier_enum` | `free`, `pro`, `enterprise` |
