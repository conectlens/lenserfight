-- Phase 2.6: Tool invocation log table
--
-- Captures every tool call an ai_lenser makes during a workflow run, including
-- the approval decision lifecycle. Used for audit trails, cost attribution,
-- and the "awaiting approval" gate UI.

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.tool_invocation_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id     uuid        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  run_id           uuid        REFERENCES lenses.workflow_runs(id) ON DELETE SET NULL,
  tool_name        text        NOT NULL,
  tool_input       jsonb       NOT NULL DEFAULT '{}',
  tool_output      jsonb,
  approval_status  text        NOT NULL DEFAULT 'auto_approved'
    CONSTRAINT tool_invocation_logs_approval_status_check
    CHECK (approval_status IN ('auto_approved', 'awaiting_approval', 'approved', 'rejected')),
  invoked_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz,
  decided_by       uuid        REFERENCES lensers.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_invocation_logs_lenser_time
  ON platform.tool_invocation_logs (ai_lenser_id, invoked_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_invocation_logs_run
  ON platform.tool_invocation_logs (run_id)
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_invocation_logs_pending
  ON platform.tool_invocation_logs (ai_lenser_id, invoked_at DESC)
  WHERE approval_status = 'awaiting_approval';

ALTER TABLE platform.tool_invocation_logs ENABLE ROW LEVEL SECURITY;

-- Owner can SELECT their ai_lenser's invocation logs
CREATE POLICY tool_log_owner_select
  ON platform.tool_invocation_logs
  FOR SELECT
  TO authenticated
  USING (
    ai_lenser_id IN (
      SELECT al.id FROM agents.ai_lensers al
      WHERE al.profile_id = lensers.get_auth_lenser_id()
    )
  );

-- Direct INSERT/UPDATE/DELETE blocked — use fn_decide_tool_invocation RPC
CREATE POLICY tool_log_deny_direct_insert
  ON platform.tool_invocation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY tool_log_deny_direct_update
  ON platform.tool_invocation_logs
  FOR UPDATE
  TO authenticated
  USING (false);

-- service_role bypasses RLS for worker inserts and pg_cron

COMMENT ON TABLE platform.tool_invocation_logs IS
  'Audit log of tool invocations by ai_lensers during workflow runs. '
  'RLS: owner SELECT only; writes go through fn_decide_tool_invocation.';
