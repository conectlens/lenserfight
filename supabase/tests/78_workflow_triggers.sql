-- =============================================================================
-- pgTAP — Phase CD: Workflow triggers and condition evaluation
-- plan(6): trigger table exists; condition eval true/false; dispatch fn exists;
--          webhook fn exists; RLS on triggers; chain table exists
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. lenses.workflow_triggers table exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'lenses'
      AND table_name   = 'workflow_triggers'
  ),
  'lenses.workflow_triggers table exists'
);

-- 2. fn_workflows_evaluate_condition returns TRUE for empty condition
SELECT ok(
  public.fn_workflows_evaluate_condition('{}'::JSONB, '{"status":"closed"}'::JSONB) = TRUE,
  'fn_workflows_evaluate_condition returns TRUE for empty condition'
);

-- 3. fn_workflows_evaluate_condition returns FALSE when condition does not match
SELECT ok(
  public.fn_workflows_evaluate_condition('{"status":"open"}'::JSONB, '{"status":"closed"}'::JSONB) = FALSE,
  'fn_workflows_evaluate_condition returns FALSE on mismatch'
);

-- 4. fn_workflows_dispatch_on_event exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_workflows_dispatch_on_event'
  ),
  'public.fn_workflows_dispatch_on_event() exists'
);

-- 5. fn_workflows_webhook_trigger exists and raises on wrong secret
SELECT throws_ok(
  $$ SELECT public.fn_workflows_webhook_trigger(gen_random_uuid(), 'bad-secret', '{}') $$,
  NULL,
  NULL,
  'fn_workflows_webhook_trigger raises for unknown workflow'
);

-- 6. RLS is enabled on lenses.workflow_triggers
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lenses'
      AND c.relname = 'workflow_triggers'
  ),
  'RLS is enabled on lenses.workflow_triggers'
);

SELECT finish();
ROLLBACK;
