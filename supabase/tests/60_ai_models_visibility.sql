-- =============================================================================
-- pgTAP — Phase 60: ai.models visibility / RLS
-- =============================================================================
-- Repo-truth check: anon and authenticated do NOT have direct SELECT on
-- ai.models. Reads flow through a SECURITY DEFINER RPC (or a view) so the
-- service can apply consistent filtering. service_role has direct SELECT for
-- worker / edge-function use.
--
-- This test pins the privilege surface area so a careless `GRANT SELECT ON
-- ai.models TO anon` later doesn't silently broaden the surface.
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. table present
SELECT has_table('ai', 'models', 'ai.models must exist');

-- 2. RLS enabled (table is filtered when accessed via the proper role)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'ai' AND c.relname = 'models'),
  'RLS must be enabled on ai.models'
);

-- 3. anon does NOT have SELECT (reads happen through SECURITY DEFINER paths)
SELECT ok(
  NOT has_table_privilege('anon', 'ai.models', 'SELECT'),
  'anon must NOT have direct SELECT on ai.models'
);

-- 4. authenticated does NOT have SELECT either
SELECT ok(
  NOT has_table_privilege('authenticated', 'ai.models', 'SELECT'),
  'authenticated must NOT have direct SELECT on ai.models'
);

-- 5. service_role has SELECT (used by edge functions and workers)
SELECT ok(
  has_table_privilege('service_role', 'ai.models', 'SELECT'),
  'service_role MUST have SELECT on ai.models'
);

-- 6. The seed populated at least one runnable model row (sanity gate)
SELECT cmp_ok(
  (SELECT COUNT(*) FROM ai.models WHERE is_active = true),
  '>=',
  1::bigint,
  'at least one model must be seeded and active'
);

SELECT * FROM finish();
ROLLBACK;
