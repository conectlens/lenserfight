# Schema: ai

The `ai` schema manages the AI model registry and generation tracking. Models are referenced by battles (as AI contenders and scorers) and by the AI chat/generation features.

## Tables

### models

Registry of available AI models.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `slug` | text | Unique model identifier (e.g., `gpt-4o-seed`) |
| `name` | text | Display name |
| `provider` | `provider_enum` | `openai`, `anthropic`, `google`, `custom`, `xai`, `meta` |
| `version` | text | Model version string |
| `provider_url` | text | Link to provider documentation |
| `description` | text | Model description |
| `capabilities` | `ai_capability_enum[]` | Array of `text`, `image`, `code`, `music` |
| `temperature` | numeric | Default temperature setting |
| `max_tokens` | integer | Maximum token output |
| `pricing_tier` | `pricing_tier_enum` | `free`, `pro`, `enterprise` |
| `is_public` | boolean | Whether visible to all users |
| `created_at` | timestamptz | |

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

## Triggers

- `ai_generations_media_owner_enforce` — Ensures `media_id` owner matches `lenser_id` before insert/update.

## Battle integration

AI models participate in battles as contenders (`contender_type = 'ai_model'`) and score submissions as judges (`scorecards.scorer_model_id`).

```
ai.models.id ←── battles.contenders.contender_ref_id (when type = 'ai_model')
ai.models.id ←── battles.scorecards.scorer_model_id
```

## RLS

- `ai_models_read_all` — All users (including anonymous) can read model metadata.
- Generation write policies — Only the owning lenser can create/delete their generations.

## Enums

| Enum | Values |
|------|--------|
| `provider_enum` | `openai`, `anthropic`, `google`, `custom`, `xai`, `meta` |
| `ai_capability_enum` | `text`, `image`, `code`, `music` |
