-- Add fn_retry_agent_run(p_ai_lenser_id, p_run_id)
-- Clones a terminal run (failed / cancelled / completed) as a new queued run
-- owned by the same agent, preserving workflow linkage and metadata.
-- Returns the new team_run id as text (PostgREST RPC convention).

DROP FUNCTION IF EXISTS public.fn_retry_agent_run(uuid, uuid);

CREATE OR REPLACE FUNCTION public.fn_retry_agent_run(
  p_ai_lenser_id uuid,
  p_run_id       uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_run     agents.team_runs;
  v_new_id  uuid;
BEGIN
  SELECT * INTO v_run
    FROM agents.team_runs
   WHERE id = p_run_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team run not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_run.ai_lenser_id <> p_ai_lenser_id THEN
    RAISE EXCEPTION 'run does not belong to this agent' USING ERRCODE = '42501';
  END IF;

  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  IF v_run.status NOT IN ('failed', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'only terminal runs can be retried' USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.team_runs (
    ai_lenser_id,
    team_id,
    workflow_id,
    workflow_assignment_id,
    status,
    approval_status,
    metadata
  ) VALUES (
    v_run.ai_lenser_id,
    v_run.team_id,
    v_run.workflow_id,
    v_run.workflow_assignment_id,
    'queued',
    'pending',
    jsonb_build_object('retried_from', v_run.id)
  )
  RETURNING id INTO v_new_id;

  INSERT INTO agents.agent_run_events (
    team_run_id,
    event_type,
    payload,
    occurred_at
  ) VALUES (
    v_new_id,
    'run_retried',
    jsonb_build_object(
      'original_run_id', v_run.id,
      'retried_by',      auth.uid()
    ),
    now()
  );

  RETURN v_new_id::text;
END;
$$;

ALTER FUNCTION public.fn_retry_agent_run(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_retry_agent_run(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_retry_agent_run(uuid, uuid) IS
  'Clone a terminal (failed/cancelled/completed) team_run as a new queued run. '
  'Returns the new run id. Authorization via agents.can_manage_ai_lenser.';
