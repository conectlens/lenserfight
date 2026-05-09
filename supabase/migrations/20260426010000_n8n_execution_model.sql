-- =============================================================================
-- 20260426010000_n8n_execution_model.sql
-- -----------------------------------------------------------------------------
-- N8N-Style Workflow Execution — single migration that:
--
--   1. Resolves the PGRST203 ambiguity for `fn_update_workflow_node_result` by
--      dropping the legacy 5-arg overload kept around for back-compat. The
--      single canonical 8-arg signature with default trailing args remains.
--
--   2. Defensively re-asserts the canonical `fn_start_workflow_run` signature
--      (drops legacy 2-arg / 3-arg overloads that may still exist in the web
--      database where the equivalent platform fix migration was never applied).
--
--   3. Adds n8n-style execution-state primitives:
--        * `lenses.workflow_node_results.waiting_reason` (text, nullable)
--        * `lenses.workflow_runs.active_node_id`         (uuid, nullable)
--      Both are written by `fn_update_workflow_node_result` so the run-level
--      projection always knows which node is currently active without scanning
--      every row.
--
--   4. Introduces field-level cross-workflow provenance:
--        * `lenses.workflow_run_provenance` table
--        * `fn_record_run_provenance` RPC for the engine to log handoffs
--        * `fn_get_run_provenance` RPC for the inspector UI to query the
--          upstream/downstream graph scoped to one run.
--
--   5. Exposes a single canonical n8n-style projection RPC:
--        * `fn_get_workflow_run_state(run_id)` — returns active/waiting/
--          executed node lists, waiting reasons, terminal summary, and an
--          auto-derived `is_running` flag.
--
-- Safety
-- -------
-- * Additive: no data loss, no renames.
-- * Drops only the explicit legacy signatures by full arg type (PostgreSQL
--   resolves overloads by signature, not name).
-- * All new RPCs are SECURITY DEFINER with the same authorization rules as
--   the workflow_runs table (owner OR public workflow).
-- =============================================================================

-- ─── 1. Resolve fn_update_workflow_node_result overload ambiguity ──────────
--
-- Both 5-arg (status alignment) and 8-arg (observability) overloads were
-- created without DROPping the 5-arg version, so PostgREST cannot pick a
-- candidate when the client sends only the first 5 named params. We keep the
-- 8-arg superset as the canonical signature.

DROP FUNCTION IF EXISTS public.fn_update_workflow_node_result(uuid, uuid, text, jsonb, text);

-- ─── 2. Defensive de-overload for fn_start_workflow_run ────────────────────
--
-- The platform tree had a `20260417170000_fix_fn_start_workflow_run_overload`
-- migration; the web tree did not. Re-applying the drops here is harmless on
-- both: PostgreSQL skips DROP IF EXISTS for already-removed signatures.

DROP FUNCTION IF EXISTS public.fn_start_workflow_run(uuid, jsonb);
DROP FUNCTION IF EXISTS public.fn_start_workflow_run(uuid, jsonb, text);

-- ─── 3. n8n-style state-machine columns ────────────────────────────────────

ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS waiting_reason text;

COMMENT ON COLUMN lenses.workflow_node_results.waiting_reason IS
  'Why this node is currently waiting. NULL when the node is not waiting. Conventional values: dependency, condition_false, rate_limit, retry_backoff, human_input, external_callback, queued.';

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS active_node_id uuid;

COMMENT ON COLUMN lenses.workflow_runs.active_node_id IS
  'The node currently executing for this run (or the most recently active one). Written by fn_update_workflow_node_result whenever a node enters running/streaming/retrying. NULL on terminal runs.';

CREATE INDEX IF NOT EXISTS idx_workflow_runs_active_node
  ON lenses.workflow_runs (active_node_id)
  WHERE active_node_id IS NOT NULL;

-- ─── 4. Canonical fn_update_workflow_node_result (8-arg + waiting_reason) ──
--
-- This replaces the previous 8-arg implementation in
-- `20260421000000_workflow_observability.sql`. The signature is unchanged
-- except for an additional default arg (`p_waiting_reason`) appended at the
-- end so existing callers that omit it continue to work and PostgREST
-- still has a single best-candidate match.

