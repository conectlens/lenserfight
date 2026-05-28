-- =============================================================================
-- pgTAP — CB-P1/P2 gap fixes:
--   P1a: WORKFLOW_RUN_RECEIVED trigger wired on lenses.workflow_runs
--   P1b: tutorial_completions table, fn_mark_tutorial_complete RPC, XP trigger
--   P2:  fn_xp_auto_activate_seasons + pg_cron job registered
-- plan(10)
-- =============================================================================
BEGIN;

SELECT plan(10);

-- ── P1a: WORKFLOW_RUN_RECEIVED ────────────────────────────────────────────────

-- 1. Trigger function exists in lenses schema
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lenses'
      AND p.proname = 'fn_xp_on_workflow_run_received'
  ),
  'lenses.fn_xp_on_workflow_run_received function exists'
);

-- 2. Trigger is registered on lenses.workflow_runs
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'workflow_runs'
      AND trigger_name       = 'xp_on_workflow_run_received'
  ),
  'xp_on_workflow_run_received trigger exists on lenses.workflow_runs'
);

-- ── P1b: TUTORIAL_COMPLETED / WALKTHROUGH_COMPLETED ──────────────────────────

-- 3. tutorial_completions table exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'lenses'
      AND table_name   = 'tutorial_completions'
  ),
  'lenses.tutorial_completions table exists'
);

-- 4. tutorial_completions has the expected unique constraint
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema      = 'lenses'
      AND table_name        = 'tutorial_completions'
      AND constraint_type   = 'UNIQUE'
      AND constraint_name   = 'tutorial_completions_lenser_slug_kind_unique'
  ),
  'tutorial_completions has (lenser_id, tutorial_slug, kind) unique constraint'
);

-- 5. XP trigger exists on tutorial_completions
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema       = 'lenses'
      AND event_object_table   = 'tutorial_completions'
      AND trigger_name         = 'xp_on_tutorial_completed'
  ),
  'xp_on_tutorial_completed trigger exists on lenses.tutorial_completions'
);

-- 6. fn_mark_tutorial_complete RPC is callable
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_mark_tutorial_complete'
  ),
  'public.fn_mark_tutorial_complete function exists'
);

-- 7. kind CHECK constraint rejects invalid values
SELECT throws_ok(
  $$
    INSERT INTO lenses.tutorial_completions (lenser_id, tutorial_slug, kind)
    VALUES ('00000000-0000-0000-0000-000000000099', 'test-slug', 'invalid_kind')
  $$,
  '23514',
  NULL,
  'tutorial_completions rejects kind not in (tutorial, walkthrough)'
);

-- ── P2: Season auto-flip ──────────────────────────────────────────────────────

-- 8. fn_xp_auto_activate_seasons exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'xp'
      AND p.proname = 'fn_xp_auto_activate_seasons'
  ),
  'xp.fn_xp_auto_activate_seasons function exists'
);

-- 9. fn_xp_auto_activate_seasons_safe wrapper exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'xp'
      AND p.proname = 'fn_xp_auto_activate_seasons_safe'
  ),
  'xp.fn_xp_auto_activate_seasons_safe wrapper exists'
);

-- 10. pg_cron job is registered
SELECT ok(
  EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'xp-auto-activate-seasons'
  ),
  'pg_cron job xp-auto-activate-seasons is registered'
);

SELECT * FROM finish();
ROLLBACK;
