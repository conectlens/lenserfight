-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA-Z11: Add retention policy for automation.cron_runs.
--
-- Background: automation.cron_runs (created in 20270510800000) has no cleanup.
-- Three 1-minute jobs produce ~4,320 rows/day → ~1.6 M rows/year → index bloat
-- and increasing scan cost on idx_cron_runs_job_started.
--
-- Fix:
--   1. Add automation.fn_cleanup_cron_runs() that hard-deletes rows older than
--      30 days. Wrapped inside automation.fn_run_with_lock so the cleanup job
--      itself benefits from advisory locking + audit trail.
--   2. Schedule it daily at 03:00 UTC.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION automation.fn_cleanup_cron_runs(
  p_retention_days integer DEFAULT 30
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM automation.cron_runs
  WHERE started_at < now() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END $$;

COMMENT ON FUNCTION automation.fn_cleanup_cron_runs(integer) IS
  'Z11: deletes automation.cron_runs rows older than p_retention_days (default 30). '
  'Called daily by the cleanup-cron-runs pg_cron job.';

-- ── Daily cleanup cron ────────────────────────────────────────────────────────
-- Uses fn_run_with_lock so: advisory lock prevents overlap, result is audited
-- in automation.cron_runs itself, and statement_timeout = 55 s applies.
-- NOTE: the cleanup job inserts a fresh cron_runs row for itself — that row
-- will be cleaned up by the next nightly run, keeping the table bounded.
DO $$
BEGIN
  -- Remove any prior scheduling of this job (idempotent re-apply safety).
  PERFORM cron.unschedule(jobid)
  FROM    cron.job
  WHERE   jobname = 'cleanup-cron-runs';

  PERFORM cron.schedule(
    'cleanup-cron-runs',
    '0 3 * * *',
    $sql$SELECT automation.fn_run_with_lock(
      'cleanup-cron-runs',
      'SELECT automation.fn_cleanup_cron_runs()'
    )$sql$
  );
END $$;