CREATE OR REPLACE FUNCTION public.fn_update_workflow_node_result(
  p_run_id          uuid,
  p_node_id         uuid,
  p_status          text,
  p_output_data     jsonb DEFAULT NULL,
  p_error_message   text DEFAULT NULL,
  p_retry_count     integer DEFAULT NULL,
  p_duration_ms     integer DEFAULT NULL,
  p_ttfb_ms         integer DEFAULT NULL,
  p_waiting_reason  text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot update results for run %', p_run_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_node_results
  SET
    status        = p_status,
    output_data   = COALESCE(p_output_data, output_data),
    error_message = COALESCE(p_error_message, error_message),
    retry_count   = COALESCE(p_retry_count, retry_count),
    duration_ms   = COALESCE(p_duration_ms, duration_ms),
    ttfb_ms       = COALESCE(ttfb_ms, p_ttfb_ms),
    -- Waiting reason: explicit overrides existing; null clears once the node
    -- transitions out of a waiting status.
    waiting_reason = CASE
                       WHEN p_status IN ('awaiting_dependency', 'queued', 'retrying')
                         THEN COALESCE(p_waiting_reason, waiting_reason)
                       ELSE NULL
                     END,
    started_at    = CASE
                      WHEN p_status IN ('running', 'streaming', 'retrying') AND started_at IS NULL
                        THEN now()
                      ELSE started_at
                    END,
    completed_at  = CASE
                      WHEN p_status IN ('completed', 'failed', 'cancelled',
                                        'skipped', 'timed_out', 'blocked', 'invalidated')
                        THEN now()
                      ELSE completed_at
                    END
  WHERE run_id = p_run_id AND node_id = p_node_id;

  -- Maintain run-level active node pointer (n8n-style "currently executing").
  -- Active when entering running/streaming/retrying, cleared on terminal.
  IF p_status IN ('running', 'streaming', 'retrying') THEN
    UPDATE lenses.workflow_runs
    SET active_node_id = p_node_id
    WHERE id = p_run_id;
  ELSIF p_status IN ('completed', 'failed', 'cancelled',
                     'skipped', 'timed_out', 'blocked', 'invalidated') THEN
    UPDATE lenses.workflow_runs
    SET active_node_id = NULL
    WHERE id = p_run_id
      AND active_node_id = p_node_id;
  END IF;
END;
$$;

ALTER FUNCTION public.fn_update_workflow_node_result(
  uuid, uuid, text, jsonb, text, integer, integer, integer, text
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_update_workflow_node_result(
  uuid, uuid, text, jsonb, text, integer, integer, integer, text
) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_update_workflow_node_result(
  uuid, uuid, text, jsonb, text, integer, integer, integer, text
) IS
  'Canonical n8n-style node result update. Persists status + output + observability metrics, maintains waiting_reason for non-running statuses, and updates workflow_runs.active_node_id so the inspector can render the active step without scanning all node rows.';

-- ─── 5. Cross-workflow field-level provenance ──────────────────────────────
--
-- Every time a downstream node reads from an upstream node's output (within
-- the same run OR across a subflow boundary), the engine records a row here
-- so the inspector can render "data came from" / "data used by".

CREATE TABLE IF NOT EXISTS lenses.workflow_run_provenance (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source side (where the data came from)
  source_run_id       uuid NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  source_node_id      uuid NOT NULL,
  source_output_path  text NOT NULL,
  -- Target side (where the data was used)
  target_run_id       uuid NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  target_node_id      uuid NOT NULL,
  target_input_path   text NOT NULL,
  -- Optional field-level transform metadata (e.g. a Jinja-style mapping
  -- expression captured at edge-binding time).
  transform           jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_run_provenance_paths_non_empty
    CHECK (length(trim(source_output_path)) > 0
           AND length(trim(target_input_path)) > 0),
  CONSTRAINT workflow_run_provenance_unique UNIQUE (
    source_run_id, source_node_id, source_output_path,
    target_run_id, target_node_id, target_input_path
  )
);

COMMENT ON TABLE lenses.workflow_run_provenance IS
  'Field-level data lineage edges between node outputs and downstream node inputs. One row per (source_field -> target_field) handoff. Spans intra-run and cross-workflow (subflow) boundaries via independent source/target run ids.';

CREATE INDEX IF NOT EXISTS idx_workflow_run_provenance_target
  ON lenses.workflow_run_provenance (target_run_id, target_node_id);

CREATE INDEX IF NOT EXISTS idx_workflow_run_provenance_source
  ON lenses.workflow_run_provenance (source_run_id, source_node_id);

ALTER TABLE lenses.workflow_run_provenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_run_provenance_service_all ON lenses.workflow_run_provenance;
CREATE POLICY workflow_run_provenance_service_all
  ON lenses.workflow_run_provenance
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS workflow_run_provenance_select ON lenses.workflow_run_provenance;
CREATE POLICY workflow_run_provenance_select
  ON lenses.workflow_run_provenance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      JOIN lenses.workflows w ON w.id = r.workflow_id
      WHERE (r.id = workflow_run_provenance.target_run_id
             OR r.id = workflow_run_provenance.source_run_id)
        AND (
          r.triggered_by = lensers.get_auth_lenser_id()
          OR w.visibility::text = 'public'
        )
    )
  );

