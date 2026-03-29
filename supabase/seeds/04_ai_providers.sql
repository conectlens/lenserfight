-- =============================================================================
-- 4. AI PROVIDERS
-- =============================================================================
-- Refactored:
-- - Seeds base_url and docs_url
-- - Uses a single source CTE for insert/update
-- - Keeps same upsert semantics

WITH provider_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'openai',
        'OpenAI',
        'https://api.openai.com/v1',
        'https://developers.openai.com/api/docs/',
        true
      ),
      (
        'anthropic',
        'Anthropic',
        'https://api.anthropic.com',
        'https://docs.anthropic.com/en/docs/get-started',
        true
      ),
      (
        'google',
        'Google',
        'https://generativelanguage.googleapis.com',
        'https://ai.google.dev/gemini-api/docs',
        true
      ),
      (
        'mistral',
        'Mistral AI',
        'https://api.mistral.ai/v1',
        'https://docs.mistral.ai/api',
        true
      ),
      (
        'local',
        'Local / Ollama',
        'http://localhost:11434/api',
        'https://docs.ollama.com/api/introduction',
        true
      )
  ) AS t(
    key,
    display_name,
    base_url,
    docs_url,
    is_active
  )
)

-- Upsert: insert new rows, update existing rows on key conflict
INSERT INTO ai.providers (
  key,
  display_name,
  base_url,
  docs_url,
  is_active
)
SELECT
  ps.key,
  ps.display_name,
  ps.base_url,
  ps.docs_url,
  ps.is_active
FROM provider_seed ps
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_url     = EXCLUDED.base_url,
  docs_url     = EXCLUDED.docs_url,
  is_active    = EXCLUDED.is_active;
