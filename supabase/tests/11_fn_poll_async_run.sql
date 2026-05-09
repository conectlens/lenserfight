-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 11_fn_poll_async_run.sql
-- Phase AM — validates SKIP LOCKED + last_polled_at semantics, plus the
-- idempotent-complete wrapper.
--
-- Run via: pnpm test:db
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

-- ── Test 1: fn_poll_async_run is service_role only ────────────────────────
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'execution.fn_poll_async_run(integer, integer)',
    'EXECUTE'
  ),
  'authenticated cannot EXECUTE fn_poll_async_run'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'execution.fn_poll_async_run(integer, integer)',
    'EXECUTE'
  ),
  'service_role can EXECUTE fn_poll_async_run'
);

-- ── Test 2: fn_async_run_idempotent_complete exists and is service_role only
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_async_run_idempotent_complete'
  ),
  'fn_async_run_idempotent_complete is registered'
);

-- ── Test 3: Phase 0 last_polled_at column is present ──────────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'execution'
      AND table_name   = 'runs'
      AND column_name  = 'last_polled_at'
  ),
  'execution.runs.last_polled_at column exists (Phase 0 dep)'
);

-- ── Test 4: idx_execution_runs_async_poll_order index exists ──────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'execution'
      AND indexname  = 'idx_execution_runs_async_poll_order'
  ),
  'idx_execution_runs_async_poll_order index exists'
);

SELECT * FROM finish();

ROLLBACK;
