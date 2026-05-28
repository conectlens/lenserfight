-- Manual Run Attribution Migration
-- Replaces fn_start_workflow_run to auto-resolve the AI lenser from the active profile.

-- ── Internal function in lenses schema ───────────────────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id      uuid,
  p_inputs           jsonb DEFAULT '{}',
  p_global_model_id  text  DEFAULT NULL,
  p_idempotency_key  text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lenser_id       uuid;
  v_ai_lenser_id    uuid;
  v_workflow        record;
  v_run_id          uuid;
  v_recent_count    int;
BEGIN
  -- Resolve the authenticated lenser
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Auto-resolve v_ai_lenser_id from the active profile
  SELECT al.id INTO v_ai_lenser_id
    FROM lensers.profiles p
    JOIN agents.ai_lensers al ON al.profile_id = p.id
   WHERE p.user_id = auth.uid()
     AND p.type = 'ai'
     AND p.status = 'active'
   LIMIT 1;

  -- Validate the workflow exists and belongs to the caller
  SELECT w.* INTO v_workflow
    FROM lenses.workflows w
   WHERE w.id = p_workflow_id
     AND w.lenser_id = v_lenser_id;

  IF v_workflow IS NULL THEN
    RAISE EXCEPTION 'workflow_not_found';
  END IF;

  -- Rate-limiting check
  v_recent_count := lenses.fn_count_recent_runs(p_workflow_id, interval '1 minute');
  IF v_recent_count >= 10 THEN
    RETURN jsonb_build_object('status', 'rate_limited', 'message', 'Too many runs in the last minute');
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT wr.id INTO v_run_id
      FROM lenses.workflow_runs wr
     WHERE wr.workflow_id = p_workflow_id
       AND wr.idempotency_key = p_idempotency_key;
    IF v_run_id IS NOT NULL THEN
      RETURN jsonb_build_object('status', 'duplicate', 'run_id', v_run_id);
    END IF;
  END IF;

  -- Create the run with ai_lenser_id attribution
  INSERT INTO lenses.workflow_runs (
    workflow_id, lenser_id, ai_lenser_id, status,
    inputs, global_model_id, idempotency_key
  ) VALUES (
    p_workflow_id, v_lenser_id, v_ai_lenser_id, 'queued',
    p_inputs, p_global_model_id, p_idempotency_key
  )
  RETURNING id INTO v_run_id;

  RETURN jsonb_build_object('status', 'queued', 'run_id', v_run_id);
END;
$$;

-- ── Public wrapper with unchanged signature ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id      uuid,
  p_inputs           jsonb DEFAULT '{}',
  p_global_model_id  text  DEFAULT NULL,
  p_idempotency_key  text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key);
$$;

GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO authenticated;
