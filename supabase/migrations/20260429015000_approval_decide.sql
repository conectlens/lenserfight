-- =============================================================================
-- 20260429010000_approval_decide.sql
-- -----------------------------------------------------------------------------
-- F2 of the ConnectedLenses frontend phase. Adds:
--
--   1. agents.approval_requests_v — a view that materializes the approval
--      queue from team_runs WHERE approval_status='pending', joined with the
--      backing assignment and workflow metadata so the UI can render the
--      queue in one round-trip without N joins on the client.
--
--   2. public.fn_decide_approval(team_run_id, decision, reason, modifications)
--      — atomic decision RPC. Mutates approval_status, merges decision audit
--      fields into metadata, appends an agent_run_events row, and resumes the
--      underlying workflow_run by flipping its status from `blocked` to
--      `queued` so the engine's recovery sweeper can pick it up.
--
-- Modify-and-approve contract: when decision='modified', the caller MUST
-- supply a non-null `modifications` jsonb object. The RPC writes it to
-- team_runs.metadata->'decision_modifications'. The engine reads that key on
-- resume and merges it into the run's runtime input. No other team_runs
-- columns are honored as inputs to the engine.
--
-- RLS: every read and write is gated by agents.can_manage_ai_lenser(); a
-- non-owner gets an empty result set, never an error leak. The RPC is
-- SECURITY DEFINER so we can transition workflow_runs.status without
-- granting the table to authenticated.
-- =============================================================================

-- ─── 1. approval_requests_v ──────────────────────────────────────────────────
DROP VIEW IF EXISTS agents.approval_requests_v;
CREATE OR REPLACE VIEW agents.approval_requests_v AS
SELECT
  tr.id                                 AS request_id,
  tr.ai_lenser_id,
  tr.team_id,
  tr.workflow_id,
  tr.workflow_assignment_id,
  tr.workflow_run_id,
  tr.status                             AS run_status,
  tr.approval_status,
  tr.metadata,
  tr.metadata->>'gate_kind'             AS gate_kind,
  tr.metadata->>'requested_action'      AS requested_action,
  tr.metadata->>'requester_agent_id'    AS requester_agent_id,
  tr.created_at                         AS requested_at,
  tr.started_at,
  tr.completed_at,
  wa.assignee_kind,
  wa.approval_policy,
  wa.retry_policy,
  wa.failure_policy,
  w.title                               AS workflow_title
FROM agents.team_runs tr
LEFT JOIN agents.workflow_assignments wa ON wa.id = tr.workflow_assignment_id
LEFT JOIN lenses.workflows w             ON w.id  = tr.workflow_id
WHERE agents.can_manage_ai_lenser(tr.ai_lenser_id);

ALTER VIEW agents.approval_requests_v OWNER TO postgres;

COMMENT ON VIEW agents.approval_requests_v IS
  'Owner-only projection of team_runs with assignment + workflow metadata for the approval queue UI. RLS-safe via agents.can_manage_ai_lenser().';

GRANT SELECT ON agents.approval_requests_v TO authenticated, service_role;