GRANT SELECT ON lenses.workflow_run_provenance TO authenticated, anon;
GRANT ALL    ON lenses.workflow_run_provenance TO service_role;

-- ─── 6. fn_record_run_provenance ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_record_run_provenance(
  p_source_run_id      uuid,
  p_source_node_id     uuid,
  p_source_output_path text,
  p_target_run_id      uuid,
  p_target_node_id     uuid,
  p_target_input_path  text,
  p_transform          jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller_id uuid;
  v_id        uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_target_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot record provenance for run %', p_target_run_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO lenses.workflow_run_provenance (
    source_run_id, source_node_id, source_output_path,
    target_run_id, target_node_id, target_input_path,
    transform
  )
  VALUES (
    p_source_run_id, p_source_node_id, p_source_output_path,
    p_target_run_id, p_target_node_id, p_target_input_path,
    p_transform
  )
  ON CONFLICT (source_run_id, source_node_id, source_output_path,
               target_run_id, target_node_id, target_input_path)
  DO UPDATE SET transform = COALESCE(EXCLUDED.transform, workflow_run_provenance.transform)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.fn_record_run_provenance(
  uuid, uuid, text, uuid, uuid, text, jsonb
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_record_run_provenance(
  uuid, uuid, text, uuid, uuid, text, jsonb
) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_record_run_provenance(
  uuid, uuid, text, uuid, uuid, text, jsonb
) IS
  'Records a field-level data handoff. Idempotent on the (source, target, path) tuple. Transform JSON may carry mapping expression captured at edge-binding time.';

-- ─── 7. fn_get_run_provenance ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_run_provenance(
  p_run_id uuid
) RETURNS TABLE(
  id                 uuid,
  direction          text,           -- 'upstream' = data into this run; 'downstream' = data leaving this run
  source_run_id      uuid,
  source_workflow_id uuid,
  source_node_id     uuid,
  source_output_path text,
  target_run_id      uuid,
  target_workflow_id uuid,
  target_node_id     uuid,
  target_input_path  text,
  transform          jsonb,
  created_at         timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
  SELECT
    p.id,
    CASE WHEN p.target_run_id = p_run_id THEN 'upstream' ELSE 'downstream' END AS direction,
    p.source_run_id,
    sr.workflow_id AS source_workflow_id,
    p.source_node_id,
    p.source_output_path,
    p.target_run_id,
    tr.workflow_id AS target_workflow_id,
    p.target_node_id,
    p.target_input_path,
    p.transform,
    p.created_at
  FROM lenses.workflow_run_provenance p
  JOIN lenses.workflow_runs sr ON sr.id = p.source_run_id
  JOIN lenses.workflow_runs tr ON tr.id = p.target_run_id
  WHERE (p.source_run_id = p_run_id OR p.target_run_id = p_run_id)
    AND EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      JOIN lenses.workflows w ON w.id = r.workflow_id
      WHERE r.id = p_run_id
        AND (
          r.triggered_by = lensers.get_auth_lenser_id()
          OR w.visibility::text = 'public'
        )
    )
  ORDER BY p.created_at ASC;
$$;

ALTER FUNCTION public.fn_get_run_provenance(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_run_provenance(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_run_provenance(uuid) IS
  'Returns the provenance edges where this run is either the source or the target. Drives the n8n-style "data came from / data used by" tabs in the inspector.';

-- ─── 8. fn_get_workflow_run_state — n8n projection RPC ─────────────────────
--
-- Single round-trip projection that powers the execution inspector. Returns:
--   * top-level run row,
--   * the active node id (if any),
--   * counts for waiting / executed,
--   * the ordered list of node results with their waiting reasons.

CREATE OR REPLACE FUNCTION public.fn_get_workflow_run_state(
  p_run_id uuid
) RETURNS TABLE(
  run_id              uuid,
  workflow_id         uuid,
  status              text,
  active_node_id      uuid,
  pending_count       integer,
  waiting_count       integer,
  in_flight_count     integer,
  executed_count      integer,
  failed_count        integer,
  is_running          boolean,
  started_at          timestamptz,
  completed_at        timestamptz,
  parent_run_id       uuid,
  recursion_depth     integer,
  node_results        jsonb,
  upstream_count      integer,
  downstream_count    integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
  WITH run AS (
    SELECT *
    FROM lenses.workflow_runs r
    WHERE r.id = p_run_id
      AND EXISTS (
        SELECT 1
        FROM lenses.workflows w
        WHERE w.id = r.workflow_id
          AND (
            r.triggered_by = lensers.get_auth_lenser_id()
            OR w.visibility::text = 'public'
          )
      )
  ),
  results AS (
    SELECT
      nr.*,
      n.label    AS node_label,
      n.ordinal  AS node_ordinal
    FROM lenses.workflow_node_results nr
    LEFT JOIN lenses.workflow_nodes n ON n.id = nr.node_id
    WHERE nr.run_id = p_run_id
  ),
  agg AS (
    SELECT
      COUNT(*) FILTER (WHERE results.status = 'pending')                                                     AS pending_count,
      COUNT(*) FILTER (WHERE results.status IN ('awaiting_dependency', 'queued'))                            AS waiting_count,
      COUNT(*) FILTER (WHERE results.status IN ('running', 'streaming', 'retrying'))                         AS in_flight_count,
      COUNT(*) FILTER (WHERE results.status IN ('completed', 'skipped'))                                     AS executed_count,
      COUNT(*) FILTER (WHERE results.status IN ('failed', 'timed_out', 'blocked', 'invalidated', 'cancelled')) AS failed_count
    FROM results
  ),
  prov AS (
    SELECT
      COUNT(*) FILTER (WHERE p.target_run_id = p_run_id) AS upstream_count,
      COUNT(*) FILTER (WHERE p.source_run_id = p_run_id) AS downstream_count
    FROM lenses.workflow_run_provenance p
    WHERE p.target_run_id = p_run_id OR p.source_run_id = p_run_id
  ),
  ordered_results AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',              results.id,
        'node_id',         results.node_id,
        'node_label',      results.node_label,
        'node_ordinal',    results.node_ordinal,
        'status',          results.status,
        'waiting_reason',  results.waiting_reason,
        'output_data',     results.output_data,
        'error_message',   results.error_message,
        'retry_count',     results.retry_count,
        'duration_ms',     results.duration_ms,
        'ttfb_ms',         results.ttfb_ms,
        'started_at',      results.started_at,
        'completed_at',    results.completed_at
      )
      ORDER BY results.node_ordinal NULLS LAST, results.id
    ) AS data
    FROM results
  )
  SELECT
    run.id,
    run.workflow_id,
    run.status::text,
    run.active_node_id,
    COALESCE(agg.pending_count, 0)::int,
    COALESCE(agg.waiting_count, 0)::int,
    COALESCE(agg.in_flight_count, 0)::int,
    COALESCE(agg.executed_count, 0)::int,
    COALESCE(agg.failed_count, 0)::int,
    (run.status NOT IN ('completed', 'failed', 'cancelled', 'timed_out')) AS is_running,
    run.started_at,
    run.completed_at,
    run.parent_run_id,
    run.recursion_depth,
    COALESCE(ordered_results.data, '[]'::jsonb),
    COALESCE(prov.upstream_count, 0)::int,
    COALESCE(prov.downstream_count, 0)::int
  FROM run
  CROSS JOIN agg
  CROSS JOIN prov
  CROSS JOIN ordered_results;
$$;

ALTER FUNCTION public.fn_get_workflow_run_state(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_run_state(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_workflow_run_state(uuid) IS
  'N8N-style canonical run projection. One round-trip returns active node, waiting/executed counts, ordered node results, and provenance edge counts. Drives the workflow execution inspector.';
