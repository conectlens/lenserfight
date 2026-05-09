-- =============================================================================
-- 20260430040000_agent_fleet_aggregations.sql
-- -----------------------------------------------------------------------------
-- Adds views + RPCs for the human-mode fleet sidebar (Overview, Runs, Logs).
-- All views are filtered through agents.ownerships so a human only sees the
-- agents they own.
-- =============================================================================

-- ─── Fleet overview (per human owner) ───────────────────────────────────────
DROP VIEW IF EXISTS agents.v_human_fleet_overview;
CREATE OR REPLACE VIEW agents.v_human_fleet_overview AS
SELECT
  o.owner_lenser_id                                                   AS human_lenser_id,
  count(distinct al.id)                                               AS agents_total,
  count(distinct al.id) FILTER (WHERE al.is_active AND al.suspended_at IS NULL) AS agents_active,
  coalesce(sum(qs.credits_spent), 0)                                  AS credits_30d,
  count(distinct tr.id) FILTER (
    WHERE tr.created_at >= now() - interval '24 hours'
  )                                                                    AS runs_24h,
  count(distinct tr.id) FILTER (WHERE tr.approval_status = 'pending') AS approvals_pending,
  count(distinct ws.id) FILTER (WHERE ws.is_active)                   AS schedules_active
FROM agents.ownerships o
JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
LEFT JOIN agents.team_runs tr ON tr.ai_lenser_id = al.id
LEFT JOIN agents.quota_snapshots qs
  ON qs.ai_lenser_id = al.id
 AND qs.period_date >= (current_date - interval '30 days')
LEFT JOIN lenses.workflow_schedules ws
  ON (ws.assignee_type = 'agent' AND ws.assignee_id = al.id)
  OR (ws.assignee_type = 'team'
      AND ws.assignee_id IN (SELECT t.id FROM agents.teams t WHERE t.ai_lenser_id = al.id))
GROUP BY o.owner_lenser_id;

GRANT SELECT ON agents.v_human_fleet_overview TO authenticated, service_role;

COMMENT ON VIEW agents.v_human_fleet_overview IS
  'Per-human-owner fleet aggregations across owned agents. Used by the human-mode Overview section.';

-- ─── Fleet runs (union of team_runs across owned agents) ────────────────────
DROP VIEW IF EXISTS agents.v_human_fleet_runs;
CREATE OR REPLACE VIEW agents.v_human_fleet_runs AS
SELECT
  o.owner_lenser_id                                                   AS human_lenser_id,
  tr.id                                                               AS run_id,
  tr.ai_lenser_id,
  p.handle                                                            AS agent_handle,
  tr.team_id,
  tr.workflow_id,
  tr.status,
  tr.approval_status,
  tr.metadata,
  tr.created_at,
  tr.started_at,
  tr.completed_at
FROM agents.ownerships o
JOIN agents.ai_lensers   al ON al.id = o.ai_lenser_id
JOIN lensers.profiles     p  ON p.id = al.profile_id
JOIN agents.team_runs    tr ON tr.ai_lenser_id = al.id;

GRANT SELECT ON agents.v_human_fleet_runs TO authenticated, service_role;

-- ─── Fleet logs (union of agent_run_events across owned agents) ─────────────
DROP VIEW IF EXISTS agents.v_human_fleet_logs;
CREATE OR REPLACE VIEW agents.v_human_fleet_logs AS
SELECT
  o.owner_lenser_id      AS human_lenser_id,
  ev.id                  AS event_id,
  ev.team_run_id,
  tr.ai_lenser_id,
  p.handle               AS agent_handle,
  ev.event_type,
  ev.payload,
  ev.occurred_at
FROM agents.ownerships o
JOIN agents.ai_lensers      al ON al.id = o.ai_lenser_id
JOIN lensers.profiles        p  ON p.id = al.profile_id
JOIN agents.team_runs        tr ON tr.ai_lenser_id = al.id
JOIN agents.agent_run_events ev ON ev.team_run_id = tr.id;

GRANT SELECT ON agents.v_human_fleet_logs TO authenticated, service_role;

-- ─── RPC: paginated fleet runs ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_human_fleet_runs(uuid, text, uuid, timestamptz, integer, integer);
CREATE OR REPLACE FUNCTION public.fn_human_fleet_runs(
  p_human_lenser_id uuid,
  p_status          text  DEFAULT NULL,
  p_agent_id        uuid  DEFAULT NULL,
  p_since           timestamptz DEFAULT NULL,
  p_limit           integer DEFAULT 50,
  p_offset          integer DEFAULT 0
)
RETURNS SETOF agents.v_human_fleet_runs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, agents
AS $$
  SELECT *
    FROM agents.v_human_fleet_runs
   WHERE human_lenser_id = p_human_lenser_id
     AND human_lenser_id = auth.uid()
     AND (p_status   IS NULL OR status     = p_status)
     AND (p_agent_id IS NULL OR ai_lenser_id = p_agent_id)
     AND (p_since    IS NULL OR created_at >= p_since)
   ORDER BY created_at DESC
   LIMIT GREATEST(0, LEAST(COALESCE(p_limit, 50), 200))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.fn_human_fleet_runs(uuid, text, uuid, timestamptz, integer, integer) TO authenticated;

-- ─── RPC: paginated fleet logs ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_human_fleet_logs(uuid, uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION public.fn_human_fleet_logs(
  p_human_lenser_id uuid,
  p_run_id          uuid DEFAULT NULL,
  p_event_type      text DEFAULT NULL,
  p_limit           integer DEFAULT 100,
  p_offset          integer DEFAULT 0
)
RETURNS SETOF agents.v_human_fleet_logs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, agents
AS $$
  SELECT *
    FROM agents.v_human_fleet_logs
   WHERE human_lenser_id = p_human_lenser_id
     AND human_lenser_id = auth.uid()
     AND (p_run_id     IS NULL OR team_run_id = p_run_id)
     AND (p_event_type IS NULL OR event_type   = p_event_type)
   ORDER BY occurred_at DESC
   LIMIT GREATEST(0, LEAST(COALESCE(p_limit, 100), 500))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.fn_human_fleet_logs(uuid, uuid, text, integer, integer) TO authenticated;