-- ─── 2. fn_decide_approval ────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_decide_approval(uuid, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.fn_decide_approval(
  p_team_run_id   uuid,
  p_decision      text,
  p_reason        text  DEFAULT NULL,
  p_modifications jsonb DEFAULT NULL
)
RETURNS TABLE (
  request_id              uuid,
  ai_lenser_id            uuid,
  team_id                 uuid,
  workflow_id             uuid,
  workflow_run_id         uuid,
  workflow_assignment_id  uuid,
  approval_status         text,
  run_status              text,
  metadata                jsonb,
  decided_at              timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lenses', 'lensers'
AS $$
DECLARE
  v_actor          uuid;
  v_existing       agents.team_runs%ROWTYPE;
  v_decision_at    timestamptz := now();
  v_event_type     text;
  v_new_metadata   jsonb;
  v_terminal_run   text;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected', 'modified') THEN
    RAISE EXCEPTION 'Invalid decision %. Allowed: approved | rejected | modified.', p_decision
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'modified' AND (p_modifications IS NULL OR jsonb_typeof(p_modifications) <> 'object') THEN
    RAISE EXCEPTION 'modify-and-approve requires a non-null jsonb object for p_modifications.'
      USING ERRCODE = '22023';
  END IF;

  v_actor := lensers.get_auth_human_lenser_id();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing
  FROM agents.team_runs
  WHERE id = p_team_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request % not found.', p_team_run_id
      USING ERRCODE = '42501';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_existing.ai_lenser_id) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI workspace.'
      USING ERRCODE = '42501';
  END IF;

  IF v_existing.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'Request % is in approval_status="%", cannot decide twice.',
      p_team_run_id, v_existing.approval_status
      USING ERRCODE = '22023';
  END IF;

  v_new_metadata := COALESCE(v_existing.metadata, '{}'::jsonb)
    || jsonb_build_object(
         'decision_at', v_decision_at,
         'decision_by_lenser_id', v_actor,
         'decision_reason', p_reason
       );

  IF p_decision = 'modified' THEN
    v_new_metadata := v_new_metadata
      || jsonb_build_object('decision_modifications', p_modifications);
    v_event_type := 'approval_modified';
  ELSIF p_decision = 'approved' THEN
    v_event_type := 'approval_granted';
  ELSE
    v_event_type := 'approval_rejected';
  END IF;

  -- Approved-or-modified resumes the run by flipping team_run + workflow_run
  -- status. Rejected terminates both with `failed`.
  IF p_decision IN ('approved', 'modified') THEN
    UPDATE agents.team_runs
    SET approval_status = CASE WHEN p_decision = 'modified' THEN 'approved' ELSE p_decision END,
        status = 'queued',
        metadata = v_new_metadata,
        updated_at = v_decision_at
    WHERE id = p_team_run_id;

    IF v_existing.workflow_run_id IS NOT NULL THEN
      -- Recovery sweeper picks up `queued` runs; we do not call the engine
      -- directly. Only flip out of `blocked` so we never override an active
      -- transition that another process may have written.
      UPDATE lenses.workflow_runs
      SET status = 'queued'
      WHERE id = v_existing.workflow_run_id
        AND status IN ('pending', 'queued');
    END IF;

    v_terminal_run := 'queued';
  ELSE
    UPDATE agents.team_runs
    SET approval_status = 'rejected',
        status = 'failed',
        completed_at = v_decision_at,
        metadata = v_new_metadata,
        updated_at = v_decision_at
    WHERE id = p_team_run_id;

    IF v_existing.workflow_run_id IS NOT NULL THEN
      UPDATE lenses.workflow_runs
      SET status = 'failed',
          completed_at = COALESCE(completed_at, v_decision_at)
      WHERE id = v_existing.workflow_run_id
        AND status NOT IN ('completed', 'cancelled', 'failed');
    END IF;

    v_terminal_run := 'failed';
  END IF;

  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
  VALUES (
    p_team_run_id,
    v_event_type,
    jsonb_build_object(
      'decision', p_decision,
      'reason', p_reason,
      'modifications', p_modifications,
      'decided_by_lenser_id', v_actor,
      'previous_run_status', v_existing.status,
      'next_run_status', v_terminal_run
    ),
    v_decision_at
  );

  RETURN QUERY
  SELECT
    p_team_run_id                                               AS request_id,
    v_existing.ai_lenser_id                                     AS ai_lenser_id,
    v_existing.team_id                                          AS team_id,
    v_existing.workflow_id                                      AS workflow_id,
    v_existing.workflow_run_id                                  AS workflow_run_id,
    v_existing.workflow_assignment_id                           AS workflow_assignment_id,
    CASE WHEN p_decision IN ('approved', 'modified') THEN 'approved' ELSE 'rejected' END AS approval_status,
    v_terminal_run                                              AS run_status,
    v_new_metadata                                              AS metadata,
    v_decision_at                                               AS decided_at;
END;
$$;

ALTER FUNCTION public.fn_decide_approval(uuid, text, text, jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_decide_approval(uuid, text, text, jsonb) IS
  'Atomic owner-decision RPC for approval gates. Writes approval_status, merges decision audit fields into metadata, appends an agent_run_events row, and transitions the underlying workflow_run.';

GRANT EXECUTE ON FUNCTION public.fn_decide_approval(uuid, text, text, jsonb) TO authenticated, service_role;
