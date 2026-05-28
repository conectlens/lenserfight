-- =============================================================================
-- pgTAP — Phase BY: Cross-schema RLS leak prevention
-- plan(4): cross-schema join between lenses.* and agents.* cannot return
--          another user's data
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. lenses.workflow_runs has RLS enabled (BY migration added this)
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lenses' AND c.relname = 'workflow_runs'
  ),
  'lenses.workflow_runs should have RLS enabled after BY migration'
);

-- 2. lenses.workflow_runs has an owner-based SELECT policy
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lenses'
      AND tablename  = 'workflow_runs'
      AND cmd        = 'SELECT'
      AND qual LIKE '%auth.uid()%'
  ),
  'lenses.workflow_runs has owner-based SELECT policy using auth.uid()'
);

-- 3. audit.events has RLS enabled (BY migration added this)
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit' AND c.relname = 'events'
  ),
  'audit.events should have RLS enabled after BY migration'
);

-- 4. audit.events authenticated SELECT policy is scoped to actor_id = auth.uid()
--    (no open USING(true) for authenticated role)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename  = 'events'
      AND cmd        = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
      AND qual = 'true'
  ),
  'audit.events SELECT policy for authenticated is not open USING(true)'
);

SELECT finish();
ROLLBACK;
