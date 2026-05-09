-- =============================================================================
-- 20260421000000_workflow_observability.sql
-- -----------------------------------------------------------------------------
-- Phase 6 — Observability (Lens Workflow Engine Blueprint §9).
--
-- Extends `workflow_node_results` with per-attempt timing / retry metrics and
-- introduces three read-only views consumed by the monitoring UI, cost
-- dashboards, and the recovery loop health check.
--
-- Changes
-- ---------
-- 1. Add `retry_count`, `duration_ms`, `ttfb_ms` columns to
--    `lenses.workflow_node_results` (all NULL / 0 default, additive).
-- 2. Update `fn_update_workflow_node_result` to accept and persist retries +
--    timing metrics. Timing is only written when the caller provides a value
--    (so partial updates remain safe).
-- 3. Create `v_workflow_run_timeline`   — chronologically ordered node spans.
-- 4. Create `v_workflow_run_cost_breakdown` — per-run token + credit rollups.
-- 5. Create `v_workflow_run_health`     — live run liveness signals for the
--    recovery loop (stale heartbeat, stuck attempt count, age).
-- =============================================================================

-- ─── 1. New columns ───────────────────────────────────────────────────────
ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS ttfb_ms integer;

ALTER TABLE lenses.workflow_node_results
  DROP CONSTRAINT IF EXISTS wnr_retry_count_nonneg;

ALTER TABLE lenses.workflow_node_results
  ADD CONSTRAINT wnr_retry_count_nonneg CHECK (retry_count >= 0);

ALTER TABLE lenses.workflow_node_results
  DROP CONSTRAINT IF EXISTS wnr_duration_ms_nonneg;

ALTER TABLE lenses.workflow_node_results
  ADD CONSTRAINT wnr_duration_ms_nonneg CHECK (duration_ms IS NULL OR duration_ms >= 0);

ALTER TABLE lenses.workflow_node_results
  DROP CONSTRAINT IF EXISTS wnr_ttfb_ms_nonneg;

ALTER TABLE lenses.workflow_node_results
  ADD CONSTRAINT wnr_ttfb_ms_nonneg CHECK (ttfb_ms IS NULL OR ttfb_ms >= 0);

COMMENT ON COLUMN lenses.workflow_node_results.retry_count IS
  'Number of provider retries consumed for this node. 0 on first success; increments each time NodeRuntime applies a retry policy before terminal success/failure.';

COMMENT ON COLUMN lenses.workflow_node_results.duration_ms IS
  'Wall-clock duration of the final (successful or terminal) provider attempt, in milliseconds. NULL when the node is skipped/blocked before any attempt.';

COMMENT ON COLUMN lenses.workflow_node_results.ttfb_ms IS
  'Time-to-first-byte on streamed nodes, in milliseconds. Written from the first `partial` chunk observed by NodeRuntime; NULL for non-streaming lenses.';

