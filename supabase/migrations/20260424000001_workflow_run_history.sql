-- =============================================================================
-- 20260424000001_workflow_run_history.sql
-- -----------------------------------------------------------------------------
-- Adds fn_list_workflow_runs RPC so the workflow builder UI can display a
-- paginated history of past runs for a given workflow. Authorization is
-- owner-only via the workflow's lenser_id.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_list_workflow_runs(
  p_workflow_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  status text,
  trigger_mode text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  global_model_id text,
  spent_credits integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    r.id,
    r.workflow_id,
    r.status,
    r.trigger_mode,
    r.started_at,
    r.completed_at,
    r.created_at,
    r.global_model_id,
    r.spent_credits
  FROM lenses.workflow_runs r
  JOIN lenses.workflows w ON w.id = r.workflow_id
  WHERE r.workflow_id = p_workflow_id
    AND w.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_list_workflow_runs(uuid, integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_list_workflow_runs(uuid, integer, integer) IS
  'Owner-only paginated list of workflow runs for a given workflow. Used by the workflow builder history tab.';

GRANT EXECUTE ON FUNCTION public.fn_list_workflow_runs(uuid, integer, integer) TO authenticated, service_role;
