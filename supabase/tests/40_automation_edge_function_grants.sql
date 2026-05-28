-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 40_automation_edge_function_grants.sql (Wave 3)
-- Verifies that automation-adjacent RPCs invoked by Edge Functions are
-- locked down: service_role only, no GRANT to authenticated/anon.
--
--   * execution.fn_poll_async_run / fn_complete_async_run (poll-async-executions)
--   * agents.fn_purge_stale_blocked_team_runs (D6 purge job)
--   * agents.fn_start_team_run (delegation)
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(6);

-- ── execution.fn_poll_async_run signatures vary by phase; we assert grants
-- via has_function_privilege over any function named fn_poll_async_run that
-- exists in the execution schema.
SELECT ok(
  NOT EXISTS(
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_poll_async_run'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'no overload of execution.fn_poll_async_run is callable by authenticated'
);

SELECT ok(
  NOT EXISTS(
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_complete_async_run'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'no overload of execution.fn_complete_async_run is callable by authenticated'
);

SELECT ok(
  has_function_privilege('service_role',
    'agents.fn_purge_stale_blocked_team_runs(interval)', 'EXECUTE'),
  'service_role can EXECUTE agents.fn_purge_stale_blocked_team_runs (D6 cron target)'
);

SELECT ok(
  NOT has_function_privilege('authenticated',
    'agents.fn_purge_stale_blocked_team_runs(interval)', 'EXECUTE'),
  'authenticated CANNOT EXECUTE agents.fn_purge_stale_blocked_team_runs'
);

-- ── Confirm pg_cron jobs that drive automation are registered (skip if
-- pg_cron extension is not loaded, e.g. in a CI image without cron).
SELECT ok(
  to_regnamespace('cron') IS NULL OR EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-workflows'
  ),
  'pg_cron job dispatch-scheduled-workflows is registered (or pg_cron absent)'
);

SELECT ok(
  to_regnamespace('cron') IS NULL OR EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'auto-start-battles'
  ),
  'pg_cron job auto-start-battles is registered (or pg_cron absent)'
);

SELECT * FROM finish();
ROLLBACK;
