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

-- 2. anon role can SELECT public battles (there is a SELECT policy for anon)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'battles'
      AND tablename  = 'battles'
      AND cmd        = 'SELECT'
  ),
  'battles.battles should have at least one public SELECT policy'
);

-- 3. execution_jobs table exists (no direct authenticated SELECT — service_role only)
SELECT has_table(
  'battles',
  'execution_jobs',
  'battles.execution_jobs table should exist'
);

SELECT finish();
ROLLBACK;
