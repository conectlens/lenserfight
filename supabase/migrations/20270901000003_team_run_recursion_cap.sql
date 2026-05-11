-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D5: enforce recursion-depth cap on agents.fn_start_team_run
--
-- A workflow node whose delegation policy is `auto` can dispatch a child
-- team_run via fn_start_team_run. Without a depth cap, a team workflow
-- containing its own delegate_to_agent node will spawn unboundedly,
-- consuming credits and pile-up DB rows.
--
-- Surface: any service-role caller of agents.fn_start_team_run.
--
-- Fix:
--   1. Add `parent_team_run_id uuid` column to agents.team_runs (nullable).
--   2. Add `recursion_depth integer NOT NULL DEFAULT 0`.
--   3. Extend fn_start_team_run to read `_parent_team_run_id` from p_inputs,
--      compute depth via parent chain, and reject when depth would exceed 8.
--
-- Cap chosen to mirror lenses.workflow_runs.recursion_depth ∈ [0,8].
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE agents.team_runs
  ADD COLUMN IF NOT EXISTS parent_team_run_id uuid
    REFERENCES agents.team_runs(id) ON DELETE SET NULL;

ALTER TABLE agents.team_runs
  ADD COLUMN IF NOT EXISTS recursion_depth integer NOT NULL DEFAULT 0;

ALTER TABLE agents.team_runs
  DROP CONSTRAINT IF EXISTS team_runs_recursion_depth_range;
ALTER TABLE agents.team_runs
  ADD  CONSTRAINT team_runs_recursion_depth_range
    CHECK (recursion_depth BETWEEN 0 AND 8);

CREATE INDEX IF NOT EXISTS idx_team_runs_parent
  ON agents.team_runs(parent_team_run_id)
  WHERE parent_team_run_id IS NOT NULL;

COMMENT ON COLUMN agents.team_runs.parent_team_run_id IS
  'D5: parent team_run that delegated to this run; used to enforce recursion cap.';
COMMENT ON COLUMN agents.team_runs.recursion_depth IS
  'D5: cached depth in parent_team_run_id chain; rejected at start when > 8.';

-- ── Updated fn_start_team_run with depth-cap enforcement ───────────────────
CREATE OR REPLACE FUNCTION agents.fn_start_team_run(
  p_ai_lenser_id  uuid,
  p_workflow_id   uuid,
  p_inputs        jsonb DEFAULT '{}'::jsonb,
  p_policy        text  DEFAULT 'auto'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'agents', 'public'
AS $function$
DECLARE
  v_team_run_id     uuid;
  v_status          text;
  v_approval_status text;
  v_parent_id       uuid;
  v_parent_depth    integer;
  v_new_depth       integer;
BEGIN
  IF p_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'ai_lenser_id is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_policy NOT IN ('auto', 'approval_required', 'forbidden') THEN
    RAISE EXCEPTION 'Unknown delegation policy: %', p_policy
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_policy = 'forbidden' THEN
    RAISE EXCEPTION 'delegation_forbidden'
      USING ERRCODE = 'P0001',
            HINT    = 'Workflow node delegationPolicy=forbidden';
  END IF;

  -- ── D5: recursion-depth cap ──────────────────────────────────────────────
  -- Workers pass the parent team_run id via the inputs envelope:
  --   p_inputs := jsonb_build_object('_parent_team_run_id', <uuid>, ...)
  IF p_inputs IS NOT NULL AND p_inputs ? '_parent_team_run_id' THEN
    BEGIN
      v_parent_id := (p_inputs->>'_parent_team_run_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_parent_id := NULL;
    END;
  END IF;

  IF v_parent_id IS NOT NULL THEN
    SELECT recursion_depth INTO v_parent_depth
    FROM agents.team_runs
    WHERE id = v_parent_id;

    v_new_depth := COALESCE(v_parent_depth, 0) + 1;

    IF v_new_depth > 8 THEN
      RAISE EXCEPTION
        'team_run_recursion_cap_exceeded: depth=% > 8 (parent=%)',
        v_new_depth, v_parent_id
        USING ERRCODE = '54000',
              HINT    = 'D5: agents.fn_start_team_run recursion cap';
    END IF;
  ELSE
    v_new_depth := 0;
  END IF;
  -- ── End D5 ───────────────────────────────────────────────────────────────

  IF p_policy = 'approval_required' THEN
    v_status          := 'blocked';
    v_approval_status := 'pending';
  ELSE
    v_status          := 'queued';
    v_approval_status := 'not_required';
  END IF;

  INSERT INTO agents.team_runs (
    ai_lenser_id, workflow_id, status, approval_status,
    parent_team_run_id, recursion_depth, metadata
  )
  VALUES (
    p_ai_lenser_id, p_workflow_id, v_status, v_approval_status,
    v_parent_id, v_new_depth,
    jsonb_build_object(
      'inputs',            p_inputs - '_parent_team_run_id',
      'origin',            'delegate_to_agent',
      'delegation_policy', p_policy
    )
  )
  RETURNING id INTO v_team_run_id;

  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
  VALUES (
    v_team_run_id,
    CASE WHEN p_policy = 'approval_required'
         THEN 'approval_requested'
         ELSE 'dispatch_queued'
    END,
    jsonb_build_object(
      'workflow_id',       p_workflow_id,
      'delegation_policy', p_policy,
      'requires_approval', p_policy = 'approval_required',
      'recursion_depth',   v_new_depth
    )
  );

  RETURN v_team_run_id;
END;
$function$;

REVOKE ALL ON FUNCTION agents.fn_start_team_run(uuid, uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.fn_start_team_run(uuid, uuid, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_start_team_run(uuid, uuid, jsonb, text) TO service_role;

COMMENT ON FUNCTION agents.fn_start_team_run(uuid, uuid, jsonb, text) IS
  'Service-role-only team-run dispatch. Enforces D5 recursion cap (≤8) when '
  'parent passed via inputs._parent_team_run_id. Maps policy → (status, '
  'approval_status). SECURITY DEFINER.';
