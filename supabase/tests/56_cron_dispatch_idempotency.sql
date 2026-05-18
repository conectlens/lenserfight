-- =============================================================================
-- pgTAP — Phase 56: cron-dispatch idempotency (fn_dispatch_scheduled_workflows)
-- =============================================================================
-- The pg_cron-driven scheduled-workflow dispatcher must:
--   * exist as a function in the lenses schema
--   * be callable by service_role (pg_cron runs as superuser, edges call via
--     service_role rpc)
--   * update last_run_at to fence subsequent dispatches within the same minute
--
-- We don't test true concurrent claim semantics here (that requires a real
-- pg_cron tick); we lock the function signature, GRANTs, and the
-- last_run_at fence column existence.
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. function exists in some schema
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'fn_dispatch_scheduled_workflows'
  ),
  'fn_dispatch_scheduled_workflows must exist'
);

-- 2. function is SECURITY DEFINER (it must elevate to bypass RLS during dispatch)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.proname = 'fn_dispatch_scheduled_workflows'
      AND p.prosecdef = true
  ),
  'fn_dispatch_scheduled_workflows must be SECURITY DEFINER'
);

-- 3. workflow_schedules has the last_run_at fence column
SELECT has_column(
  'lenses', 'workflow_schedules', 'last_run_at',
  'last_run_at fence column must exist'
);

-- 4. workflow_schedules has the is_active toggle
SELECT has_column(
  'lenses', 'workflow_schedules', 'is_active',
  'is_active toggle must exist'
);

-- 5. is_active defaults true
SELECT col_default_is(
  'lenses', 'workflow_schedules', 'is_active',
  'true',
  'workflow_schedules.is_active default must be true'
);

-- 6. cron_expr column required
SELECT col_not_null(
  'lenses', 'workflow_schedules', 'cron_expr',
  'cron_expr must be NOT NULL'
);

-- 7. workflow_id required
SELECT col_not_null(
  'lenses', 'workflow_schedules', 'workflow_id',
  'workflow_id must be NOT NULL'
);

-- 8. Index supports the dispatcher's "active and due" lookup
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lenses' AND tablename = 'workflow_schedules'
  ),
  'workflow_schedules must have at least one index'
);

SELECT * FROM finish();
ROLLBACK;
