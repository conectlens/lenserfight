-- =============================================================================
-- pgTAP — Phase AS: RLS coverage for lenses schema
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. lenses.workflow_runs has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lenses' AND c.relname = 'workflow_runs'
  ),
  'lenses.workflow_runs should have RLS enabled'
);

-- 2. At least one SELECT policy exists on workflow_runs
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lenses'
      AND tablename  = 'workflow_runs'
      AND cmd = 'SELECT'
  ),
  'lenses.workflow_runs should have at least one SELECT policy'
);

-- 3. lenses.workflow_schedules has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lenses' AND c.relname = 'workflow_schedules'
  ),
  'lenses.workflow_schedules should have RLS enabled'
);

-- 4. workflow_schedules has at least one owner-scoped SELECT policy
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lenses'
      AND tablename  = 'workflow_schedules'
      AND cmd = 'SELECT'
  ),
  'lenses.workflow_schedules should have at least one SELECT policy'
);

SELECT finish();
ROLLBACK;
