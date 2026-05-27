-- Phase 2: Schedule RLS Owner Filter
-- Restricts workflow_schedules access to the schedule owner via RLS.

ALTER TABLE lenses.workflow_schedules ENABLE ROW LEVEL SECURITY;

-- ── SELECT policy — only the workflow owner can view their schedules ─────────

CREATE POLICY schedule_select_owner ON lenses.workflow_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM lenses.workflows w
       WHERE w.id = workflow_schedules.workflow_id
         AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- ── UPDATE policy — only the workflow owner can modify their schedules ───────

CREATE POLICY schedule_update_owner ON lenses.workflow_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM lenses.workflows w
       WHERE w.id = workflow_schedules.workflow_id
         AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- ── DELETE policy — only the workflow owner can delete their schedules ───────

CREATE POLICY schedule_delete_owner ON lenses.workflow_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM lenses.workflows w
       WHERE w.id = workflow_schedules.workflow_id
         AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  );
