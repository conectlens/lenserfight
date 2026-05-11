-- 20270802100000_perf_workflow_bootstrap_user_reactions.sql
--
-- Extends fn_get_workflow_bootstrap to also include the viewer's own reactions
-- (liked/saved booleans) so the WorkflowBuilderPage no longer needs to call
-- fn_get_entity_reaction_counts + fn_get_entity_reaction_status on initial load.
--
-- Replaces the previous (workflow, nodes, edges) signature with a richer payload
-- that nests viewer_reactions inside the workflow jsonb. Repository code reads
-- workflow.reaction_totals already; viewer_reactions is an additive sibling.

DROP FUNCTION IF EXISTS public.fn_get_workflow_bootstrap(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_workflow_bootstrap(p_workflow_id uuid)
RETURNS TABLE("workflow" jsonb, "nodes" jsonb, "edges" jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers', 'content', 'pg_temp'
AS $$
DECLARE
  v_viewer_id uuid;
BEGIN
  v_viewer_id := lensers.get_auth_lenser_id();

  RETURN QUERY
  WITH wf AS (
    SELECT * FROM public.fn_get_workflow_detail(p_workflow_id)
  ),
  viewer_reacts AS (
    SELECT
      COALESCE(jsonb_object_agg(r.reaction::text, true), '{}'::jsonb) AS reactions
    FROM content.reactions r
    WHERE v_viewer_id IS NOT NULL
      AND r.entity_type::text = 'workflow'
      AND r.entity_id          = p_workflow_id
      AND r.lenser_id          = v_viewer_id
  )
  SELECT
    to_jsonb(wf.*) || jsonb_build_object(
      'viewer_reactions', COALESCE((SELECT reactions FROM viewer_reacts), '{}'::jsonb)
    ) AS workflow,
    COALESCE(
      (SELECT jsonb_agg(n) FROM public.fn_get_workflow_nodes(p_workflow_id) n),
      '[]'::jsonb
    ) AS nodes,
    COALESCE(
      (SELECT jsonb_agg(e) FROM public.fn_get_workflow_edges(p_workflow_id) e),
      '[]'::jsonb
    ) AS edges
  FROM wf;
END;
$$;

ALTER FUNCTION public.fn_get_workflow_bootstrap(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_bootstrap(uuid)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_workflow_bootstrap(uuid) IS
  'Bootstrap for WorkflowBuilderPage. Returns (workflow, nodes, edges) in one call. '
  'The workflow jsonb additionally carries viewer_reactions={reaction:true,...} so the page '
  'avoids a separate fn_get_entity_reaction_counts + fn_get_entity_reaction_status round trip.';
