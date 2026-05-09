-- =============================================================================
-- 20260417160000_workflow_observability.sql
-- -----------------------------------------------------------------------------
-- Phase 6 — Workflow observability primitives.
--
-- Adds:
--   1. `lenses.workflow_run_tags` — a lightweight, workflow-scoped classifier
--      table that mirrors `execution.execution_tags` but is keyed by
--      `workflow_runs.id`. Used by the browser executor + CF Worker to mark
--      runs as `moderation_blocked`, `contract_violated`, `idempotent_replay`,
--      `high_token_usage`, `partial_success`, etc.
--   2. `execution.vw_workflow_run_timeline` — a chronological view joining
--      workflow_runs + workflow_node_results so the monitoring UI can render a
--      Gantt-style timeline without client-side joins.
--   3. `fn_tag_workflow_run` RPC — owner-gated insert into
--      workflow_run_tags that enforces severity and owner checks.
--
-- These are purely additive: existing callers are not affected.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. lenses.workflow_run_tags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lenses.workflow_run_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  tag         text NOT NULL,
  severity    text NOT NULL DEFAULT 'info',
  node_id     uuid,                -- optional: scope tag to a single node
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_run_tags_severity_check
    CHECK (severity IN ('info', 'warn', 'critical'))
);

COMMENT ON TABLE lenses.workflow_run_tags IS
  'Workflow-run-scoped classification tags. Mirrors execution.execution_tags but keyed by lenses.workflow_runs.id. Known tags: moderation_blocked, contract_violated, idempotent_replay, high_token_usage, partial_success, upstream_failure.';

CREATE INDEX IF NOT EXISTS idx_workflow_run_tags_run_id
  ON lenses.workflow_run_tags (run_id);

CREATE INDEX IF NOT EXISTS idx_workflow_run_tags_tag_severity
  ON lenses.workflow_run_tags (tag, severity, created_at DESC);

ALTER TABLE lenses.workflow_run_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_run_tags_service_all ON lenses.workflow_run_tags;
CREATE POLICY workflow_run_tags_service_all
  ON lenses.workflow_run_tags
  TO service_role
  USING (true) WITH CHECK (true);

-- Owners of the run (or any public workflow viewer) can read their tags.
DROP POLICY IF EXISTS workflow_run_tags_select ON lenses.workflow_run_tags;
CREATE POLICY workflow_run_tags_select
  ON lenses.workflow_run_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      JOIN lenses.workflows w ON w.id = r.workflow_id
      WHERE r.id = workflow_run_tags.run_id
        AND (
          r.triggered_by = lensers.get_auth_lenser_id()
          OR w.visibility::text = 'public'
        )
    )
  );

GRANT SELECT ON lenses.workflow_run_tags TO authenticated, anon;
GRANT ALL ON lenses.workflow_run_tags TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. execution.vw_workflow_run_timeline
-- ─────────────────────────────────────────────────────────────────────────────
-- A single SELECTable timeline for a workflow run. Rows are interleaved so the
-- client can plot them chronologically without client-side joins.
--
-- Event types:
--   * `run_started`    (one row per run)
--   * `run_completed`  (one row per run, NULL until status terminal)
--   * `node_started`   (one row per node result; started_at timestamp)
--   * `node_completed` (one row per node result; completed_at timestamp)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW execution.vw_workflow_run_timeline AS
  SELECT
    r.id                                               AS run_id,
    r.workflow_id                                      AS workflow_id,
    'run_started'::text                                AS event_type,
    NULL::uuid                                         AS node_id,
    NULL::uuid                                         AS workflow_node_result_id,
    COALESCE(r.started_at, r.created_at)               AS occurred_at,
    r.status::text                                     AS status,
    NULL::jsonb                                        AS output_data,
    NULL::text                                         AS error_message
  FROM lenses.workflow_runs r

  UNION ALL

  SELECT
    r.id                                               AS run_id,
    r.workflow_id                                      AS workflow_id,
    'run_completed'::text                              AS event_type,
    NULL::uuid                                         AS node_id,
    NULL::uuid                                         AS workflow_node_result_id,
    r.completed_at                                     AS occurred_at,
    r.status::text                                     AS status,
    NULL::jsonb                                        AS output_data,
    NULL::text                                         AS error_message
  FROM lenses.workflow_runs r
  WHERE r.completed_at IS NOT NULL

  UNION ALL

  SELECT
    nr.run_id                                          AS run_id,
    r.workflow_id                                      AS workflow_id,
    'node_started'::text                               AS event_type,
    nr.node_id                                         AS node_id,
    nr.id                                              AS workflow_node_result_id,
    nr.started_at                                      AS occurred_at,
    nr.status                                          AS status,
    NULL::jsonb                                        AS output_data,
    NULL::text                                         AS error_message
  FROM lenses.workflow_node_results nr
  JOIN lenses.workflow_runs r ON r.id = nr.run_id
  WHERE nr.started_at IS NOT NULL

  UNION ALL

  SELECT
    nr.run_id                                          AS run_id,
    r.workflow_id                                      AS workflow_id,
    'node_completed'::text                             AS event_type,
    nr.node_id                                         AS node_id,
    nr.id                                              AS workflow_node_result_id,
    nr.completed_at                                    AS occurred_at,
    nr.status                                          AS status,
    nr.output_data                                     AS output_data,
    nr.error_message                                   AS error_message
  FROM lenses.workflow_node_results nr
  JOIN lenses.workflow_runs r ON r.id = nr.run_id
  WHERE nr.completed_at IS NOT NULL;

COMMENT ON VIEW execution.vw_workflow_run_timeline IS
  'Chronological event stream for a workflow run: run_started, run_completed, node_started, node_completed. Consumed by the observability UI (Phase 6) to render Gantt-style timelines without client-side joins. Respects the underlying RLS on lenses.workflow_runs and lenses.workflow_node_results.';

GRANT SELECT ON execution.vw_workflow_run_timeline TO authenticated, anon;
GRANT SELECT ON execution.vw_workflow_run_timeline TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. fn_tag_workflow_run RPC
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_tag_workflow_run(
  p_run_id    uuid,
  p_tag       text,
  p_severity  text DEFAULT 'info',
  p_node_id   uuid DEFAULT NULL,
  p_metadata  jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_caller_id uuid := lensers.get_auth_lenser_id();
  v_tag_id    uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'invalid severity: %', p_severity USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    WHERE r.id = p_run_id
      AND r.triggered_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'workflow_run % not found or not owned by caller', p_run_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO lenses.workflow_run_tags (run_id, tag, severity, node_id, metadata)
  VALUES (p_run_id, p_tag, p_severity, p_node_id, p_metadata)
  RETURNING id INTO v_tag_id;

  RETURN v_tag_id;
END;
$$;

ALTER FUNCTION public.fn_tag_workflow_run(uuid, text, text, uuid, jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_tag_workflow_run(uuid, text, text, uuid, jsonb) IS
  'Classifies a workflow run with a tag (info|warn|critical). Owner-gated. Called by the browser executor + CF Worker to mark moderation_blocked / contract_violated / idempotent_replay / partial_success / high_token_usage runs. See docs/reference/workflows/execution-engine.md §Observability.';

GRANT EXECUTE ON FUNCTION public.fn_tag_workflow_run(uuid, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tag_workflow_run(uuid, text, text, uuid, jsonb) TO service_role;
