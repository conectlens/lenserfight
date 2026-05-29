-- =============================================================================
-- 4. AI PROVIDERS
-- =============================================================================
-- Normalized provider catalog for LenserFight.
-- Notes:
-- - keys match LenserFight runtime/provider conventions
-- - support_level communicates repo-truth, not upstream marketing
-- - metadata carries provenance and compatibility information

WITH provider_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'openai',
        'OpenAI',
        'https://api.openai.com/v1',
        'https://platform.openai.com/docs',
        'runnable',
        'openai',
        true,
        jsonb_build_object(
          'source_url', 'https://platform.openai.com/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli', 'gateway'),
          'auth_modes', jsonb_build_array('api_key', 'oauth'),
          'runtime_provider_key', 'openai'
        )
      ),
      (
        'anthropic',
        'Anthropic',
        'https://api.anthropic.com',
        'https://docs.anthropic.com',
        'runnable',
        'anthropic',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.anthropic.com',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli', 'gateway'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'anthropic'
        )
      ),
      (
        'google',
        'Google Gemini',
        'https://generativelanguage.googleapis.com',
        'https://ai.google.dev/gemini-api/docs',
        'runnable',
        'google',
        true,
        jsonb_build_object(
          'source_url', 'https://ai.google.dev/gemini-api/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli', 'gateway'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'google'
        )
      ),
      (
        'mistral',
        'Mistral AI',
        'https://api.mistral.ai/v1',
        'https://docs.mistral.ai',
        'runnable',
        'mistral',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.mistral.ai',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli', 'gateway'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'mistral'
        )
      ),
      (
        'ollama',
        'Ollama',
        'http://localhost:11434/api',
        'https://ollama.com',
        'runnable',
        'ollama',
        true,
        jsonb_build_object(
          'source_url', 'https://ollama.com',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli', 'gateway', 'local'),
          'auth_modes', jsonb_build_array('local'),
          'runtime_provider_key', 'ollama',
          'aliases', jsonb_build_array('local')
        )
      ),
      (
        'fal',
        'fal.ai',
        'https://fal.run',
        'https://fal.ai/docs',
        'runnable',
        'fal',
        true,
        jsonb_build_object(
          'source_url', 'https://fal.ai/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('web', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'fal'
        )
      ),
      (
        'stability',
        'Stability AI',
        'https://api.stability.ai',
        'https://platform.stability.ai/docs/api-reference',
        'runnable',
        'stability',
        true,
        jsonb_build_object(
          'source_url', 'https://platform.stability.ai/docs/api-reference',
          'source_checked_at', '2026-04-27',
          'gateway_compatible', false,
          'platforms', jsonb_build_array('web', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'stability'
        )
      ),
      (
        'elevenlabs',
        'ElevenLabs',
        'https://api.elevenlabs.io',
        'https://elevenlabs.io/docs',
        'runnable',
        'elevenlabs',
        true,
        jsonb_build_object(
          'source_url', 'https://elevenlabs.io/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', false,
          'platforms', jsonb_build_array('web', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'elevenlabs'
        )
      ),
      (
        'kling',
        'Kling AI',
        'https://api.klingai.com',
        'https://klingai.com/docs',
        'runnable',
        'kling',
        true,
        jsonb_build_object(
          'source_url', 'https://klingai.com/docs',
          'source_checked_at', '2026-04-27',
          'gateway_compatible', false,
          'platforms', jsonb_build_array('web', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'kling'
        )
      ),
      (
        'suno',
        'Suno',
        'https://api.sunoapi.org',
        'https://suno.com/docs',
        'runnable',
        'suno',
        true,
        jsonb_build_object(
          'source_url', 'https://suno.com/docs',
          'source_checked_at', '2026-04-27',
          'gateway_compatible', false,
          'platforms', jsonb_build_array('web', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'suno'
        )
      ),
      (
        'openrouter',
        'OpenRouter',
        'https://openrouter.ai/api/v1',
        'https://openrouter.ai/docs',
        'byok_only',
        'openrouter',
        true,
        jsonb_build_object(
          'source_url', 'https://openrouter.ai/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'perplexity',
        'Perplexity',
        'https://api.perplexity.ai',
        'https://docs.perplexity.ai',
        'byok_only',
        'perplexity',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.perplexity.ai',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'xai',
        'xAI',
        'https://api.x.ai/v1',
        'https://docs.x.ai',
        'byok_only',
        'xai',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.x.ai',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog', 'cli'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'groq',
        'Groq',
        'https://api.groq.com/openai/v1',
        'https://console.groq.com/docs',
        'catalog_only',
        'groq',
        true,
        jsonb_build_object(
          'source_url', 'https://console.groq.com/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'deepseek',
        'DeepSeek',
        'https://api.deepseek.com',
        'https://api-docs.deepseek.com',
        'catalog_only',
        'deepseek',
        true,
        jsonb_build_object(
          'source_url', 'https://api-docs.deepseek.com',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'bedrock',
        'Amazon Bedrock',
        'https://bedrock-runtime.us-east-1.amazonaws.com',
        'https://docs.aws.amazon.com/bedrock/',
        'catalog_only',
        'bedrock',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.aws.amazon.com/bedrock/',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog'),
          'auth_modes', jsonb_build_array('aws'),
          'runtime_provider_key', null
        )
      ),
      (
        'runway',
        'Runway',
        'https://api.dev.runwayml.com',
        'https://docs.dev.runwayml.com',
        'catalog_only',
        'runway',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.dev.runwayml.com',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', null
        )
      ),
      (
        'litellm',
        'LiteLLM',
        'https://litellm.ai',
        'https://docs.litellm.ai',
        'catalog_only',
        'litellm',
        true,
        jsonb_build_object(
          'source_url', 'https://docs.litellm.ai',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog', 'gateway'),
          'auth_modes', jsonb_build_array('proxy'),
          'runtime_provider_key', null
        )
      ),
      (
        'lmstudio',
        'LM Studio',
        'http://localhost:1234/v1',
        'https://lmstudio.ai/docs',
        'catalog_only',
        'lmstudio',
        true,
        jsonb_build_object(
          'source_url', 'https://lmstudio.ai/docs',
          'source_checked_at', '2026-05-29',
          'gateway_compatible', true,
          'platforms', jsonb_build_array('catalog', 'local'),
          'auth_modes', jsonb_build_array('local'),
          'runtime_provider_key', null
        )
      ),
      (
        'midjourney',
        'Midjourney',
        'https://api.midjourney.com',
        'https://docs.midjourney.com',
        'deprecated',
        'midjourney',
        false,
        jsonb_build_object(
          'source_url', 'https://docs.midjourney.com',
          'source_checked_at', '2026-04-27',
          'gateway_compatible', false,
          'platforms', jsonb_build_array('catalog'),
          'auth_modes', jsonb_build_array('api_key'),
          'runtime_provider_key', 'midjourney'
        )
      )
  ) AS t(
    key,
    display_name,
    base_url,
    docs_url,
    support_level,
    logo_slug,
    is_active,
    metadata
  )
)
INSERT INTO ai.providers (
  key,
  display_name,
  base_url,
  docs_url,
  support_level,
  logo_slug,
  is_active,
  metadata
)
SELECT
  ps.key,
  ps.display_name,
  ps.base_url,
  ps.docs_url,
  ps.support_level,
  ps.logo_slug,
  ps.is_active,
  ps.metadata
FROM provider_seed ps
ON CONFLICT (key) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  base_url      = EXCLUDED.base_url,
  docs_url      = EXCLUDED.docs_url,
  support_level = EXCLUDED.support_level,
  logo_slug     = EXCLUDED.logo_slug,
  is_active     = EXCLUDED.is_active,
  metadata      = EXCLUDED.metadata;