-- ─── 2. fn_update_workflow_node_result — accept observability metrics ─────
CREATE OR REPLACE FUNCTION public.fn_update_workflow_node_result(
  p_run_id        uuid,
  p_node_id       uuid,
  p_status        text,
  p_output_data   jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_retry_count   integer DEFAULT NULL,
  p_duration_ms   integer DEFAULT NULL,
  p_ttfb_ms       integer DEFAULT NULL
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
    -- Timing metrics are monotonic: once written, later partial updates
    -- (e.g. failed -> retrying -> completed) keep the most recent non-null
    -- value for duration, but ttfb only records the FIRST streamed chunk.
    duration_ms   = COALESCE(p_duration_ms, duration_ms),
    ttfb_ms       = COALESCE(ttfb_ms, p_ttfb_ms),
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
END;
$$;

COMMENT ON FUNCTION public.fn_update_workflow_node_result(uuid, uuid, text, jsonb, text, integer, integer, integer) IS
  'Phase 6 overload: persists retry_count / duration_ms / ttfb_ms alongside status + output. All observability args are nullable — callers that omit them preserve prior values.';

-- ─── 3. v_workflow_run_timeline ───────────────────────────────────────────
DROP VIEW IF EXISTS public.v_workflow_run_timeline CASCADE;
CREATE VIEW public.v_workflow_run_timeline AS
SELECT
  r.id                AS run_id,
  r.workflow_id,
  r.status            AS run_status,
  r.started_at        AS run_started_at,
  nr.node_id,
  n.label             AS node_label,
  nr.status           AS node_status,
  nr.started_at       AS node_started_at,
  nr.completed_at     AS node_completed_at,
  nr.retry_count,
  nr.duration_ms,
  nr.ttfb_ms,
  nr.error_message,
  -- Seconds from run start to node start (negative = not yet started).
  EXTRACT(EPOCH FROM (nr.started_at - r.started_at))   AS rel_start_s,
  EXTRACT(EPOCH FROM (nr.completed_at - r.started_at)) AS rel_end_s
FROM lenses.workflow_runs r
JOIN lenses.workflow_node_results nr ON nr.run_id = r.id
LEFT JOIN lenses.workflow_nodes n ON n.id = nr.node_id
ORDER BY r.id, nr.started_at NULLS LAST, nr.node_id;

COMMENT ON VIEW public.v_workflow_run_timeline IS
  'Phase 6 — Chronological timeline of node execution within a run. Used by the monitoring UI to render Gantt-style lanes.';

-- ─── 4. v_workflow_run_cost_breakdown ─────────────────────────────────────
DROP VIEW IF EXISTS public.v_workflow_run_cost_breakdown CASCADE;
CREATE VIEW public.v_workflow_run_cost_breakdown AS
SELECT
  r.id                                   AS run_id,
  r.workflow_id,
  r.status                               AS run_status,
  r.triggered_by,
  COUNT(nr.id)                           AS total_nodes,
  COUNT(nr.id) FILTER (WHERE nr.status = 'completed')  AS completed_nodes,
  COUNT(nr.id) FILTER (WHERE nr.status IN ('failed', 'timed_out', 'invalidated', 'blocked')) AS failed_nodes,
  COUNT(nr.id) FILTER (WHERE nr.status = 'skipped')    AS skipped_nodes,
  COALESCE(SUM(nr.input_tokens), 0)      AS total_input_tokens,
  COALESCE(SUM(nr.output_tokens), 0)     AS total_output_tokens,
  COALESCE(SUM(nr.cost_credits), 0)      AS total_cost_credits,
  COALESCE(SUM(nr.retry_count), 0)       AS total_retries,
  COALESCE(AVG(nr.duration_ms), 0)::int  AS avg_duration_ms,
  COALESCE(MAX(nr.duration_ms), 0)::int  AS max_duration_ms,
  COALESCE(AVG(nr.ttfb_ms), 0)::int      AS avg_ttfb_ms
FROM lenses.workflow_runs r
LEFT JOIN lenses.workflow_node_results nr ON nr.run_id = r.id
GROUP BY r.id, r.workflow_id, r.status, r.triggered_by;

COMMENT ON VIEW public.v_workflow_run_cost_breakdown IS
  'Phase 6 — Per-run token + credit + latency rollup. Drives cost dashboards and per-lenser usage reports.';

-- ─── 5. v_workflow_run_health ─────────────────────────────────────────────
-- Used by the Phase 7 recovery loop. A run is "stale" if its heartbeat is
-- older than 60s while the run is still in a non-terminal status. Exposed as
-- a view so operational queries and the worker claim loop share one source of
-- truth.
DROP VIEW IF EXISTS public.v_workflow_run_health CASCADE;
CREATE VIEW public.v_workflow_run_health AS
SELECT
  r.id                              AS run_id,
  r.workflow_id,
  r.status,
  r.run_worker_id,
  r.heartbeat_at,
  r.started_at,
  r.completed_at,
  r.parent_run_id,
  r.recursion_depth,
  EXTRACT(EPOCH FROM (now() - COALESCE(r.heartbeat_at, r.started_at))) AS seconds_since_heartbeat,
  CASE
    WHEN r.status IN ('completed', 'failed', 'cancelled', 'timed_out') THEN 'terminal'
    WHEN r.heartbeat_at IS NULL                                          THEN 'no_heartbeat'
    WHEN now() - r.heartbeat_at > INTERVAL '60 seconds'                 THEN 'stale'
    ELSE 'live'
  END                               AS liveness,
  (SELECT COUNT(*) FROM lenses.workflow_node_results nr
     WHERE nr.run_id = r.id
       AND nr.status IN ('pending', 'awaiting_dependency', 'queued')) AS pending_nodes,
  (SELECT COUNT(*) FROM lenses.workflow_node_results nr
     WHERE nr.run_id = r.id
       AND nr.status IN ('running', 'streaming', 'retrying'))         AS in_flight_nodes,
  (SELECT COUNT(*) FROM lenses.workflow_node_results nr
     WHERE nr.run_id = r.id
       AND nr.status IN ('completed', 'skipped'))                    AS done_nodes
FROM lenses.workflow_runs r;

COMMENT ON VIEW public.v_workflow_run_health IS
  'Phase 6 + 7 — Liveness + progress signals per run. `liveness` maps to recovery actions: live = leave alone, stale = candidate for fn_claim_stale_workflow_run, no_heartbeat = never advanced past queued, terminal = finished.';

GRANT SELECT ON public.v_workflow_run_timeline      TO authenticated, service_role;
GRANT SELECT ON public.v_workflow_run_cost_breakdown TO authenticated, service_role;
GRANT SELECT ON public.v_workflow_run_health        TO authenticated, service_role;

ALTER FUNCTION public.fn_update_workflow_node_result(uuid, uuid, text, jsonb, text, integer, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_workflow_node_result(uuid, uuid, text, jsonb, text, integer, integer, integer) TO authenticated, service_role;
