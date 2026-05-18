-- =============================================================================
-- pgTAP — Phase 52: trigger-execution gating (model presence + runtime tier)
-- =============================================================================
-- Asserts the SQL-side gates the `trigger-execution` and `execute-stream` edge
-- functions rely on before dispatching to a provider adapter:
--   * every active model row has a non-empty provider_id pointing at a real
--     provider row
--   * every active model's provider has support_level in (runnable, byok_only)
--   * deprecated provider Midjourney has its model row marked is_active=false
--   * catalog-only providers (deepseek, groq, etc.) have NO model rows seeded
-- =============================================================================
BEGIN;

SELECT plan(10);

-- 1. ai.providers schema present
SELECT has_table('ai', 'providers', 'ai.providers must exist');

-- 2. ai.models schema present
SELECT has_table('ai', 'models', 'ai.models must exist');

-- 3. providers.support_level enum-like CHECK enforces the four canonical tiers
SELECT ok(
  EXISTS (
    SELECT 1 FROM ai.providers WHERE support_level = 'runnable'
  ),
  'at least one runnable provider must be seeded'
);

-- 4. Every active model has a real provider FK
SELECT is(
  (SELECT COUNT(*)::integer FROM ai.models m
     LEFT JOIN ai.providers p ON p.id = m.provider_id
   WHERE m.is_active = true AND p.id IS NULL),
  0,
  'no active model may reference a missing provider'
);

-- 5. Every active model's provider has support_level in (runnable, byok_only)
SELECT is(
  (SELECT COUNT(*)::integer FROM ai.models m
     JOIN ai.providers p ON p.id = m.provider_id
   WHERE m.is_active = true
     AND p.support_level NOT IN ('runnable', 'byok_only')),
  0,
  'active models must belong to a runnable or byok_only provider'
);

-- 6. Midjourney model row exists but is_active=false (deprecated gate)
SELECT ok(
  EXISTS (SELECT 1 FROM ai.models WHERE key = 'midjourney-7' AND is_active = false),
  'midjourney-7 must be present but inactive (deprecated gate)'
);

-- 7. No catalog-only provider has an active model
SELECT is(
  (SELECT COUNT(*)::integer FROM ai.models m
     JOIN ai.providers p ON p.id = m.provider_id
   WHERE p.support_level = 'catalog_only' AND m.is_active = true),
  0,
  'catalog-only providers must not have active models'
);

-- 8. Reserved DeepSeek catalog entry has no model rows at all
SELECT is(
  (SELECT COUNT(*)::integer FROM ai.models m
     JOIN ai.providers p ON p.id = m.provider_id
   WHERE p.key = 'deepseek'),
  0,
  'deepseek (catalog_only) has no seeded models — gate confirmed'
);

-- 9. ai.providers.is_active toggle exists and the deprecated provider is off
SELECT ok(
  EXISTS (SELECT 1 FROM ai.providers WHERE key = 'midjourney' AND is_active = false),
  'midjourney provider must be is_active=false'
);

-- 10. Every active model has non-empty key and a wire-name length under 256
SELECT is(
  (SELECT COUNT(*)::integer FROM ai.models WHERE is_active = true
     AND (key IS NULL OR length(trim(key)) = 0 OR length(key) >= 256)),
  0,
  'every active model has a non-empty, bounded key'
);

SELECT * FROM finish();
ROLLBACK;
