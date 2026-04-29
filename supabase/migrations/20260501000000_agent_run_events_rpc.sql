-- =============================================================================
-- 20260501000000_agent_run_events_rpc.sql
-- -----------------------------------------------------------------------------
-- Owner-only event stream RPC for the agent_owner Logs section.
-- Queries agents.agent_run_events filtered through team_runs.ai_lenser_id.
-- Authorization via agents.can_manage_ai_lenser (human owner profile).
-- Follows the SECURITY DEFINER + ownership guard pattern used by all other
-- workspace RPCs (fn_get_agent_workspace_bootstrap, fn_update_workspace_settings,
-- fn_create_scratchpad_run, fn_run_evaluation, etc.).
-- =============================================================================

DROP FUNCTION IF EXISTS public.fn_agent_run_events(uuid, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.fn_agent_run_events(
  p_ai_lenser_id uuid,
  p_run_id       uuid    DEFAULT NULL,
  p_event_type   text    DEFAULT NULL,
  p_limit        integer DEFAULT 100
)
RETURNS TABLE (
  id                uuid,
  team_run_id       uuid,
  agent_run_step_id uuid,
  event_type        text,
  payload           jsonb,
  occurred_at       timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, agents
AS $$
BEGIN
  -- Ownership guard: caller must be the owner or co-owner of this AI lenser.
  -- can_manage_ai_lenser resolves via lensers.get_auth_human_lenser_id(),
  -- which handles workspace-switching (agent_owner mode).
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ev.id,
    ev.team_run_id,
    ev.agent_run_step_id,
    ev.event_type,
    ev.payload,
    ev.occurred_at
  FROM   agents.agent_run_events ev
  JOIN   agents.team_runs        tr ON tr.id = ev.team_run_id
  WHERE  tr.ai_lenser_id = p_ai_lenser_id
    AND  (p_run_id     IS NULL OR ev.team_run_id = p_run_id)
    AND  (p_event_type IS NULL OR ev.event_type  = p_event_type)
  ORDER BY ev.occurred_at DESC
  LIMIT  GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
END;
$$;

ALTER FUNCTION public.fn_agent_run_events(uuid, uuid, text, integer)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_agent_run_events(uuid, uuid, text, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_agent_run_events(uuid, uuid, text, integer) IS
  'Owner-only event stream for agents.agent_run_events. '
  'Filters by ai_lenser_id via team_runs join. '
  'Optional p_run_id and p_event_type narrowing. '
  'Authorization via agents.can_manage_ai_lenser (human owner profile). '
  'Max 500 rows per call.';
