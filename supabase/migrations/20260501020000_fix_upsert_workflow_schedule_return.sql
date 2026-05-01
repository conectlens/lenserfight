-- Fix invalid FROM-clause table reference in fn_upsert_workflow_schedule.
-- The RETURN QUERY used "public.fn_get_workflow_schedules.id" as a column
-- qualifier, which Postgres rejects (42P01). Alias the SRF call instead.

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
  SELECT *
  FROM public.fn_get_workflow_schedules(p_workflow_id) AS sched
  WHERE sched.id = v_schedule_id;
END;
$$;

ALTER FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
