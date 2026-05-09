-- Phase Q4: Tool invocation rollup
--
-- Owner-scoped aggregate of platform.tool_invocation_logs per
-- (workflow, tool_name) over a sliding window. Powers the agent control room
-- "tool usage" panel and the CLI `lenserfight tools rollup` view.
--
-- Schema reality vs spec
--   The spec mentioned a tool_id field; the actual table records tool_name
--   only (no FK to a tool_id). Approval states are
--   {auto_approved, awaiting_approval, approved, rejected}. We map:
--     approved_count  := approval_status IN ('approved','auto_approved')
--     rejected_count  := approval_status = 'rejected'
--   Pending ('awaiting_approval') is reflected only in total_invocations.
--   workflow_id is reached via JOIN through lenses.workflow_runs (the log
--   table holds run_id, not workflow_id).
--
-- Authorization
--   SECURITY INVOKER preserves the existing RLS on tool_invocation_logs
--   (owner SELECT). We additionally guard at the function entrypoint with
--   agents.can_manage_ai_lenser() so the caller cannot pass an arbitrary
--   ai_lenser_id and learn anything via the JOIN side.

CREATE OR REPLACE FUNCTION public.fn_get_tool_invocation_rollup(
  p_ai_lenser_id uuid,
  p_days         int DEFAULT 7
)
RETURNS TABLE (
  workflow_id        uuid,
  workflow_title     text,
  tool_name          text,
  total_invocations  bigint,
  approved_count     bigint,
  rejected_count     bigint,
  last_invoked_at    timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, platform, lenses, agents
AS $$
DECLARE
  v_window int := GREATEST(LEAST(COALESCE(p_days, 7), 90), 1);
BEGIN
  IF p_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'ai_lenser_id required' USING ERRCODE = '22023';
  END IF;

  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not_owner_of_ai_lenser' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    wr.workflow_id,
    w.title                                            AS workflow_title,
    til.tool_name,
    count(*)::bigint                                   AS total_invocations,
    count(*) FILTER (
      WHERE til.approval_status IN ('approved', 'auto_approved')
    )::bigint                                          AS approved_count,
    count(*) FILTER (
      WHERE til.approval_status = 'rejected'
    )::bigint                                          AS rejected_count,
    max(til.invoked_at)                                AS last_invoked_at
  FROM   platform.tool_invocation_logs til
  LEFT JOIN lenses.workflow_runs wr ON wr.id = til.run_id
  LEFT JOIN lenses.workflows     w  ON w.id  = wr.workflow_id
  WHERE  til.ai_lenser_id = p_ai_lenser_id
    AND  til.invoked_at >= now() - (v_window::text || ' days')::interval
  GROUP  BY wr.workflow_id, w.title, til.tool_name
  ORDER  BY total_invocations DESC, last_invoked_at DESC;
END;
$$;

ALTER FUNCTION public.fn_get_tool_invocation_rollup(uuid, int) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_get_tool_invocation_rollup(uuid, int)
  TO authenticated;

COMMENT ON FUNCTION public.fn_get_tool_invocation_rollup(uuid, int) IS
  'Phase Q4: per-(workflow,tool_name) rollup of platform.tool_invocation_logs '
  'over the last p_days (default 7, hard-capped to [1,90]). SECURITY INVOKER '
  'preserves underlying RLS; explicit can_manage_ai_lenser guard prevents '
  'cross-owner enumeration via the workflow JOIN.';
