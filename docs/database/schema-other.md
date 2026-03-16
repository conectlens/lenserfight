# Schemas: core, system, ops, billing

These schemas handle platform infrastructure. They are **not exposed via PostgREST** and are accessed only through RPC functions or direct database connections.

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
