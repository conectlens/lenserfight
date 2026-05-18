-- Workflow DAG engine: template fetch for workers + node result observability columns.
-- Safe additive migration — new RPC + columns + extended worker upsert.

-- ── Worker: fetch raw lens template body (placeholders preserved for client-style renderPrompt) ──
CREATE OR REPLACE FUNCTION public.fn_worker_get_lens_template_body(
  p_lens_id uuid,
  p_version_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO lenses, public
AS $$
DECLARE
  v_body text;
BEGIN
  IF p_version_id IS NOT NULL THEN
    SELECT v.template_body INTO v_body
    FROM lenses.versions v
    WHERE v.id = p_version_id
      AND v.lens_id = p_lens_id
    LIMIT 1;
    RETURN v_body;
  END IF;

  SELECT v.template_body INTO v_body
  FROM lenses.versions v
  WHERE v.lens_id = p_lens_id
    AND v.status = 'published'::content.content_status
  ORDER BY v.published_at DESC NULLS LAST, v.version_number DESC
  LIMIT 1;

  IF v_body IS NULL THEN
    SELECT v.template_body INTO v_body
    FROM lenses.versions v
    WHERE v.lens_id = p_lens_id
    ORDER BY v.version_number DESC
    LIMIT 1;
  END IF;

  RETURN v_body;
END;
$$;

ALTER FUNCTION public.fn_worker_get_lens_template_body(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_lens_template_body(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_lens_template_body(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_lens_template_body(uuid, uuid) IS
  'Worker-only: returns lenses.versions.template_body for workflow DAG execution (raw [[placeholders]]). '
  'When p_version_id is NULL, prefers latest published version for the lens.';

-- ── Observability: resolved inputs + routing metadata per node execution ──
ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS resolved_input_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS provider_route jsonb;

COMMENT ON COLUMN lenses.workflow_node_results.resolved_input_snapshot IS
  'Label→value map after edge merge + root inputs, before prompt rendering (redact secrets at write time in callers).';
COMMENT ON COLUMN lenses.workflow_node_results.provider_route IS
  'JSON metadata for the execution route used for this node (e.g. provider id, model key).';

-- ── Worker upsert: persist full output_data + optional snapshots ──
CREATE OR REPLACE FUNCTION public.fn_worker_upsert_node_result(
  p_run_id uuid,
  p_node_id uuid,
  p_status text,
  p_output_data jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_resolved_input_snapshot jsonb DEFAULT NULL,
  p_provider_route jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses
AS $$
DECLARE
  v_terminal text[] := ARRAY['completed', 'failed', 'timed_out', 'cancelled', 'blocked', 'invalidated', 'skipped'];
BEGIN
  INSERT INTO lenses.workflow_node_results (
    run_id, node_id, status, output_data, error_message,
    resolved_input_snapshot, provider_route,
    started_at, completed_at
  )
  VALUES (
    p_run_id, p_node_id, p_status, p_output_data, p_error_message,
    p_resolved_input_snapshot, p_provider_route,
    CASE WHEN p_status IN ('running', 'streaming', 'retrying') THEN now() ELSE NULL END,
    CASE WHEN p_status = ANY(v_terminal) THEN now() ELSE NULL END
  )
  ON CONFLICT (run_id, node_id) DO UPDATE
    SET status        = EXCLUDED.status,
        output_data   = COALESCE(EXCLUDED.output_data, lenses.workflow_node_results.output_data),
        error_message = COALESCE(EXCLUDED.error_message, lenses.workflow_node_results.error_message),
        resolved_input_snapshot = COALESCE(
          EXCLUDED.resolved_input_snapshot,
          lenses.workflow_node_results.resolved_input_snapshot
        ),
        provider_route = COALESCE(EXCLUDED.provider_route, lenses.workflow_node_results.provider_route),
        started_at    = COALESCE(lenses.workflow_node_results.started_at, EXCLUDED.started_at),
        completed_at  = CASE
          WHEN EXCLUDED.status = ANY(v_terminal) THEN now()
          ELSE lenses.workflow_node_results.completed_at
        END;
END;
$$;

ALTER FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text, jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text, jsonb, jsonb) TO service_role;

COMMENT ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text, jsonb, jsonb) IS
  'Worker-only: upsert workflow_node_results with full jsonb output_data and optional resolved_input_snapshot / provider_route.';

-- Back-compat overload: 5-arg signature forwards to 7-arg implementation.
CREATE OR REPLACE FUNCTION public.fn_worker_upsert_node_result(
  p_run_id uuid,
  p_node_id uuid,
  p_status text,
  p_output_data jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT public.fn_worker_upsert_node_result(
    p_run_id, p_node_id, p_status, p_output_data, p_error_message, NULL::jsonb, NULL::jsonb
  );
$$;

ALTER FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) TO service_role;
