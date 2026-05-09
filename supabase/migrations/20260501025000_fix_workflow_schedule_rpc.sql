-- Fix the schedule upsert RPC return query and harden the minute dispatcher
-- against duplicate concurrent dispatches.

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_schedule_slot
  ON lenses.workflow_runs (schedule_id, scheduled_for)
  WHERE schedule_id IS NOT NULL
    AND scheduled_for IS NOT NULL;

COMMENT ON COLUMN lenses.workflow_runs.scheduled_for IS
  'Normalized schedule slot (minute precision) that produced this run. NULL for manual or subflow runs.';

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id uuid,
  p_schedule_id uuid DEFAULT NULL,
  p_cron_expr text DEFAULT '* * * * *',
  p_timezone text DEFAULT 'UTC',
  p_global_model_id text DEFAULT NULL,
  p_inputs_template jsonb DEFAULT '{}'::jsonb,
  p_is_active boolean DEFAULT true,
  p_assignee_type text DEFAULT 'agent',
  p_assignee_id uuid DEFAULT NULL,
  p_workflow_assignment_id uuid DEFAULT NULL,
  p_approval_policy jsonb DEFAULT '{"requiresApproval":true}'::jsonb,
  p_retry_policy jsonb DEFAULT '{"maxRetries":1}'::jsonb,
  p_failure_policy jsonb DEFAULT '{"mode":"isolate"}'::jsonb,
  p_queue_policy jsonb DEFAULT '{"mode":"parallel"}'::jsonb
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  workflow_title text,
  cron_expr text,
  timezone text,
  global_model_id text,
  inputs_template jsonb,
  is_active boolean,
  assignee_type text,
  assignee_id uuid,
  workflow_assignment_id uuid,
  approval_policy jsonb,
  retry_policy jsonb,
  failure_policy jsonb,
  queue_policy jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_id uuid,
  last_dispatch_status text,
  last_error_at timestamptz,
  last_error_message text,
  last_completed_at timestamptz,
  last_result jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_owner_id uuid;
  v_schedule_id uuid;
  v_parts text[];
BEGIN
  SELECT w.lenser_id INTO v_owner_id
  FROM lenses.workflows w
  WHERE w.id = p_workflow_id;

  IF v_owner_id IS NULL OR v_owner_id <> lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'Workflow not found or not owned by the active workspace'
      USING ERRCODE = '42501';
  END IF;

  v_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'Invalid CRON expression. Expected 5 fields.'
      USING ERRCODE = '22023';
  END IF;

  IF p_assignee_type NOT IN ('agent', 'team') THEN
    RAISE EXCEPTION 'Invalid assignee type. Expected agent or team.'
      USING ERRCODE = '22023';
  END IF;

  IF p_is_active AND lenses.fn_workflow_has_cycle(p_workflow_id) THEN
    RAISE EXCEPTION 'Cannot activate schedule for a workflow with cycles'
      USING ERRCODE = '22023', DETAIL = 'cycle_detected';
  END IF;

  IF p_schedule_id IS NULL THEN
    INSERT INTO lenses.workflow_schedules (
      workflow_id,
      cron_expr,
      timezone,
      global_model_id,
      inputs_template,
      is_active,
      assignee_type,
      assignee_id,
      workflow_assignment_id,
      approval_policy,
      retry_policy,
      failure_policy,
      queue_policy
    ) VALUES (
      p_workflow_id,
      p_cron_expr,
      COALESCE(NULLIF(trim(p_timezone), ''), 'UTC'),
      p_global_model_id,
      COALESCE(p_inputs_template, '{}'::jsonb),
      p_is_active,
      p_assignee_type,
      p_assignee_id,
      p_workflow_assignment_id,
      COALESCE(p_approval_policy, '{"requiresApproval":true}'::jsonb),
      COALESCE(p_retry_policy, '{"maxRetries":1}'::jsonb),
      COALESCE(p_failure_policy, '{"mode":"isolate"}'::jsonb),
      COALESCE(p_queue_policy, '{"mode":"parallel"}'::jsonb)
    )
    RETURNING workflow_schedules.id INTO v_schedule_id;
  ELSE
    UPDATE lenses.workflow_schedules s
    SET
      cron_expr = p_cron_expr,
      timezone = COALESCE(NULLIF(trim(p_timezone), ''), s.timezone, 'UTC'),
      global_model_id = p_global_model_id,
      inputs_template = COALESCE(p_inputs_template, '{}'::jsonb),
      is_active = p_is_active,
      assignee_type = p_assignee_type,
      assignee_id = p_assignee_id,
      workflow_assignment_id = p_workflow_assignment_id,
      approval_policy = COALESCE(p_approval_policy, s.approval_policy, '{}'::jsonb),
      retry_policy = COALESCE(p_retry_policy, s.retry_policy, '{}'::jsonb),
      failure_policy = COALESCE(p_failure_policy, s.failure_policy, '{}'::jsonb),
      queue_policy = COALESCE(p_queue_policy, s.queue_policy, '{}'::jsonb),
      last_dispatch_status = CASE
        WHEN p_is_active THEN NULL
        ELSE COALESCE(s.last_dispatch_status, 'paused')
      END,
      last_error_at = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_at
      END,
      last_error_message = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_message
      END
    WHERE s.id = p_schedule_id
      AND s.workflow_id = p_workflow_id
    RETURNING s.id INTO v_schedule_id;

    IF v_schedule_id IS NULL THEN
      RAISE EXCEPTION 'Schedule not found or not owned by the active workspace'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workflow_id,
    w.title AS workflow_title,
    s.cron_expr,
    s.timezone,
    s.global_model_id,
    s.inputs_template,
    s.is_active,
    s.assignee_type,
    s.assignee_id,
    s.workflow_assignment_id,
    s.approval_policy,
    s.retry_policy,
    s.failure_policy,
    s.queue_policy,
    s.next_run_at,
    s.last_run_at,
    s.last_run_id,
    s.last_dispatch_status,
    s.last_error_at,
    s.last_error_message,
    s.last_completed_at,
    s.last_result,
    s.created_at
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  WHERE s.id = v_schedule_id
    AND w.id = p_workflow_id
    AND w.lenser_id = lensers.get_auth_lenser_id();
