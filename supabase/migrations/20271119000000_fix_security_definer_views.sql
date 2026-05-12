-- Fix: remove implicit SECURITY DEFINER from views owned by postgres.
-- Views owned by a superuser bypass RLS unless security_invoker is explicitly
-- enabled. Recreating each view WITH (security_invoker = 'on') makes it run
-- in the querying user's context, so RLS on underlying tables is enforced.

-- ─── 1. v_workflow_run_timeline ───────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_workflow_run_timeline
  WITH (security_invoker = 'on')
AS
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
  EXTRACT(EPOCH FROM (nr.started_at - r.started_at))   AS rel_start_s,
  EXTRACT(EPOCH FROM (nr.completed_at - r.started_at)) AS rel_end_s
FROM lenses.workflow_runs r
JOIN lenses.workflow_node_results nr ON nr.run_id = r.id
LEFT JOIN lenses.workflow_nodes n ON n.id = nr.node_id
ORDER BY r.id, nr.started_at NULLS LAST, nr.node_id;

-- ─── 2. v_workflow_run_cost_breakdown ─────────────────────────────────────
CREATE OR REPLACE VIEW public.v_workflow_run_cost_breakdown
  WITH (security_invoker = 'on')
AS
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

-- ─── 3. v_workflow_run_health ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_workflow_run_health
  WITH (security_invoker = 'on')
AS
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

-- ─── 4. vw_ai_models_public ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_ai_models_public
  WITH (security_invoker = 'on')
AS
SELECT
  m.id,
  m.name,
  m.key,
  p.key                    AS provider_key,
  p.display_name           AS provider_name,
  m.context_window_tokens,
  m.supports_tools,
  m.supports_json_schema,
  m.supports_vision,
  m.capabilities,
  m.input_modalities,
  m.output_modalities,
  m.is_active
FROM ai.models m
JOIN ai.providers p ON p.id = m.provider_id
WHERE m.is_active = true
  AND p.is_active = true
ORDER BY p.display_name, m.name;

-- ─── 5. vw_xp_leaderboard_season ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_xp_leaderboard_season
  WITH (security_invoker = 'on')
AS
WITH ranked AS (
  SELECT
    st.season_id,
    s.slug AS season_slug,
    st.app_id,
    st.lenser_id,
    st.total_xp,
    rank() OVER (PARTITION BY st.season_id, st.app_id ORDER BY st.total_xp DESC, st.lenser_id) AS rank
  FROM xp.season_totals st
  JOIN xp.seasons s ON s.id = st.season_id
),
top100 AS (
  SELECT season_id, season_slug, app_id, lenser_id, total_xp, rank
  FROM ranked
  WHERE rank <= 100
),
me AS (
  SELECT season_id, season_slug, app_id, lenser_id, total_xp, rank
  FROM ranked
  WHERE lenser_id = auth.uid()
)
SELECT
  t.season_id,
  t.season_slug,
  t.app_id,
  t.rank,
  t.lenser_id,
  t.total_xp,
  jsonb_build_object('display_name', l.display_name, 'handle', l.handle, 'avatar_url', l.avatar_url) AS "user"
FROM top100 t
JOIN lensers.profiles l ON l.id = t.lenser_id
UNION
SELECT
  m.season_id,
  m.season_slug,
  m.app_id,
  m.rank,
  m.lenser_id,
  m.total_xp,
  jsonb_build_object('display_name', l.display_name, 'handle', l.handle, 'avatar_url', l.avatar_url) AS "user"
FROM me m
JOIN lensers.profiles l ON l.id = m.lenser_id;
