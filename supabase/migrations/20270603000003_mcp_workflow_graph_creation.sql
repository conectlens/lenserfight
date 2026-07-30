-- Create a workflow and its complete graph atomically for MCP clients.
-- Step references are resolved to UUIDs by the MCP server before this RPC.

CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_create_graph(
  p_title       text,
  p_description text,
  p_visibility  text,
  p_lenser_id   uuid,
  p_nodes       jsonb,
  p_edges       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public', 'pg_temp'
AS $$
DECLARE
  v_caller     uuid;
  v_owner      uuid;
  v_workflow   lenses.workflows%ROWTYPE;
  v_node_count integer;
  v_edge_count integer;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  v_owner := COALESCE(p_lenser_id, lensers.get_auth_lenser_id());
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'missing_lenser_id';
  END IF;
  IF v_caller IS NOT NULL AND v_owner <> v_caller THEN
    RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
  END IF;
  IF p_visibility NOT IN ('public', 'private', 'unlisted') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;
  IF jsonb_typeof(p_nodes) <> 'array' OR jsonb_array_length(p_nodes) = 0 THEN
    RAISE EXCEPTION 'workflow_nodes_required';
  END IF;
  IF jsonb_array_length(p_nodes) > 100 THEN
    RAISE EXCEPTION 'workflow_node_limit_exceeded';
  END IF;
  IF jsonb_typeof(p_edges) <> 'array' OR jsonb_array_length(p_edges) > 300 THEN
    RAISE EXCEPTION 'invalid_workflow_edges';
  END IF;
  IF p_nodes::text ~* '"(api_key|key_ref_id|local_key_id|password|secret|token|webhook_secret)"[[:space:]]*:'
  THEN
    RAISE EXCEPTION 'workflow_secret_field_forbidden';
  END IF;
  IF (
    SELECT count(*) <> count(DISTINCT node->>'id')
    FROM jsonb_array_elements(p_nodes) AS node
  ) THEN
    RAISE EXCEPTION 'duplicate_workflow_node_id';
  END IF;
  IF (
    SELECT count(*) <> 1
    FROM jsonb_array_elements(p_nodes) AS node
    WHERE node->'config'->>'node_type' IN (
      'manual_trigger',
      'event_trigger',
      'form_input_trigger',
      'webhook_trigger',
      'schedule_trigger'
    )
  ) THEN
    RAISE EXCEPTION 'workflow_requires_one_trigger';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_edges) AS edge
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_nodes) AS node
      WHERE node->>'id' = edge->>'source_node_id'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_nodes) AS node
      WHERE node->>'id' = edge->>'target_node_id'
    )
  ) THEN
    RAISE EXCEPTION 'workflow_edge_node_not_found';
  END IF;
  IF EXISTS (
    WITH RECURSIVE reachable(node_id) AS (
      SELECT node->>'id'
      FROM jsonb_array_elements(p_nodes) AS node
      WHERE node->'config'->>'node_type' IN (
        'manual_trigger',
        'event_trigger',
        'form_input_trigger',
        'webhook_trigger',
        'schedule_trigger'
      )
      UNION
      SELECT edge->>'target_node_id'
      FROM jsonb_array_elements(p_edges) AS edge
      JOIN reachable ON reachable.node_id = edge->>'source_node_id'
    )
    SELECT 1
    FROM jsonb_array_elements(p_nodes) AS node
    WHERE NOT EXISTS (
      SELECT 1 FROM reachable WHERE reachable.node_id = node->>'id'
    )
  ) THEN
    RAISE EXCEPTION 'workflow_contains_unreachable_nodes';
  END IF;

  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (v_owner, p_title, p_description, p_visibility)
  RETURNING * INTO v_workflow;

  INSERT INTO lenses.workflow_nodes (
    id,
    workflow_id,
    lens_id,
    version_id,
    position_x,
    position_y,
    label,
    ordinal,
    config
  )
  SELECT
    (node->>'id')::uuid,
    v_workflow.id,
    NULLIF(node->>'lens_id', '')::uuid,
    NULLIF(node->>'version_id', '')::uuid,
    COALESCE((node->>'position_x')::double precision, 0),
    COALESCE((node->>'position_y')::double precision, 0),
    node->>'label',
    COALESCE((node->>'ordinal')::integer, 0),
    COALESCE(node->'config', '{}'::jsonb)
  FROM jsonb_array_elements(p_nodes) AS node;
  GET DIAGNOSTICS v_node_count = ROW_COUNT;

  INSERT INTO lenses.workflow_edges (
    workflow_id,
    source_node_id,
    target_node_id,
    source_output_key,
    target_param_label
  )
  SELECT
    v_workflow.id,
    (edge->>'source_node_id')::uuid,
    (edge->>'target_node_id')::uuid,
    COALESCE(NULLIF(edge->>'source_output_key', ''), 'output'),
    edge->>'target_param_label'
  FROM jsonb_array_elements(p_edges) AS edge;
  GET DIAGNOSTICS v_edge_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'id', v_workflow.id,
    'title', v_workflow.title,
    'visibility', v_workflow.visibility,
    'created_at', v_workflow.created_at,
    'node_count', v_node_count,
    'edge_count', v_edge_count
  );
END;
$$;

ALTER FUNCTION public.fn_mcp_workflow_create_graph(text, text, text, uuid, jsonb, jsonb)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_create_graph(text, text, text, uuid, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_create_graph(text, text, text, uuid, jsonb, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_mcp_workflow_create_graph(text, text, text, uuid, jsonb, jsonb)
  IS 'Atomically creates an owned workflow with its trigger, Lens/tool nodes, and connections for MCP clients.';
