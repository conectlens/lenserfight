-- =============================================================================
-- 4C. AI MODEL PRICING SNAPSHOT
-- =============================================================================
-- Local seed snapshot used by the agent control room to sort models by cost.
-- Models without a row remain visible in the UI and render as "Pricing unavailable".

DELETE FROM ai.model_pricing;

WITH pricing_seed AS (
  SELECT *
  FROM (
    VALUES
      ('openai', 'gpt-5.2', 'tokens', NULL::numeric, 0.01000000::numeric, 0.03000000::numeric),
      ('openai', 'gpt-4o', 'tokens', NULL::numeric, 0.00500000::numeric, 0.01500000::numeric),
      ('openai', 'gpt-5.4', 'tokens', NULL::numeric, 0.01200000::numeric, 0.03600000::numeric),
      ('openai', 'gpt-5.4-mini', 'tokens', NULL::numeric, 0.00200000::numeric, 0.00800000::numeric),
      ('openai', 'gpt-5.4-nano', 'tokens', NULL::numeric, 0.00050000::numeric, 0.00200000::numeric),
      ('openai', 'gpt-5.4-pro', 'tokens', NULL::numeric, 0.03000000::numeric, 0.12000000::numeric),

      ('anthropic', 'claude-opus-4-6', 'tokens', NULL::numeric, 0.01500000::numeric, 0.07500000::numeric),
      ('anthropic', 'claude-sonnet-4-6', 'tokens', NULL::numeric, 0.00300000::numeric, 0.01500000::numeric),
      ('anthropic', 'claude-haiku-4-5', 'tokens', NULL::numeric, 0.00080000::numeric, 0.00400000::numeric),
      ('anthropic', 'claude-sonnet-4-5', 'tokens', NULL::numeric, 0.00300000::numeric, 0.01500000::numeric),
      ('anthropic', 'claude-sonnet-4-0', 'tokens', NULL::numeric, 0.00300000::numeric, 0.01500000::numeric),
      ('anthropic', 'claude-haiku-3-5', 'tokens', NULL::numeric, 0.00080000::numeric, 0.00400000::numeric),

      ('google', 'gemini-2.5-pro', 'tokens', NULL::numeric, 0.00350000::numeric, 0.01050000::numeric),
      ('google', 'gemini-2.5-flash', 'tokens', NULL::numeric, 0.00035000::numeric, 0.00105000::numeric),
      ('google', 'gemini-3-pro-preview', 'tokens', NULL::numeric, 0.00400000::numeric, 0.01200000::numeric),
      ('google', 'gemini-3-flash-preview', 'tokens', NULL::numeric, 0.00040000::numeric, 0.00120000::numeric),
      ('google', 'gemini-2.5-flash-lite', 'tokens', NULL::numeric, 0.00010000::numeric, 0.00040000::numeric),
      ('google', 'gemini-3.1-pro-preview', 'tokens', NULL::numeric, 0.00450000::numeric, 0.01350000::numeric),
      ('google', 'gemini-3.1-flash-lite-preview', 'tokens', NULL::numeric, 0.00012000::numeric, 0.00045000::numeric),

      ('mistral', 'mistral-large-3', 'tokens', NULL::numeric, 0.00200000::numeric, 0.00600000::numeric),
      ('mistral', 'magistral-medium-1.2', 'tokens', NULL::numeric, 0.00100000::numeric, 0.00300000::numeric),
      ('mistral', 'magistral-small-1.2', 'tokens', NULL::numeric, 0.00020000::numeric, 0.00060000::numeric),

      ('openai', 'dall-e-4', 'image', 0.0800000000::numeric, 0::numeric, 0::numeric),
      ('openai', 'sora-2.0', 'video_second', 0.2500000000::numeric, 0::numeric, 0::numeric),
      ('google', 'imagen-4', 'image', 0.0400000000::numeric, 0::numeric, 0::numeric),
      ('google', 'veo-3', 'video_second', 0.2000000000::numeric, 0::numeric, 0::numeric),
      ('google', 'lyria-2', 'audio_second', 0.0300000000::numeric, 0::numeric, 0::numeric),
      ('stability', 'stable-diffusion-4', 'image', 0.0200000000::numeric, 0::numeric, 0::numeric),
      ('elevenlabs', 'elevenlabs-v4', 'audio_second', 0.0012000000::numeric, 0::numeric, 0::numeric),
      ('midjourney', 'midjourney-7', 'image', 0.0500000000::numeric, 0::numeric, 0::numeric),
      ('kling', 'kling-2.0', 'video_second', 0.1800000000::numeric, 0::numeric, 0::numeric),
      ('suno', 'suno-v5', 'audio_second', 0.0250000000::numeric, 0::numeric, 0::numeric)
  ) AS t(
    provider_key,
    model_key,
    unit_type,
    cost_per_unit,
    input_cost_per_1k_tokens,
    output_cost_per_1k_tokens
  )
),
resolved AS (
  SELECT
    m.id AS model_id,
    pricing_seed.unit_type::ai.unit_type_enum AS unit_type,
    pricing_seed.cost_per_unit,
    pricing_seed.input_cost_per_1k_tokens,
    pricing_seed.output_cost_per_1k_tokens
  FROM pricing_seed
  JOIN ai.providers p
    ON p.key = pricing_seed.provider_key
  JOIN ai.models m
    ON m.provider_id = p.id
   AND m.key = pricing_seed.model_key
)
INSERT INTO ai.model_pricing (
  model_id,
  unit_type,
  cost_per_unit,
  input_cost_per_1k_tokens,
  output_cost_per_1k_tokens
)
SELECT
  model_id,
  unit_type,
  cost_per_unit,
  input_cost_per_1k_tokens,
  output_cost_per_1k_tokens
FROM resolved;

WITH modality_seed AS (
  SELECT *
  FROM (
    VALUES
      ('openai',     'sora-2.0',      'video', 0.2500000000::numeric, 'per_second'),
      ('google',     'veo-3',         'video', 0.2000000000::numeric, 'per_second'),
      ('kling',      'kling-2.0',     'video', 0.1800000000::numeric, 'per_second'),
      ('elevenlabs', 'elevenlabs-v4', 'audio', 0.0012000000::numeric, 'per_second'),
      ('suno',       'suno-v5',       'audio', 0.0250000000::numeric, 'per_second'),
      ('google',     'lyria-2',       'audio', 0.0300000000::numeric, 'per_second')
  ) AS t(provider_key, model_key, output_modality, credit_rate, rate_unit)
),
resolved_modalities AS (
  SELECT
    m.id AS model_id,
    modality_seed.output_modality,
    modality_seed.credit_rate,
    modality_seed.rate_unit
  FROM modality_seed
  JOIN ai.providers p
    ON p.key = modality_seed.provider_key
  JOIN ai.models m
    ON m.provider_id = p.id
   AND m.key = modality_seed.model_key
)
INSERT INTO ai.modality_pricing (
  model_id,
  output_modality,
  credit_rate,
  rate_unit,
  is_active
)
SELECT
  model_id,
  output_modality,
  credit_rate,
  rate_unit,
  TRUE
FROM resolved_modalities
ON CONFLICT (model_id, output_modality) DO UPDATE
SET credit_rate = EXCLUDED.credit_rate,
    rate_unit   = EXCLUDED.rate_unit,
    is_active   = TRUE,
    updated_at  = now();
