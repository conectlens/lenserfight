-- =============================================================================
-- 4B. AI MODELS  (moved here from 07_ai_models.sql to run before 07_ai_lensers.sql)
-- =============================================================================
-- ai.providers must already exist (seeded by 04_ai_providers.sql).
-- ai_lensers profiles (07_ai_lensers.sql) JOIN on ai.models, so models must be
-- present first.  The original 07_ai_models.sql is now a no-op stub.

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
      ),

      -- -----------------------------------------------------------------------
      -- OpenAI generative media models
      -- -----------------------------------------------------------------------
      (
        'DALL-E 4',
        ARRAY['image_generation']::text[],
        'dall-e-4',
        'openai',
        0,
        false,
        false,
        false,
        'https://platform.openai.com/docs/models/dall-e',
        true
      ),
      (
        'Sora 2.0',
        ARRAY['video_generation']::text[],
        'sora-2.0',
        'openai',
        0,
        false,
        false,
        false,
        'https://platform.openai.com/docs/models/sora',
        true
      ),

      -- -----------------------------------------------------------------------
      -- Google generative media models
      -- -----------------------------------------------------------------------
      (
        'Imagen 4',
        ARRAY['image_generation']::text[],
        'imagen-4',
        'google',
        0,
        false,
        false,
        false,
        'https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview',
        true
      ),
      (
        'Veo 3',
        ARRAY['video_generation']::text[],
        'veo-3',
        'google',
        0,
        false,
        false,
        false,
        'https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview',
        true
      ),
      (
        'Lyria 2',
        ARRAY['audio_generation','music_generation']::text[],
        'lyria-2',
        'google',
        0,
        false,
        false,
        false,
        'https://deepmind.google/technologies/lyria/',
        true
      ),

      -- -----------------------------------------------------------------------
      -- Stability AI models (image generation)
      -- -----------------------------------------------------------------------
      (
        'Stable Diffusion 4',
        ARRAY['image_generation']::text[],
        'stable-diffusion-4',
        'stability',
        0,
        false,
        false,
        false,
        'https://stability.ai/stable-diffusion',
        true
      ),

      -- -----------------------------------------------------------------------
      -- ElevenLabs (audio / TTS)
      -- -----------------------------------------------------------------------
      (
        'ElevenLabs v4',
        ARRAY['audio_generation']::text[],
        'elevenlabs-v4',
        'elevenlabs',
        0,
        false,
        false,
        false,
        'https://elevenlabs.io/docs/api-reference/text-to-speech',
        true
      ),

      -- -----------------------------------------------------------------------
      -- Midjourney (image generation)
      -- -----------------------------------------------------------------------
      (
        'Midjourney 7',
        ARRAY['image_generation']::text[],
        'midjourney-7',
        'midjourney',
        0,
        false,
        false,
        false,
        'https://www.midjourney.com',
        false
      ),

      -- -----------------------------------------------------------------------
      -- Kling (video generation)
      -- -----------------------------------------------------------------------
      (
        'Kling 2.0',
        ARRAY['video_generation']::text[],
        'kling-2.0',
        'kling',
        0,
        false,
        false,
        false,
        'https://klingai.com',
        true
      ),

      -- -----------------------------------------------------------------------
      -- Suno (music generation)
      -- -----------------------------------------------------------------------
      (
        'Suno v5',
        ARRAY['audio_generation','music_generation']::text[],
        'suno-v5',
        'suno',
        0,
        false,
        false,
        false,
        'https://suno.com',
        true
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
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview'
);

-- ---------------------------------------------------------------------------
-- Patch input/output modalities for all existing text models
-- (ensures CapabilityMapper.validate() works correctly on every model)
-- ---------------------------------------------------------------------------
UPDATE ai.models
SET
  input_modalities  = COALESCE(NULLIF(input_modalities, '{}'), ARRAY['text']),
  output_modalities = COALESCE(NULLIF(output_modalities, '{}'), ARRAY['text'])
WHERE
  (input_modalities IS NULL OR input_modalities = '{}')
  OR (output_modalities IS NULL OR output_modalities = '{}');

-- Vision-capable text models also accept image inputs
UPDATE ai.models
SET input_modalities = ARRAY['text','image','document']
WHERE supports_vision = true
  AND NOT (input_modalities @> ARRAY['image']);

-- ---------------------------------------------------------------------------
-- Set input/output modalities for generative media models
-- ---------------------------------------------------------------------------
UPDATE ai.models SET
  input_modalities  = ARRAY['text'],
  output_modalities = ARRAY['image'],
  context_window_tokens = 0
