-- Schedule Dispatch Completion Migration
-- Adds dispatch-related action types, schedule history RPC, and approval-aware dispatching.

-- ── Expand action_logs constraint ────────────────────────────────────────────

ALTER TABLE lenses.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check;

ALTER TABLE lenses.action_logs
  ADD CONSTRAINT action_logs_type_check CHECK (
    type IN (
      'create', 'update', 'delete', 'publish', 'submit', 'vote',
      'dispatch_schedule', 'schedule_skipped', 'join_battle', 'spend_credits',
      'follow', 'unfollow', 'block', 'unblock'
    )
  );

-- ── fn_get_workflow_schedule_history ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_workflow_schedule_history(
  p_schedule_id uuid
)
RETURNS TABLE (
  id            uuid,
  workflow_id   uuid,
  status        text,
  scheduled_for timestamptz,
  started_at    timestamptz,
  completed_at  timestamptz,
  error_message text,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT wr.id, wr.workflow_id, wr.status::text,
           wr.scheduled_for, wr.started_at, wr.completed_at,
           wr.error_message, wr.created_at
      FROM lenses.workflow_runs wr
     WHERE wr.schedule_id = p_schedule_id
       AND wr.scheduled_for IS NOT NULL
     ORDER BY wr.scheduled_for DESC
     LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_workflow_schedule_history TO authenticated;

-- ── Approval-aware dispatch function ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_dispatch_scheduled_workflows_with_approval()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_schedule           record;
  v_assignee_ai_lenser_id uuid;
  v_requires_approval  boolean;
  v_team_run_id        uuid;
  v_run_status         text;
  v_approval_status    text;
BEGIN
  FOR v_schedule IN
    SELECT s.*
      FROM lenses.workflow_schedules s
     WHERE s.is_active = true
       AND s.next_run_at <= now()
     FOR UPDATE OF s SKIP LOCKED
  LOOP
    -- Resolve assignee AI lenser from agent or team
    v_assignee_ai_lenser_id := NULL;

    IF v_schedule.assignee_type = 'agent' THEN
      SELECT al.id INTO v_assignee_ai_lenser_id
        FROM agents.ai_lensers al
       WHERE al.id = v_schedule.assignee_id;
    ELSIF v_schedule.assignee_type = 'team' THEN
      SELECT t.ai_lenser_id INTO v_assignee_ai_lenser_id
        FROM agents.teams t
       WHERE t.id = v_schedule.assignee_id;
    END IF;

    -- Check if approval is required
    v_requires_approval := COALESCE(
      (v_schedule.approval_policy->>'requiresApproval')::boolean,
      true
    );

    -- Set status based on approval requirement
    v_run_status := CASE WHEN v_requires_approval THEN 'blocked' ELSE 'queued' END;
    v_approval_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'not_required' END;

    -- Create team run with approval-aware status
    INSERT INTO agents.team_runs (
      workflow_id, schedule_id, ai_lenser_id,
      status, approval_status, scheduled_for
    ) VALUES (
      v_schedule.workflow_id, v_schedule.id, v_assignee_ai_lenser_id,
      v_run_status, v_approval_status, v_schedule.next_run_at
    )
    RETURNING id INTO v_team_run_id;

    -- Emit agent_run_events on dispatch
    IF v_requires_approval THEN
      INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
      VALUES (v_team_run_id, 'approval_requested', '{}');
    END IF;

    INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
    VALUES (v_team_run_id, 'dispatch_queued', jsonb_build_object(
      'schedule_id', v_schedule.id,
      'assignee_ai_lenser_id', v_assignee_ai_lenser_id
    ));

    -- Advance next_run_at
    UPDATE lenses.workflow_schedules
       SET next_run_at = now() + interval '1 hour',
           last_run_at = now(),
           last_dispatch_status = 'dispatched'
     WHERE id = v_schedule.id;
  END LOOP;
END;
$$;
