-- =============================================================================
-- Phase AL — Live Delegation Runtime
-- =============================================================================
-- Provides the two RPCs the workflow execution engine + team-run-worker need
-- to dispatch and claim child agents.team_runs from a `delegate_to_agent`
-- workflow action:
--
--   1. agents.fn_start_team_run(ai_lenser_id, workflow_id, inputs, policy)
--      — creates a new team_runs row with status/approval driven by policy:
--          'auto'              → status=queued, approval_status=not_required
--          'approval_required' → status=blocked, approval_status=pending
--          'forbidden'         → RAISES delegation_forbidden (no INSERT)
--      Returns the new team_run id.
--
--   2. agents.fn_claim_team_run(worker_id)
--      — FOR UPDATE SKIP LOCKED on team_runs WHERE status='queued'.
--      Returns the claimed row + transitions status='running' atomically.
--
-- Both are SECURITY DEFINER + service_role only — execution.workflow-engine
-- and the worker are the only callers.
-- =============================================================================

CREATE OR REPLACE FUNCTION agents.fn_start_team_run(
  p_ai_lenser_id UUID,
  p_workflow_id  UUID,
  p_inputs       JSONB DEFAULT '{}'::JSONB,
  p_policy       TEXT  DEFAULT 'auto'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_team_run_id     UUID;
  v_status          TEXT;
  v_approval_status TEXT;
BEGIN
  IF p_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'ai_lenser_id is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_policy NOT IN ('auto', 'approval_required', 'forbidden') THEN
    RAISE EXCEPTION 'Unknown delegation policy: %', p_policy
      USING ERRCODE = 'check_violation';
  END IF;

  -- 'forbidden' raises BEFORE any side-effect — the workflow engine surfaces
  -- this as a node failure. The AL pgTAP suite asserts this invariant.
  IF p_policy = 'forbidden' THEN
    RAISE EXCEPTION 'delegation_forbidden'
      USING ERRCODE = 'P0001',
            HINT    = 'Workflow node delegationPolicy=forbidden';
  END IF;

  -- Map policy → (status, approval_status). Mirrors the convention used by
  -- lenses.fn_dispatch_scheduled_workflows so downstream UI / triggers don't
  -- need to special-case runtime vs scheduled origins.
  IF p_policy = 'approval_required' THEN
    v_status          := 'blocked';
    v_approval_status := 'pending';
  ELSE
    v_status          := 'queued';
    v_approval_status := 'not_required';
  END IF;

  INSERT INTO agents.team_runs (
    ai_lenser_id,
    workflow_id,
    status,
    approval_status,
    metadata
  )
  VALUES (
    p_ai_lenser_id,
    p_workflow_id,
    v_status,
    v_approval_status,
    jsonb_build_object(
      'inputs',         p_inputs,
      'origin',         'delegate_to_agent',
      'delegation_policy', p_policy
    )
  )
  RETURNING id INTO v_team_run_id;

  -- Emit a baseline lifecycle event so the realtime UI can pick it up.
  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
  VALUES (
    v_team_run_id,
    CASE WHEN p_policy = 'approval_required' THEN 'approval_requested' ELSE 'dispatch_queued' END,
    jsonb_build_object(
      'workflow_id',       p_workflow_id,
      'delegation_policy', p_policy,
      'requires_approval', p_policy = 'approval_required'
    )
  );

  RETURN v_team_run_id;
END;
$$;

REVOKE ALL ON FUNCTION agents.fn_start_team_run(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.fn_start_team_run(UUID, UUID, JSONB, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_start_team_run(UUID, UUID, JSONB, TEXT) TO service_role;

COMMENT ON FUNCTION agents.fn_start_team_run IS
  'Phase AL: creates an agents.team_runs row when a workflow node executes a '
  '`delegate_to_agent` action. Status mapping: auto→queued/not_required, '
  'approval_required→blocked/pending, forbidden→RAISE. SECURITY DEFINER; '
  'service_role only.';

-- ---------------------------------------------------------------------------
-- fn_claim_team_run — atomic claim for the team-run-worker
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agents.fn_claim_team_run(
  p_worker_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  ai_lenser_id    UUID,
  workflow_id     UUID,
  workflow_run_id UUID,
  metadata        JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Take ONE queued team run with SKIP LOCKED so concurrent workers don't
  -- contend. This mirrors the pattern used by execution.fn_poll_async_run.
  SELECT tr.id INTO v_id
  FROM agents.team_runs tr
  WHERE tr.status = 'queued'
    AND tr.approval_status IN ('not_required', 'approved')
  ORDER BY tr.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE agents.team_runs
  SET status     = 'running',
      started_at = COALESCE(started_at, now()),
      updated_at = now(),
      metadata   = metadata || jsonb_build_object(
        'claimed_by', COALESCE(p_worker_id, 'unknown'),
        'claimed_at', now()
      )
  WHERE id = v_id;

  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
  VALUES (
    v_id,
    'dispatch_started',
    jsonb_build_object('worker_id', COALESCE(p_worker_id, 'unknown'))
  );

  RETURN QUERY
    SELECT tr.id, tr.ai_lenser_id, tr.workflow_id, tr.workflow_run_id, tr.metadata
    FROM agents.team_runs tr
    WHERE tr.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION agents.fn_claim_team_run(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.fn_claim_team_run(TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_claim_team_run(TEXT) TO service_role;

COMMENT ON FUNCTION agents.fn_claim_team_run IS
  'Phase AL: claims one queued agents.team_runs row using FOR UPDATE SKIP LOCKED. '
  'Transitions status=running and returns the row. Concurrent workers do not '
  'double-claim. SECURITY DEFINER; service_role only.';
