-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D12: execution.fn_poll_async_run / fn_complete_async_run are
-- callable by anon + authenticated, even though only the poll-async-executions
-- Edge Function (which uses the service-role key) is meant to invoke them.
--
-- The execution schema is not exposed to PostgREST, so HTTP callers cannot
-- reach these today, but the GRANTs themselves are excessive (defense in
-- depth: if the exposed-schemas list is ever extended, anon shouldn't
-- inherit poll/complete privileges).
--
-- Surfaced by pgTAP 40_automation_edge_function_grants.sql.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname || '.' || p.proname || '(' ||
           pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'execution'
      AND  p.proname IN ('fn_poll_async_run', 'fn_complete_async_run')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

COMMENT ON SCHEMA execution IS
  'D12: poll/complete RPCs are service_role only (called by the '
  'poll-async-executions Edge Function which uses the service-role key).';
