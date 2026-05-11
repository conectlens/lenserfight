-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D1: automation.cron_runs lacks RLS.
--
-- The cron_runs audit table records pg_cron job execution outcomes
-- (running / ok / skipped_locked / error) for the advisory-lock-wrapped
-- crons added in 20270510800000_cron_idempotency_guards.sql. The original
-- migration did not enable RLS — authenticated users with a direct DB
-- connection could SELECT every cron run.
--
-- Risk is low (no secrets in the rows) but the table is asymmetric vs.
-- automation.events (RLS on) and automation.event_dispatches (RLS on).
-- Lock it down: only service_role reads, and revoke grants from PUBLIC,
-- authenticated, anon at the table level.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE automation.cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cron_runs_service_only ON automation.cron_runs;
CREATE POLICY cron_runs_service_only
  ON automation.cron_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE automation.cron_runs FROM PUBLIC;
REVOKE ALL ON TABLE automation.cron_runs FROM authenticated;
REVOKE ALL ON TABLE automation.cron_runs FROM anon;
GRANT  SELECT, INSERT, UPDATE ON TABLE automation.cron_runs TO service_role;

COMMENT ON TABLE automation.cron_runs IS
  'D1: cron job execution audit. RLS-enabled; service_role only. Read-only '
  'from any other role.';
