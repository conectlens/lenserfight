-- =============================================================================
-- pgTAP — Phase AS: RLS coverage for battles schema
-- =============================================================================
BEGIN;

SELECT plan(3);

-- 1. battles.battles has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'battles' AND c.relname = 'battles'
  ),
  'battles.battles should have RLS enabled'
);

-- 2. battles.battles has a SELECT policy for authenticated/public access
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'battles'
      AND tablename  = 'battles'
      AND cmd        = 'SELECT'
  ),
  'battles.battles should have at least one SELECT policy'
);

-- 3. battle_execution_jobs table exists (service_role only — renamed from execution_jobs)
SELECT has_table(
  'battles',
  'battle_execution_jobs',
  'battles.battle_execution_jobs table should exist'
);

SELECT finish();
ROLLBACK;
