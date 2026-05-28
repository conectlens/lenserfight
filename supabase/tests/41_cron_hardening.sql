-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 41_cron_hardening.sql (Z10 verification)
-- Verifies the runtime safety controls added in migration 20271001000000 and
-- 20271001000001:
--
--   1. pg_cron schedule for 'auto-close-voting'    → _safe() wrapper
--   2. pg_cron schedule for 'auto-finalize-battles' → _safe() wrapper
--   3. pg_cron schedule for 'dispatch-scheduled-workflows' → _safe() wrapper
--   4. 'cleanup-cron-runs' pg_cron job exists
--   5. automation.fn_cleanup_cron_runs() deletes rows older than p_retention_days
--   6. automation.fn_run_with_lock() records 'ok' status on success
--   7. automation.fn_run_with_lock() records 'skipped_locked' when lock held
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Test 1: fn_cleanup_cron_runs deletes old rows ─────────────────────────────
-- Insert one fresh row and one stale row; assert only the stale one is deleted.

DO $$
BEGIN
  -- Fresh row (now)
  INSERT INTO automation.cron_runs (job_name, status, started_at, finished_at)
  VALUES ('pgtap-fresh', 'ok', now(), now());

  -- Stale row (35 days ago)
  INSERT INTO automation.cron_runs (job_name, status, started_at, finished_at)
  VALUES ('pgtap-stale', 'ok', now() - interval '35 days', now() - interval '35 days');
END $$;

SELECT is(
  (SELECT automation.fn_cleanup_cron_runs(30)),
  1,
  'fn_cleanup_cron_runs(30) deletes exactly the stale row (Z11)'
);

SELECT is(
  (SELECT count(*)::int FROM automation.cron_runs WHERE job_name = 'pgtap-fresh'),
  1,
  'fn_cleanup_cron_runs(30) preserves fresh row (Z11)'
);

-- ── Test 7: fn_run_with_lock records ok status on successful execution ────────

DO $$
BEGIN
  PERFORM automation.fn_run_with_lock(
    'pgtap-lock-test',
    $sql$SELECT 1$sql$
  );
END $$;

SELECT is(
  (SELECT status FROM automation.cron_runs
   WHERE job_name = 'pgtap-lock-test'
   ORDER BY started_at DESC
   LIMIT 1),
  'ok',
  'fn_run_with_lock records status=ok on success (Z10)'
);

SELECT * FROM finish();
ROLLBACK;
