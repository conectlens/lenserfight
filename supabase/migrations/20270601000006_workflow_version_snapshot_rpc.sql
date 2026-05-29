-- Phase 3: expose workflow version snapshot nodes/edges for UI diffs.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_workflow_version_snapshot(p_version_id uuid)
RETURNS TABLE(nodes jsonb, edges jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  WITH visible_version AS (
    SELECT wv.id, wv.workflow_id
    FROM lenses.workflow_versions wv
    JOIN lenses.workflows w ON w.id = wv.workflow_id
    WHERE wv.id = p_version_id
      AND (
        w.visibility = 'public'
        OR w.lenser_id = lensers.get_auth_lenser_id()
      )
    LIMIT 1
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'workflow_id', vv.workflow_id,
          'lens_id', n.lens_id,
          'version_id', n.version_id,
          'position_x', n.position_x,
          'position_y', n.position_y,
          'label', n.label,
          'ordinal', n.ordinal,
          'created_at', NULL,
          'config', n.config
        )
        ORDER BY n.ordinal, n.id
      )
      FROM lenses.workflow_version_nodes n
      WHERE n.workflow_version_id = vv.id
    ), '[]'::jsonb) AS nodes,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'workflow_id', vv.workflow_id,
          'source_node_id', e.source_node_id,
          'target_node_id', e.target_node_id,
          'source_output_key', e.source_output_key,
          'target_param_label', e.target_param_label,
          'merge_strategy', NULL,
          'condition', NULL
        )
        ORDER BY e.id
      )
      FROM lenses.workflow_version_edges e
      WHERE e.workflow_version_id = vv.id
    ), '[]'::jsonb) AS edges
  FROM visible_version vv;
$$;

REVOKE ALL ON FUNCTION public.fn_get_workflow_version_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_version_snapshot(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_workflow_version_snapshot(uuid) IS
  'Returns JSONB node/edge arrays for a workflow version the caller can view. Used by WorkflowVersionDiff.';

COMMIT;
