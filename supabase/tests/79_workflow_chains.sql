-- =============================================================================
-- pgTAP — Phase CD: Workflow run chains
-- plan(4): chain table exists; fn_workflows_chain_run exists;
--          RLS on chains; fn is SECURITY DEFINER
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. lenses.workflow_run_chains table exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'lenses'
      AND table_name   = 'workflow_run_chains'
  ),
  'lenses.workflow_run_chains table exists'
);

-- 2. fn_workflows_chain_run exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_workflows_chain_run'
  ),
  'public.fn_workflows_chain_run() exists'
);

-- 3. fn_workflows_chain_run is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_workflows_chain_run'
  ),
  'fn_workflows_chain_run is SECURITY DEFINER'
);

-- 4. RLS is enabled on lenses.workflow_run_chains
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lenses'
      AND c.relname = 'workflow_run_chains'
  ),
  'RLS is enabled on lenses.workflow_run_chains'
);

SELECT finish();
ROLLBACK;