WHERE key IN ('dall-e-4','imagen-4','stable-diffusion-4','midjourney-7');

-- Image-to-image capable (accept image input as reference)
UPDATE ai.models SET
  input_modalities  = ARRAY['text','image'],
  output_modalities = ARRAY['image'],
  context_window_tokens = 0
WHERE key IN ('stable-diffusion-4');

UPDATE ai.models SET
  input_modalities  = ARRAY['text'],
  output_modalities = ARRAY['video'],
  context_window_tokens = 0
WHERE key IN ('sora-2.0','veo-3','kling-2.0');

UPDATE ai.models SET
  input_modalities  = ARRAY['text'],
  output_modalities = ARRAY['audio'],
  context_window_tokens = 0
WHERE key IN ('elevenlabs-v4','lyria-2','suno-v5');

-- ---------------------------------------------------------------------------
-- Catalog enrichment for LenserFight AI showroom / CLI
-- ---------------------------------------------------------------------------
WITH extra_model_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'Llama 3.2 3B Instruct',
        ARRAY['chat']::text[],
        'llama3.2:3b-instruct',
        'ollama',
        131072,
        false,
        false,
        false,
        'https://ollama.com',
        true
      ),
      (
        'Qwen 2.5 7B Instruct',
        ARRAY['chat','tools']::text[],
        'qwen2.5:7b-instruct',
        'ollama',
        131072,
        true,
        false,
        false,
        'https://ollama.com',
        true
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
extra_resolved AS (
  SELECT
    ems.name,
    ems.capabilities,
    ems.key,
    p.id AS provider_id,
    ems.context_window_tokens,
    ems.supports_tools,
    ems.supports_json_schema,
    ems.supports_vision,
    ems.provider_url,
    ems.is_active
  FROM extra_model_seed ems
  JOIN ai.providers p
    ON p.key = ems.provider_key
)
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
  er.name,
  er.capabilities,
  er.key,
  er.provider_id,
  er.context_window_tokens,
  er.supports_tools,
  er.supports_json_schema,
  er.supports_vision,
  er.provider_url,
  er.is_active
FROM extra_resolved er
ON CONFLICT (key) DO UPDATE SET
  name                  = EXCLUDED.name,
  capabilities          = EXCLUDED.capabilities,
  provider_id           = EXCLUDED.provider_id,
  context_window_tokens = EXCLUDED.context_window_tokens,
  supports_tools        = EXCLUDED.supports_tools,
  supports_json_schema  = EXCLUDED.supports_json_schema,
  supports_vision       = EXCLUDED.supports_vision,
  provider_url          = EXCLUDED.provider_url,
  is_active             = EXCLUDED.is_active;

UPDATE ai.models m
SET
  docs_url = COALESCE(m.docs_url, m.provider_url),
  support_level = COALESCE(
    CASE
      WHEN p.support_level = 'deprecated' THEN 'deprecated'
      WHEN p.support_level = 'catalog_only' THEN 'catalog_only'
      WHEN p.support_level = 'byok_only' THEN 'byok_only'
      ELSE 'runnable'
    END,
    'catalog_only'
  ),
  supports_streaming = (
    m.supports_tools
    OR p.key IN ('openai', 'anthropic', 'google', 'mistral', 'ollama')
  ),
  status = CASE
    WHEN m.key ILIKE '%preview%' THEN 'preview'
    WHEN p.support_level = 'deprecated' THEN 'deprecated'
    WHEN m.is_active = false THEN 'legacy'
    ELSE 'active'
  END,
  use_cases = CASE
    WHEN m.output_modalities @> ARRAY['video']::text[] THEN ARRAY['video_generation', 'storyboards', 'motion_concepts']
    WHEN m.output_modalities @> ARRAY['image']::text[] THEN ARRAY['image_generation', 'creative_direction', 'concept_art']
    WHEN m.output_modalities @> ARRAY['audio']::text[] THEN ARRAY['audio_generation', 'voiceover', 'music']
    WHEN m.capabilities @> ARRAY['reasoning']::text[] THEN ARRAY['research', 'planning', 'code_review']
    WHEN m.supports_tools THEN ARRAY['automation', 'agents', 'structured_tasks']
    ELSE ARRAY['chat', 'summaries', 'classification']
  END,
  description = CASE
    WHEN COALESCE(nullif(trim(m.description), ''), '') <> '' THEN m.description
    WHEN m.output_modalities @> ARRAY['video']::text[] THEN m.name || ' is a video generation model in the LenserFight catalog.'
    WHEN m.output_modalities @> ARRAY['image']::text[] THEN m.name || ' is an image generation model in the LenserFight catalog.'
    WHEN m.output_modalities @> ARRAY['audio']::text[] THEN m.name || ' is an audio generation model in the LenserFight catalog.'
    ELSE m.name || ' is a text-first model available in the LenserFight AI catalog.'
  END,
  user_summary = CASE
    WHEN m.output_modalities @> ARRAY['video']::text[] THEN
      m.name || ' is best when you want to turn an idea into a video draft quickly. It is strong for concept clips, animated explainers, and creative visual experiments, but it is not the right choice for exact factual reasoning or long text tasks.'
    WHEN m.output_modalities @> ARRAY['image']::text[] THEN
      m.name || ' is best for turning prompts into visual concepts, illustrations, and polished image variations. It works well for inspiration and creative production, but it is not intended for heavy document reasoning or workflow orchestration.'
    WHEN m.output_modalities @> ARRAY['audio']::text[] THEN
      m.name || ' is best for spoken audio, music, or sound-forward workflows. Use it when the output should be heard rather than read, and avoid it for text-heavy analysis.'
    WHEN m.capabilities @> ARRAY['reasoning']::text[] THEN
      m.name || ' is best for tasks where the model needs to think through several steps before answering. It is a good fit for planning, research, and code-heavy work, but usually costs more and responds more slowly than lighter models.'
    WHEN m.supports_tools THEN
      m.name || ' is best for interactive assistants and automations that need to call tools, follow structure, and work inside workflows. It is a practical default for agent-style product features.'
    ELSE
      m.name || ' is best for everyday chat, drafting, extraction, and light summaries. It is easy to use and often faster, but it is not the strongest option for complex multi-step reasoning.'
  END,
  developer_summary = CASE
    WHEN m.output_modalities @> ARRAY['video']::text[] THEN
      'Strengths: motion generation and creative prototyping. Limitations: async execution, higher cost, weak structured output. Recommended workflows: storyboard generation, marketing concept clips, visual iteration. Avoid for factual QA or JSON-first automation.'
    WHEN m.output_modalities @> ARRAY['image']::text[] THEN
      'Strengths: prompt-to-image generation, art direction, concept exploration. Limitations: weaker determinism and no long-context reasoning. Recommended workflows: thumbnail generation, creative mockups, campaign visuals. Avoid when a workflow needs tool use or precise structured outputs.'
    WHEN m.output_modalities @> ARRAY['audio']::text[] THEN
      'Strengths: audio-first output, narration, music or voice pipelines. Limitations: poor fit for text reasoning and document analysis. Recommended workflows: TTS, soundtrack drafts, voice assets. Avoid for planning-heavy agents.'
    WHEN m.capabilities @> ARRAY['reasoning']::text[] THEN
      'Strengths: deeper reasoning, planning, code review, and long-context analysis. Limitations: higher latency and cost. Recommended workflows: orchestrators, reviewers, research agents, complex workflow nodes. Avoid for cheap high-volume classification.'
    WHEN m.supports_tools THEN
      'Strengths: tool calling, workflow orchestration, and structured assistant behavior. Limitations: not always the cheapest model for bulk generation. Recommended workflows: agents, operators, and task runners. Avoid when you only need plain text generation without tool access.'
    ELSE
      'Strengths: low-friction chat, summarization, extraction, and support responses. Limitations: lighter reasoning depth and fewer orchestration features. Recommended workflows: drafts, triage, lightweight assistants. Avoid for complex agent planning or multimodal pipelines.'
  END,
  metadata = jsonb_strip_nulls(
    jsonb_build_object(
      'source_url', COALESCE(m.docs_url, m.provider_url, p.docs_url),
      'source_checked_at', '2026-04-27',
      'provider_key', p.key,
      'provider_support_level', p.support_level,
      'gateway_compatible', COALESCE((p.metadata ->> 'gateway_compatible')::boolean, false),
      'platforms', COALESCE(p.metadata -> 'platforms', '[]'::jsonb),
      'auth_modes', COALESCE(p.metadata -> 'auth_modes', '[]'::jsonb),
      'pricing', jsonb_build_object(
        'notes',
        CASE
          WHEN p.support_level = 'runnable' THEN 'Pricing varies by provider plan and should be confirmed against the upstream docs before production billing decisions.'
          ELSE 'Catalog-only pricing reference. Validate upstream billing before wiring runtime execution.'
        END
      )
    )
  )
FROM ai.providers p
WHERE p.id = m.provider_id;
