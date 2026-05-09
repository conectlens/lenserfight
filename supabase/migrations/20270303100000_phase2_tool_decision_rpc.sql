-- Phase 2.7: Tool decision RPC
--
-- fn_decide_tool_invocation: SECURITY DEFINER RPC that records an approve or
-- reject decision on a platform.tool_invocation_logs row and emits a
-- 'tool_decision' event into lenses.workflow_run_events so the UI can reflect
-- the decision in the run timeline.

CREATE OR REPLACE FUNCTION public.fn_decide_tool_invocation(
  p_log_id   uuid,
  p_decision text,
  p_reason   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'platform', 'lenses', 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_auth_lenser_id uuid;
  v_log            platform.tool_invocation_logs%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision "%" — must be ''approved'' or ''rejected''', p_decision
      USING ERRCODE = '22023';
  END IF;

  v_auth_lenser_id := lensers.get_auth_lenser_id();

  SELECT * INTO v_log
  FROM platform.tool_invocation_logs
  WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tool_invocation_log % not found', p_log_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Caller must own the ai_lenser that produced this log entry
  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    WHERE al.id = v_log.ai_lenser_id
      AND al.profile_id = v_auth_lenser_id
  ) THEN
    RAISE EXCEPTION 'Not authorised to decide on tool invocation log %', p_log_id
      USING ERRCODE = '42501';
  END IF;

  IF v_log.approval_status <> 'awaiting_approval' THEN
    RAISE EXCEPTION 'Cannot decide on log % with status "%"', p_log_id, v_log.approval_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE platform.tool_invocation_logs
  SET
    approval_status = p_decision,
    decided_at      = now(),
    decided_by      = v_auth_lenser_id
  WHERE id = p_log_id;

  -- Emit a tool_decision event into the run timeline if the log is tied to a run
  IF v_log.run_id IS NOT NULL THEN
    INSERT INTO lenses.workflow_run_events (run_id, type, payload)
    VALUES (
      v_log.run_id,
      'tool_decision',
      jsonb_build_object(
        'log_id',    p_log_id,
        'tool_name', v_log.tool_name,
        'decision',  p_decision,
        'reason',    p_reason,
        'decided_by', v_auth_lenser_id,
        'decided_at', now()
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_decide_tool_invocation(uuid, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.fn_decide_tool_invocation(uuid, text, text) IS
  'Records approve/reject decision on platform.tool_invocation_logs and emits '
  'a tool_decision event to lenses.workflow_run_events for run timeline visibility.';
