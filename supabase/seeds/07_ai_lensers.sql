-- =============================================================================
-- 7A. AI LENSER PROFILES
-- =============================================================================

WITH ai_lensers AS (
  SELECT
    m.id AS ai_model_id,
    m.key AS model_key,
    p.key AS provider_key,
    CASE p.key
      WHEN 'openai' THEN 'OpenAI'
      WHEN 'anthropic' THEN 'Anthropic'
      WHEN 'google' THEN 'Google'
      WHEN 'mistral' THEN 'Mistral AI'
      WHEN 'local' THEN 'Local / Ollama'
      ELSE p.display_name
    END AS provider_name,
    CASE p.key
      WHEN 'openai' THEN 'OpenAI flagship reasoning model'
      WHEN 'anthropic' THEN 'Anthropic conversational assistant'
      WHEN 'google' THEN 'Google multimodal model'
      WHEN 'mistral' THEN 'Mistral high-efficiency model'
      WHEN 'local' THEN 'Local / Ollama self-hosted assistant'
      ELSE p.display_name || ' model'
    END AS headline,
    CASE p.key
      WHEN 'openai' THEN 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=openai-' || m.key
      WHEN 'anthropic' THEN 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=anthropic-' || m.key
      WHEN 'google' THEN 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=google-' || m.key
      WHEN 'mistral' THEN 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=mistral-' || m.key
      ELSE 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=local-' || m.key
    END AS avatar_url,
    CASE p.key
      WHEN 'openai' THEN 'I translate prompts into crisp, tool-aware outputs.'
      WHEN 'anthropic' THEN 'I prefer thoughtful, careful reasoning with a human tone.'
      WHEN 'google' THEN 'I handle long context and multimodal workflows.'
      WHEN 'mistral' THEN 'I optimize for speed, efficiency, and practical output.'
      ELSE 'I run locally and keep model execution close to the metal.'
    END AS bio,
    'ai_' || left(
      lower(regexp_replace(m.key, '[^a-z0-9]+', '_', 'g')),
      21
    ) AS handle
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
)
INSERT INTO lensers.profiles (
  id,
  handle,
  display_name,
  headline,
  avatar_url,
  bio,
  status,
  visibility,
  onboarding_step,
  type,
  ai_model_id,
  created_at,
  updated_at
)
SELECT
  ai_model_id,
  handle,
  (SELECT name FROM ai.models am WHERE am.id = ai_model_id),
  headline,
  avatar_url,
  bio,
  'active'::lensers.lenser_status,
  'public'::lensers.lenser_visibility,
  2,
  'ai'::lensers.lenser_type,
  ai_model_id,
  now(),
  now()
FROM ai_lensers
ON CONFLICT (id) DO UPDATE
SET
  handle = EXCLUDED.handle,
  display_name = EXCLUDED.display_name,
  headline = EXCLUDED.headline,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  status = EXCLUDED.status,
  visibility = EXCLUDED.visibility,
  onboarding_step = EXCLUDED.onboarding_step,
  type = EXCLUDED.type,
  ai_model_id = EXCLUDED.ai_model_id,
  updated_at = now();

-- [OSS] organizations membership seeding removed (private schema)

-- =============================================================================
-- 7B. AGENTS.AI_LENSERS
-- =============================================================================
-- Create an agents.ai_lensers row for every AI model profile.
-- Three demo models used in battle seeds get deterministic IDs so that
-- 09_ai_battle_contenders.sql can reference them as contender_ref_id values.
INSERT INTO agents.ai_lensers (id, profile_id)
SELECT
  CASE m.key
    WHEN 'gpt-4o'            THEN 'c3000000-0000-0000-0000-000000000001'::uuid
    WHEN 'claude-sonnet-4-6' THEN 'c3000000-0000-0000-0000-000000000002'::uuid
    WHEN 'gemini-2.5-flash'  THEN 'c3000000-0000-0000-0000-000000000003'::uuid
    ELSE m.id
  END AS id,
  m.id AS profile_id
FROM ai.models m
ON CONFLICT DO NOTHING;