END;
$$;

ALTER FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_scheduled_for timestamptz := date_trunc('minute', v_now);
  v_schedule RECORD;
  v_run_id uuid;
  v_ai_lenser_id uuid;
  v_dispatched integer := 0;
BEGIN
  FOR v_schedule IN
    SELECT
      s.id,
      s.workflow_id,
      s.cron_expr,
      s.global_model_id,
      s.inputs_template,
      s.is_active,
      s.last_run_at,
      s.assignee_type,
      s.assignee_id,
      s.workflow_assignment_id,
      w.lenser_id,
      w.title
    FROM lenses.workflow_schedules s
    JOIN lenses.workflows w ON w.id = s.workflow_id
    WHERE s.is_active = true
      AND (s.last_run_at IS NULL OR date_trunc('minute', s.last_run_at) < v_scheduled_for)
      AND lenses.fn_cron_matches_now(s.cron_expr, v_now)
    ORDER BY s.created_at ASC
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    SELECT al.id INTO v_ai_lenser_id
    FROM agents.ai_lensers al
    WHERE al.profile_id = v_schedule.lenser_id
    LIMIT 1;

    IF lenses.fn_workflow_has_cycle(v_schedule.workflow_id) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'validation_failed',
        last_error_at = v_now,
        last_error_message = 'cycle_detected'
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'schedule_skipped',
          'failed',
          jsonb_build_object(
            'reason', 'cycle_detected',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'scheduled_for', v_scheduled_for
          )
        );
      END IF;

      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      WHERE r.schedule_id = v_schedule.id
        AND r.status IN ('draft', 'validated', 'queued', 'pending', 'running', 'streaming', 'recovered')
    ) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'skipped_overlap',
        last_error_at = v_now,
        last_error_message = 'overlap_in_flight'
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'schedule_skipped',
          'throttled',
          jsonb_build_object(
            'reason', 'overlap_in_flight',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'scheduled_for', v_scheduled_for
          )
        );
      END IF;

      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO lenses.workflow_runs (
        workflow_id,
        triggered_by,
        status,
        context_inputs,
        global_model_id,
        schedule_id,
        scheduled_for,
        trigger_mode
      ) VALUES (
        v_schedule.workflow_id,
        v_schedule.lenser_id,
        'pending',
        COALESCE(v_schedule.inputs_template, '{}'::jsonb),
        v_schedule.global_model_id,
        v_schedule.id,
        v_scheduled_for,
        'schedule'
      )
      RETURNING id INTO v_run_id;

      INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
      SELECT v_run_id, n.id, 'pending'
      FROM lenses.workflow_nodes n
      WHERE n.workflow_id = v_schedule.workflow_id;

      UPDATE lenses.workflow_schedules
      SET
        last_run_at = v_now,
        last_run_id = v_run_id,
        last_dispatch_status = 'dispatched',
        last_error_at = NULL,
        last_error_message = NULL
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'dispatch_schedule',
          'success',
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'workflow_title', v_schedule.title,
            'run_id', v_run_id,
            'trigger_mode', 'schedule',
            'scheduled_for', v_scheduled_for,
            'assignee_type', v_schedule.assignee_type,
            'assignee_id', v_schedule.assignee_id,
            'workflow_assignment_id', v_schedule.workflow_assignment_id
          )
        );
      END IF;

      v_dispatched := v_dispatched + 1;
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_overlap',
          last_error_at = v_now,
          last_error_message = 'schedule_slot_exists'
        WHERE id = v_schedule.id;

        IF v_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id,
            action_type,
            result,
            metadata
          ) VALUES (
            v_ai_lenser_id,
            'schedule_skipped',
            'throttled',
            jsonb_build_object(
              'reason', 'schedule_slot_exists',
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for
            )
          );
        END IF;
      WHEN OTHERS THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'dispatch_failed',
          last_error_at = v_now,
          last_error_message = left(SQLERRM, 500)
        WHERE id = v_schedule.id;

        IF v_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id,
            action_type,
            result,
            metadata
          ) VALUES (
            v_ai_lenser_id,
            'dispatch_schedule',
            'failed',
            jsonb_build_object(
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'error', left(SQLERRM, 500)
            )
          );
        END IF;
    END;
  END LOOP;

  RETURN v_dispatched;
END;
$$;

ALTER FUNCTION lenses.fn_dispatch_scheduled_workflows() OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'Dispatches minute-granularity workflow schedules, locks schedule rows during selection, and assigns a unique scheduled_for slot to prevent duplicate concurrent dispatches.';

GRANT EXECUTE ON FUNCTION lenses.fn_dispatch_scheduled_workflows() TO service_role;
