# Schema: ai

The `ai` schema manages the AI model registry, provider catalog, pricing, and feature routing. Models are referenced by evaluations (as AI contenders and scorers) and by the AI chat/generation features.

## Tables

### providers

Registry of AI model providers (OpenAI, Anthropic, Google, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `key` | text (UNIQUE) | Machine-readable provider key (e.g., `anthropic`) |
| `name` | text | Display name |
| `api_url` | text | Base API endpoint |
| `created_at` | timestamptz | |

### models

Registry of available AI models.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `key` | text (UNIQUE) | Unique model identifier (e.g., `claude-3-7-sonnet`) |
| `name` | text | Display name |
| `provider_id` | uuid NOT NULL | FK → `ai.providers(id)`. Use this for all new code. |
| `provider` | `ai.provider_enum` | **DEPRECATED** — use `provider_id` join to `ai.providers`. Will be dropped once all callers migrate. |
| `version` | text | Model version string |
| `provider_url` | text | Link to provider documentation |
| `description` | text | Model description |
| `capabilities` | `ai_capability_enum[]` | Array of `text_generation`, `image_generation`, `video_generation`, `audio_generation` |
| `temperature` | numeric | Default temperature setting |
| `max_tokens` | integer | Maximum token output |
| `pricing_tier` | `ai.model_tier_enum` | `free`, `paid`, `enterprise`. NULL = no tier restriction. |
| `is_public` | boolean | Whether visible to all users |
| `is_active` | boolean | Whether the model is currently enabled |
| `created_at` | timestamptz | |

### model_pricing

Per-unit pricing for AI models.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `model_id` | uuid | FK → `ai.models(id)` |
| `unit_type` | `ai.unit_type_enum` | `tokens`, `image`, `video_second`, `audio_second`. Default `tokens`. |
| `price_per_unit` | numeric | Cost per billing unit |
| `currency` | text | Currency code (e.g., `USD`) |
| `effective_from` | timestamptz | Pricing valid from this date |
| `created_at` | timestamptz | |

### features

Registry of AI feature keys. Used to enforce referential integrity on `feature_model_policies.feature_key`.

| Column | Type | Notes |
|--------|------|-------|
| `key` | text (PK) | Machine-readable feature key (e.g., `image_generation`, `summarization`) |
| `description` | text | Human-readable description |
| `is_active` | boolean | Whether this feature is currently enabled |

### feature_model_policies

Routing rules that determine which AI model handles a given feature.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `feature_key` | text | FK → `ai.features(key)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `model_id` | uuid | FK → `ai.models(id)` |
| `priority` | integer | Lower = higher priority |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

**Unique constraint:** `(feature_key, model_id)`

### generations

Log of AI generation requests and results.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `model_id` | uuid | FK → models |
| `media_id` | uuid | FK → `content.media_library` (ownership enforced by trigger) |
| `prompt` | text | Input prompt |
| `output` | text | Generated output |
| `token_count` | integer | Tokens used |
| `created_at` | timestamptz | |

### resources

> **Deprecated:** `ai.resources` is superseded by `media.objects`. New code should use the `media` schema. See [Media Schema](/en/reference/database/schema-media).

## Moved tables

### billing.execution_margin_policies _(previously ai.execution_margin_policies)_

Execution margin policies were relocated to the `billing` schema for cohesion (migration `20260440000009`). The `billing.calculate_credit_cost()` function reads from `billing.execution_margin_policies`. Cross-schema FK to `ai.models(id)` is documented.

## Triggers

- `ai_generations_media_owner_enforce` — Ensures `media_id` owner matches `lenser_id` before insert/update.

## Evaluation integration

AI models participate in evaluations as contenders and score submissions as judges. See the execution schema for details on how models are referenced during runs.

## RLS

- `ai_models_read_all` — All users (including anonymous) can read model metadata.
- Generation write policies — Only the owning lenser can create/delete their generations.

## Enums

| Enum | Values |
|------|--------|
| `ai.provider_enum` | `openai`, `anthropic`, `google`, `meta`, `midjourney`, `stability`, `mistral`, `other` |
| `ai.ai_capability_enum` | `text_generation`, `image_generation`, `video_generation`, `audio_generation` |
| `ai.model_tier_enum` | `free`, `paid`, `enterprise`. Relocated from `public.pricing_tier_enum` (deprecated). |
| `ai.unit_type_enum` | `tokens`, `image`, `video_second`, `audio_second` |

> `public.pricing_tier_enum` is **DEPRECATED** — use `ai.model_tier_enum`. Retained only for backward compatibility with external tools.
