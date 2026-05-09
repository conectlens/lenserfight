-- Phase 2: RLS owner filter for lenses.workflow_schedules
--
-- Direct SELECT on workflow_schedules is restricted to the owning lenser.
-- INSERT/UPDATE/DELETE are denied for all roles — mutations must go through
-- the SECURITY DEFINER fn_upsert_workflow_schedule RPC, which enforces
-- the owner check, CRON validation, and spending-limit guard.

ALTER TABLE lenses.workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS schedule_owner_select ON lenses.workflow_schedules;
DROP POLICY IF EXISTS schedule_deny_direct_write ON lenses.workflow_schedules;

-- Authenticated users can SELECT their own schedules (via the workflow's lenser_id)
CREATE POLICY schedule_owner_select
  ON lenses.workflow_schedules
  FOR SELECT
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id FROM lenses.workflows
      WHERE lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- Direct INSERT is blocked — use fn_upsert_workflow_schedule
CREATE POLICY schedule_deny_direct_insert
  ON lenses.workflow_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Direct UPDATE is blocked — use fn_upsert_workflow_schedule
CREATE POLICY schedule_deny_direct_update
  ON lenses.workflow_schedules
  FOR UPDATE
  TO authenticated
  USING (false);

-- Direct DELETE is blocked — use fn_upsert_workflow_schedule with p_is_active=false
CREATE POLICY schedule_deny_direct_delete
  ON lenses.workflow_schedules
  FOR DELETE
  TO authenticated
  USING (false);

-- service_role bypasses RLS for pg_cron and worker access (Supabase default)

COMMENT ON TABLE lenses.workflow_schedules IS
  'CRON schedules for automated workflow runs. '
  'RLS: SELECT is scoped to owning lenser; writes must go through fn_upsert_workflow_schedule.';
