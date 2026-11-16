-- fn_get_workflow_schedules only matched a workflow's owner against the
-- active session lenser (lensers.get_auth_lenser_id()), with no fallback to
-- the resolved human owner (lensers.get_auth_human_lenser_id()) the way
-- fn_upsert_workflow_schedule already does. Acting from inside an AI
-- lenser's agent workspace session (active session lenser = the agent, not
-- its human owner) failed this read-side check, so a schedule created one
-- call earlier via fn_upsert_workflow_schedule came back as [] immediately
-- after. See GitHub issue #480.

CREATE OR REPLACE FUNCTION public.fn_get_workflow_schedules(
  p_workflow_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
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
  WHERE (w.lenser_id = lensers.get_auth_lenser_id()
         OR w.lenser_id = lensers.get_auth_human_lenser_id())
    AND (p_workflow_id IS NULL OR s.workflow_id = p_workflow_id)
  ORDER BY s.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;

COMMENT ON FUNCTION public.fn_get_workflow_schedules(uuid, integer) IS
  'Owner-only workflow schedule list with hard limit for the schedules ops console. Owner match falls back to the resolved human owner so calls from inside an agent workspace session still see the human-owned workflow''s schedules.';
