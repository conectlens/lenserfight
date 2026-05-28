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
SELECT plan(4);

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

SELECT * FROM finish();
ROLLBACK;
