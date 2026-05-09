-- =============================================================================
-- 7. AI MODELS  (no-op stub — content moved to 04b_ai_models.sql)
-- =============================================================================
-- ai.models is already populated by 04b_ai_models.sql which runs before
-- 07_ai_lensers.sql.  This file is kept so existing tooling references remain
-- valid; the upsert below is idempotent and produces no changes on a fresh db.

WITH model_seed AS (
  SELECT *
  FROM (
    VALUES
      -- -----------------------------------------------------------------------
      -- OpenAI models
      -- -----------------------------------------------------------------------
      (
        'GPT-5.2',
        ARRAY['chat','reasoning','tools','vision','json_schema']::text[],
        'gpt-5.2',
        'openai',
        400000,
        true,
        true,
        true,
        'https://platform.openai.com/docs/models/compare?model=gpt-5.2',
        false
      ),
      (
        'GPT-4o',
        ARRAY['chat','tools','vision','json_schema']::text[],
        'gpt-4o',
        'openai',
        128000,
        true,
        true,
        true,
        'https://platform.openai.com/docs/models/compare?model=gpt-4o',
        false
      ),
      (
        'GPT-5.4',
        ARRAY['chat','reasoning','tools','vision','json_schema']::text[],
        'gpt-5.4',
        'openai',
        400000,
        true,
        true,
        true,
        'https://platform.openai.com/docs/models/compare?model=gpt-5.4',
        false
      ),
      (
        'GPT-5.4 Mini',
        ARRAY['chat','tools','json_schema']::text[],
        'gpt-5.4-mini',
        'openai',
        400000,
        true,
        true,
        false,
        'https://platform.openai.com/docs/models/compare?model=gpt-5.4-mini',
        false
      ),
      (
        'GPT-5.4 Nano',
        ARRAY['chat','json_schema']::text[],
        'gpt-5.4-nano',
        'openai',
        400000,
        true,
        true,
        false,
        'https://platform.openai.com/docs/models/compare?model=gpt-5.4-nano',
        false
      ),
      (
        'GPT-5.4 Pro',
        ARRAY['chat','reasoning','tools','vision','json_schema']::text[],
        'gpt-5.4-pro',
        'openai',
        400000,
        true,
        true,
        true,
        'https://platform.openai.com/docs/models/compare?model=gpt-5.4-pro',
        false
      ),

      -- -----------------------------------------------------------------------
      -- Anthropic models
      -- -----------------------------------------------------------------------
      (
        'Claude Opus 4.6',
        ARRAY['chat','reasoning','tools']::text[],
        'claude-opus-4-6',
        'anthropic',
        200000,
        true,
        false,
        false,
        'https://docs.anthropic.com/en/docs/about-claude/models/overview',
        false
      ),
      (
        'Claude Sonnet 4.6',
        ARRAY['chat','reasoning','tools']::text[],
        'claude-sonnet-4-6',
        'anthropic',
        200000,
        true,
        false,
        false,
        'https://docs.anthropic.com/en/docs/about-claude/models/overview',
        false
      ),
      (
        'Claude Haiku 4.5',
        ARRAY['chat']::text[],
        'claude-haiku-4-5',
        'anthropic',
        200000,
        false,
        false,
        false,
        'https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4',
        false
      ),
      (
        'Claude Sonnet 4.5',
        ARRAY['chat','reasoning','tools']::text[],
        'claude-sonnet-4-5',
        'anthropic',
        200000,
        true,
        false,
        false,
        'https://docs.anthropic.com/en/docs/about-claude/models/migrating-to-claude-4',
        false
      ),
      (
        'Claude Sonnet 4.0',
        ARRAY['chat','reasoning','tools']::text[],
        'claude-sonnet-4-0',
        'anthropic',
        200000,
        true,
        false,
        false,
        'https://docs.anthropic.com/en/docs/about-claude/models/overview',
        false
      ),
      (
        'Claude Haiku 3.5',
        ARRAY['chat']::text[],
        'claude-haiku-3-5',
        'anthropic',
        200000,
        false,
        false,
        false,
        'https://docs.anthropic.com/en/docs/resources/model-deprecations',
        false
      ),

      -- -----------------------------------------------------------------------
      -- Google models
      -- -----------------------------------------------------------------------
      (
        'Gemini 2.5 Pro',
        ARRAY['chat','reasoning','tools','vision']::text[],
        'gemini-2.5-pro',
        'google',
        2000000,
        true,
        true,
        true,
        'https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro',
        false
      ),
      (
        'Gemini 2.5 Flash',
        ARRAY['chat','tools','vision']::text[],
        'gemini-2.5-flash',
        'google',
        1000000,
        true,
        true,
        true,
        'https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash',
        false
      ),
      (
        'Gemini 3 Pro Preview',
        ARRAY['chat','reasoning','tools','vision']::text[],
        'gemini-3-pro-preview',
        'google',
        2000000,
        true,
        true,
        true,
        'https://ai.google.dev/gemini-api/docs/models',
        false
      ),
      (
        'Gemini 3 Flash Preview',
        ARRAY['chat','tools','vision']::text[],
        'gemini-3-flash-preview',
        'google',
        1000000,
        true,
        true,
        true,
        'https://ai.google.dev/gemini-api/docs/models',
        false
      ),
      (
        'Gemini 2.5 Flash Lite',
        ARRAY['chat','tools']::text[],
        'gemini-2.5-flash-lite',
        'google',
        1000000,
        true,
        true,
        false,
        'https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite',
        false
      ),
      (
        'Gemini 3.1 Pro Preview',
        ARRAY['chat','reasoning','tools','vision']::text[],
        'gemini-3.1-pro-preview',
        'google',
        2000000,
        true,
        true,
        true,
        'https://ai.google.dev/gemini-api/docs/models',
        false
      ),
      (
        'Gemini 3.1 Flash Lite Preview',
        ARRAY['chat','tools']::text[],
        'gemini-3.1-flash-lite-preview',
        'google',
        1000000,
        true,
        true,
        false,
        'https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview',
        false
      ),

      -- -----------------------------------------------------------------------
      -- Mistral models
      -- -----------------------------------------------------------------------
      (
        'Mistral Large 3',
        ARRAY['chat','tools','json_schema']::text[],
        'mistral-large-3',
        'mistral',
        128000,
        true,
        true,
        false,
        'https://docs.mistral.ai/models/mistral-large-3-25-12',
        false
      ),
      (
        'Magistral Medium 1.2',
        ARRAY['chat','reasoning']::text[],
        'magistral-medium-1.2',
        'mistral',
        40000,
        false,
        false,
        false,
        'https://docs.mistral.ai/models/magistral-medium-1-2-25-09',
        false
      ),
      (
        'Magistral Small 1.2',
        ARRAY['chat','reasoning']::text[],
        'magistral-small-1.2',
        'mistral',
        40000,
        false,
        false,
        false,
        'https://docs.mistral.ai/models/magistral-small-1-2-25-09',
        false
      )
  ) AS t(
    name,
    capabilities,
    key,
    provider_key,
    context_window_tokens,
    supports_tools,
    supports_json_schema,
    supports_vision,
    provider_url,
    is_active
  )
),
resolved AS (
  SELECT
    ms.name,
    ms.capabilities,
    ms.key,
    p.id AS provider_id,
    ms.context_window_tokens,
    ms.supports_tools,
    ms.supports_json_schema,
    ms.supports_vision,
    ms.provider_url,
    ms.is_active
  FROM model_seed ms
  JOIN ai.providers p
    ON p.key = ms.provider_key
)

-- Upsert: insert new rows, update existing rows on key conflict
INSERT INTO ai.models (
  name,
  capabilities,
  key,
  provider_id,
  context_window_tokens,
  supports_tools,
  supports_json_schema,
  supports_vision,
  provider_url,
  is_active
)
SELECT
  r.name,
  r.capabilities,
  r.key,
  r.provider_id,
  r.context_window_tokens,
  r.supports_tools,
  r.supports_json_schema,
  r.supports_vision,
  r.provider_url,
  r.is_active
FROM resolved r
ON CONFLICT (key) DO UPDATE SET
  name                   = EXCLUDED.name,
  capabilities           = EXCLUDED.capabilities,
  provider_id            = EXCLUDED.provider_id,
  context_window_tokens  = EXCLUDED.context_window_tokens,
  supports_tools         = EXCLUDED.supports_tools,
  supports_json_schema   = EXCLUDED.supports_json_schema,
  supports_vision        = EXCLUDED.supports_vision,
  provider_url           = EXCLUDED.provider_url,
  is_active              = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- Activate only Google models
-- ---------------------------------------------------------------------------
UPDATE ai.models
SET is_active = true
WHERE key IN (
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview'
);
