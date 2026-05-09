-- Phase N3: Cross-workflow memory rollup
--
-- Surfaces every memory entry written by any team_run of a given workflow.
-- The CLI invokes this via `lf memory list-entries --workflow <id>`.
--
-- The function joins agents.memories → agents.team_runs (FK team_run_id) and
-- filters by workflow_id. RLS on agents.memories is preserved via
-- SECURITY INVOKER.

DROP FUNCTION IF EXISTS public.fn_get_memory_entries_by_workflow(uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_get_memory_entries_by_workflow(
  p_workflow_id uuid,
  p_limit       integer DEFAULT 100
)
RETURNS TABLE (
  id            uuid,
  profile_id    uuid,
  ai_lenser_id  uuid,
  team_run_id   uuid,
  scope         text,
  source        text,
  content       text,
  confidence    numeric,
  is_redacted   boolean,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = agents, public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  IF p_workflow_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      m.id,
      m.profile_id,
      m.ai_lenser_id,
      m.team_run_id,
      m.scope,
      m.source,
      m.content,
      m.confidence,
      m.is_redacted,
      m.created_at
    FROM agents.memories m
    JOIN agents.team_runs tr ON tr.id = m.team_run_id
    WHERE tr.workflow_id = p_workflow_id
      AND m.is_redacted = false
    ORDER BY m.created_at DESC
    LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.fn_get_memory_entries_by_workflow(uuid, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_get_memory_entries_by_workflow(uuid, integer) IS
  'Phase N3: Returns memory entries written by any team_run of the given '
  'workflow_id. Honors RLS via SECURITY INVOKER. Capped at 500 rows.';

GRANT EXECUTE ON FUNCTION public.fn_get_memory_entries_by_workflow(uuid, integer)
  TO authenticated, service_role;
