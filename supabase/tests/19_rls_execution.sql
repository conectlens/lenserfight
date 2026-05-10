-- =============================================================================
-- pgTAP — Phase AS: RLS coverage for execution schema
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. execution.runs has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'execution' AND c.relname = 'runs'
  ),
  'execution.runs should have RLS enabled'
);

-- 2. execution.runs has at least one SELECT policy
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'execution' AND tablename = 'runs' AND cmd = 'SELECT'
  ),
  'execution.runs should have at least one SELECT policy'
);

-- 3. execution.byok_keys has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'execution' AND c.relname = 'byok_keys'
  ),
  'execution.byok_keys should have RLS enabled'
);

-- 4. authenticated role has NO direct SELECT policy on byok_keys
--    (all access is via service_role only — any SELECT policy for 'authenticated' is a violation)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'execution'
      AND tablename  = 'byok_keys'
      AND cmd        = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ),
  'execution.byok_keys should have NO SELECT policy for authenticated role'
);

SELECT finish();
ROLLBACK;
