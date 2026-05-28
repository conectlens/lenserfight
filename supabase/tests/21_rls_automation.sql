-- =============================================================================
-- pgTAP — Phase AS: RLS coverage for automation schema
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. automation.events has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'automation' AND c.relname = 'events'
  ),
  'automation.events should have RLS enabled'
);

-- 2. authenticated cannot INSERT directly into automation.events
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'automation'
      AND tablename  = 'events'
      AND cmd        = 'INSERT'
      AND roles @> ARRAY['authenticated']::name[]
  ),
  'automation.events should have no INSERT policy for authenticated'
);

-- 3. automation.trigger_rules table exists
SELECT has_table(
  'automation',
  'trigger_rules',
  'automation.trigger_rules table should exist'
);

-- 4. automation.trigger_rules has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'automation' AND c.relname = 'trigger_rules'
  ),
  'automation.trigger_rules should have RLS enabled'
);

SELECT finish();
ROLLBACK;
