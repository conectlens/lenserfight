-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA-Z10: Wire pg_cron schedules at the _safe() wrappers and add a
-- per-job statement_timeout inside fn_run_with_lock.
--
-- Background: migration 20270510800000_cron_idempotency_guards.sql created
-- advisory-lock wrappers (fn_auto_close_voting_safe, fn_auto_finalize_battles_safe,
-- fn_dispatch_scheduled_workflows_safe) but explicitly deferred re-pointing
-- the pg_cron schedules as "a follow-up ops task to avoid downtime here."
--
-- This migration completes that follow-up:
--   1. Updates automation.fn_run_with_lock to SET LOCAL statement_timeout = 55s
--      so every job body is hard-capped below the 1-min tick window.
--   2. Unschedules the three unsafe crons and re-schedules them via _safe().
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Patch fn_run_with_lock with statement timeout ────────────────────────
--
-- Adds PERFORM set_config('statement_timeout', '55000', true) after the
-- advisory lock is acquired. 55 s = 1-min tick minus 5 s buffer. This
-- prevents a stalled batch function from holding its connection open across
-- the next tick.
CREATE OR REPLACE FUNCTION automation.fn_run_with_lock(
  p_job_name text,
  p_sql      text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  got_lock boolean;
  run_id   bigint;
BEGIN
  got_lock := pg_try_advisory_xact_lock(hashtext('cron:' || p_job_name)::bigint);

  IF NOT got_lock THEN
    INSERT INTO automation.cron_runs (job_name, status, finished_at)
      VALUES (p_job_name, 'skipped_locked', now());
    RETURN;
  END IF;

  -- Hard-cap each cron body to 55 s. pg_cron fires at most once per minute;
  -- 55 s leaves 5 s of slack before the next tick. The timeout is
  -- transaction-local and released automatically when the function returns.
  PERFORM set_config('statement_timeout', '55000', true);

  INSERT INTO automation.cron_runs (job_name) VALUES (p_job_name) RETURNING id INTO run_id;
  BEGIN
    EXECUTE p_sql;
    UPDATE automation.cron_runs
      SET status = 'ok', finished_at = now()
      WHERE id = run_id;
  EXCEPTION WHEN others THEN
    UPDATE automation.cron_runs
      SET status = 'error', finished_at = now(), error_msg = SQLERRM
      WHERE id = run_id;
    RAISE;
  END;
END $$;

-- ── 2. Re-point pg_cron schedules at the _safe() wrappers ───────────────────
--
-- cron.unschedule is idempotent when the job name exists; it is a no-op when
-- the job was already removed. We unschedule first so we do not create a
-- duplicate entry if this migration is re-applied.
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname IN (
  'auto-close-voting',
  'auto-finalize-battles',
  'dispatch-scheduled-workflows'
);

-- Guard: only create the schedules if the _safe wrappers exist (they are
-- created conditionally in 20270510800000). This prevents a hard error if
-- the base functions were never deployed in a given environment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_close_voting_safe'
  ) THEN
    PERFORM cron.schedule(
      'auto-close-voting',
      '*/1 * * * *',
      'SELECT battles.fn_auto_close_voting_safe()'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_finalize_battles_safe'
  ) THEN
    PERFORM cron.schedule(
      'auto-finalize-battles',
      '*/1 * * * *',
      'SELECT battles.fn_auto_finalize_battles_safe()'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lenses' AND p.proname = 'fn_dispatch_scheduled_workflows_safe'
  ) THEN
    PERFORM cron.schedule(
      'dispatch-scheduled-workflows',
      '*/1 * * * *',
      'SELECT lenses.fn_dispatch_scheduled_workflows_safe()'
    );
  END IF;
END $$;

COMMENT ON FUNCTION automation.fn_run_with_lock(text, text) IS
  'Z10: advisory-lock wrapper for pg_cron jobs. Sets statement_timeout=55s '
  'after acquiring lock to cap each job body below the 1-min tick window.';
