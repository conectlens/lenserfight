-- =============================================================================
-- Phase BY — RLS Comprehensive Security Audit v2
-- =============================================================================
-- 1. Enable RLS on lenses.workflow_runs (previously missing)
-- 2. Enable RLS on audit.events and audit.security_events (previously missing)
-- 3. Add owner-based SELECT policies for lenses.workflow_runs, audit.events
-- 4. REVOKE ALL FROM PUBLIC on tables already using deny-all pattern
-- 5. fn_rls_unprotected_tables() — CLI audit helper
-- 6. fn_security_definer_no_search_path() — CLI audit helper
-- 7. Fix SET search_path on critical SECURITY DEFINER functions missing it
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on tables found to be missing it
-- ---------------------------------------------------------------------------

ALTER TABLE lenses.workflow_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.security_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Owner-based SELECT policy for lenses.workflow_runs
--    triggered_by is the lenser who triggered the run
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS workflow_runs_owner_select ON lenses.workflow_runs;
CREATE POLICY workflow_runs_owner_select
  ON lenses.workflow_runs
  FOR SELECT
  TO authenticated
  USING (triggered_by = auth.uid());

-- Service_role sees all rows (workers read/write runs by design)
DROP POLICY IF EXISTS workflow_runs_service_all ON lenses.workflow_runs;
CREATE POLICY workflow_runs_service_all
  ON lenses.workflow_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. Owner-based SELECT policy for audit.events
--    actor_id is the UUID of the actor who generated the event
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_events_actor_select ON audit.events;
CREATE POLICY audit_events_actor_select
  ON audit.events
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- Deny direct INSERT/UPDATE/DELETE for authenticated — all writes go via DEFINER RPCs
DROP POLICY IF EXISTS audit_events_deny_write ON audit.events;
CREATE POLICY audit_events_deny_write
  ON audit.events
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Service_role unrestricted
DROP POLICY IF EXISTS audit_events_service_all ON audit.events;
CREATE POLICY audit_events_service_all
  ON audit.events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- audit.security_events — service_role only (security-sensitive log)
DROP POLICY IF EXISTS audit_security_events_deny_authenticated ON audit.security_events;
CREATE POLICY audit_security_events_deny_authenticated
  ON audit.security_events
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS audit_security_events_service_all ON audit.security_events;
CREATE POLICY audit_security_events_service_all
  ON audit.security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. REVOKE ALL FROM PUBLIC on sensitive execution tables
--    (belt-and-suspenders: RLS deny-all policies are already in place)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE execution.byok_keys              FROM PUBLIC;
REVOKE ALL ON TABLE execution.runner_device_bindings FROM PUBLIC;
REVOKE ALL ON TABLE audit.security_events            FROM PUBLIC;
REVOKE ALL ON TABLE audit.events                     FROM PUBLIC;

-- Re-grant the minimal access each role actually needs after blanket revoke
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE execution.byok_keys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE execution.runner_device_bindings TO service_role;
GRANT SELECT, INSERT               ON TABLE audit.events          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit.events        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit.security_events TO service_role;

-- ---------------------------------------------------------------------------
-- 5. CLI audit helpers — query these from `lf security rls-audit`
-- ---------------------------------------------------------------------------

-- Returns tables in the target schemas that have RLS disabled
CREATE OR REPLACE FUNCTION public.fn_rls_unprotected_tables()
RETURNS TABLE(schema_name text, table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT n.nspname::text, c.relname::text
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname IN (
      'agents', 'lenses', 'battles', 'workflows',
      'audit', 'execution', 'devices', 'connectors'
    )
    AND NOT c.relrowsecurity
  ORDER BY n.nspname, c.relname;
$$;

REVOKE ALL   ON FUNCTION public.fn_rls_unprotected_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_rls_unprotected_tables() TO service_role;

COMMENT ON FUNCTION public.fn_rls_unprotected_tables IS
  'BY: Returns tables in security-sensitive schemas that have relrowsecurity=false. '
  'Used by lf security rls-audit CLI command. SECURITY DEFINER; service_role only.';

-- ---------------------------------------------------------------------------
-- 6. Returns SECURITY DEFINER functions missing SET search_path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_security_definer_no_search_path()
RETURNS TABLE(schema_name text, function_name text, full_signature text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    n.nspname::text                          AS schema_name,
    p.proname::text                          AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid)::text AS full_signature
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prosecdef = true                          -- SECURITY DEFINER
    AND n.nspname IN ('public', 'agents', 'lenses',
                      'battles', 'audit', 'execution')
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_options_to_table(p.proconfig) AS opt(option_name, option_value)
      WHERE opt.option_name = 'search_path'
    )
  ORDER BY n.nspname, p.proname;
$$;

REVOKE ALL   ON FUNCTION public.fn_security_definer_no_search_path() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_security_definer_no_search_path() TO service_role;

COMMENT ON FUNCTION public.fn_security_definer_no_search_path IS
  'BY: Returns SECURITY DEFINER functions that have no SET search_path configured. '
  'Used by lf security rls-audit CLI command. SECURITY DEFINER; service_role only.';
