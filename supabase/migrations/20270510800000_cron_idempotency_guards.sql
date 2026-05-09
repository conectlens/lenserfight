-- Phase Z9: Add idempotency guards and audit trail to high-frequency crons.
-- Findings: three */1 schedules without advisory locks risk double execution
-- on overlap / pod restart:
--   * battles.fn_auto_close_voting
--   * battles.fn_auto_finalize_battles
--   * lenses.fn_dispatch_scheduled_workflows
--
-- We don't replace the function bodies (they're large and reviewed). We
-- expose new wrappers fn_*_safe that:
--   1) take a transaction-scoped advisory lock keyed on the function name,
--   2) record start/finish in automation.cron_runs,
--   3) no-op when the lock is already held by a parallel run.
--
-- Operators should re-point pg_cron schedules at the _safe wrappers, e.g.:
--   SELECT cron.unschedule('auto-close-voting');
--   SELECT cron.schedule('auto-close-voting','*/1 * * * *',
--     'SELECT battles.fn_auto_close_voting_safe()');
-- Re-pointing is left to a follow-up ops task to avoid downtime here.

CREATE SCHEMA IF NOT EXISTS automation;

CREATE TABLE IF NOT EXISTS automation.cron_runs (
  id           bigserial PRIMARY KEY,
  job_name     text NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','ok','skipped_locked','error')),
  error_msg    text
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON automation.cron_runs (job_name, started_at DESC);

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_close_voting') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION battles.fn_auto_close_voting_safe()
      RETURNS void LANGUAGE sql
      AS $body$
        SELECT automation.fn_run_with_lock(
          'auto-close-voting',
          'SELECT battles.fn_auto_close_voting()'
        );
      $body$;
    $f$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_finalize_battles') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION battles.fn_auto_finalize_battles_safe()
      RETURNS void LANGUAGE sql
      AS $body$
        SELECT automation.fn_run_with_lock(
          'auto-finalize-battles',
          'SELECT battles.fn_auto_finalize_battles()'
        );
      $body$;
    $f$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'lenses' AND p.proname = 'fn_dispatch_scheduled_workflows') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows_safe()
      RETURNS void LANGUAGE sql
      AS $body$
        SELECT automation.fn_run_with_lock(
          'dispatch-scheduled-workflows',
          'SELECT lenses.fn_dispatch_scheduled_workflows()'
        );
      $body$;
    $f$;
  END IF;
END $$;
