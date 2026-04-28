-- =============================================================================
-- 20260429020000_human_activity_feed.sql
-- -----------------------------------------------------------------------------
-- F3 of the ConnectedLenses frontend phase. Adds:
--
--   public.fn_get_human_activity_feed(p_human_lenser_id, p_limit, p_offset)
--
-- A unified, sorted feed across every AI Lenser owned by the calling human.
-- Replaces the per-agent automation feed with an aggregate view used by the
-- Activity tab on `/lenser/:human-handle/ag/overview`. Returned rows form a
-- polymorphic union with `kind` discriminating which source produced them:
--
--   - approval_pending  ← agents.team_runs WHERE approval_status='pending'
--   - team_run          ← agents.team_runs (recent) excluding pending
--   - schedule_dispatch ← lenses.workflow_schedules.last_run_at recency
--   - agent_action      ← agents.action_logs (recent)
--
-- RLS: the calling user must own the agents whose data is returned. We do not
-- accept a different `p_human_lenser_id` from the caller's session; the RPC
-- raises 42501 on mismatch. SECURITY DEFINER lets us aggregate cross-agent
-- without granting reads on every base table to authenticated.
-- =============================================================================

DROP FUNCTION IF EXISTS public.fn_get_human_activity_feed(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.fn_get_human_activity_feed(
  p_human_lenser_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  occurred_at timestamptz,
  kind text,
  ai_lenser_id uuid,
  ai_lenser_handle text,
  ai_lenser_name text,
  title text,
  status text,
  team_run_id uuid,
  workflow_id uuid,
  schedule_id uuid,
  action_type text,
  payload jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'lenses'
AS $$
DECLARE
  v_caller uuid;
  v_safe_limit integer := COALESCE(p_limit, 50);
  v_safe_offset integer := COALESCE(p_offset, 0);
BEGIN
  v_caller := lensers.get_auth_human_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF v_caller <> p_human_lenser_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another human Lenser''s activity feed.'
      USING ERRCODE = '42501';
  END IF;

  IF v_safe_limit < 1 THEN v_safe_limit := 1; END IF;
  IF v_safe_limit > 200 THEN v_safe_limit := 200; END IF;
  IF v_safe_offset < 0 THEN v_safe_offset := 0; END IF;

  RETURN QUERY
  WITH owned_agents AS (
    SELECT o.ai_lenser_id, p.handle, p.display_name
    FROM agents.ownerships o
    JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
    JOIN lensers.profiles p ON p.id = al.profile_id
    WHERE o.owner_lenser_id = v_caller
      AND o.role IN ('owner', 'co_owner')
      AND o.revoked_at IS NULL
  ),
  approval_items AS (
    SELECT
      tr.created_at AS occurred_at,
      'approval_pending'::text AS kind,
      tr.ai_lenser_id,
      oa.handle AS ai_lenser_handle,
      oa.display_name AS ai_lenser_name,
      COALESCE(w.title, 'Untitled workflow') AS title,
      'pending'::text AS status,
      tr.id AS team_run_id,
      tr.workflow_id,
      NULL::uuid AS schedule_id,
      NULL::text AS action_type,
      jsonb_build_object(
        'gate_kind', tr.metadata->>'gate_kind',
        'requested_action', tr.metadata->>'requested_action',
        'requester_agent_id', tr.metadata->>'requester_agent_id'
      ) AS payload
    FROM agents.team_runs tr
    JOIN owned_agents oa ON oa.ai_lenser_id = tr.ai_lenser_id
    LEFT JOIN lenses.workflows w ON w.id = tr.workflow_id
    WHERE tr.approval_status = 'pending'
  ),
  run_items AS (
    SELECT
      COALESCE(tr.completed_at, tr.started_at, tr.created_at) AS occurred_at,
      'team_run'::text AS kind,
      tr.ai_lenser_id,
      oa.handle AS ai_lenser_handle,
      oa.display_name AS ai_lenser_name,
      COALESCE(w.title, 'Untitled workflow') AS title,
      tr.status,
      tr.id AS team_run_id,
      tr.workflow_id,
      NULL::uuid AS schedule_id,
      NULL::text AS action_type,
      jsonb_build_object(
        'approval_status', tr.approval_status,
        'started_at', tr.started_at,
        'completed_at', tr.completed_at
      ) AS payload
    FROM agents.team_runs tr
    JOIN owned_agents oa ON oa.ai_lenser_id = tr.ai_lenser_id
    LEFT JOIN lenses.workflows w ON w.id = tr.workflow_id
    WHERE tr.approval_status <> 'pending'
  ),
  schedule_items AS (
    SELECT
      COALESCE(s.last_run_at, s.created_at) AS occurred_at,
      'schedule_dispatch'::text AS kind,
      al.id AS ai_lenser_id,
      oa.handle AS ai_lenser_handle,
      oa.display_name AS ai_lenser_name,
      COALESCE(w.title, 'Untitled workflow') AS title,
      COALESCE(s.last_dispatch_status, 'never_dispatched') AS status,
      NULL::uuid AS team_run_id,
      s.workflow_id,
      s.id AS schedule_id,
      NULL::text AS action_type,
      jsonb_build_object(
        'cron_expr', s.cron_expr,
        'timezone', s.timezone,
        'next_run_at', s.next_run_at,
        'last_error_message', s.last_error_message,
        'assignee_type', s.assignee_type,
        'assignee_id', s.assignee_id
      ) AS payload
    FROM lenses.workflow_schedules s
    JOIN lenses.workflows w ON w.id = s.workflow_id
    -- Schedules are bound to a workflow whose lenser_id is the AI workspace
    -- profile id when assignee_type='agent'; otherwise we resolve via the
    -- assignee_id column.
    JOIN agents.ai_lensers al
      ON al.id = COALESCE(
           CASE WHEN s.assignee_type = 'agent' THEN s.assignee_id END,
           (SELECT id FROM agents.ai_lensers ail WHERE ail.profile_id = w.lenser_id)
         )
    JOIN owned_agents oa ON oa.ai_lenser_id = al.id
  ),
  action_items AS (
    SELECT
      a.occurred_at,
      'agent_action'::text AS kind,
      a.ai_lenser_id,
      oa.handle AS ai_lenser_handle,
      oa.display_name AS ai_lenser_name,
      a.action_type AS title,
      a.result AS status,
      NULL::uuid AS team_run_id,
      NULL::uuid AS workflow_id,
      NULL::uuid AS schedule_id,
      a.action_type,
      a.metadata AS payload
    FROM agents.action_logs a
    JOIN owned_agents oa ON oa.ai_lenser_id = a.ai_lenser_id
  ),
  combined AS (
    SELECT * FROM approval_items
    UNION ALL
    SELECT * FROM run_items
    UNION ALL
    SELECT * FROM schedule_items
    UNION ALL
    SELECT * FROM action_items
  )
  SELECT *
  FROM combined
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT v_safe_limit OFFSET v_safe_offset;
END;
$$;

ALTER FUNCTION public.fn_get_human_activity_feed(uuid, integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_get_human_activity_feed(uuid, integer, integer) IS
  'Cross-agent activity feed for the calling human Lenser. Aggregates pending approvals, recent team runs, schedule dispatches, and agent actions across every owned AI lenser. Caller must equal p_human_lenser_id.';

GRANT EXECUTE ON FUNCTION public.fn_get_human_activity_feed(uuid, integer, integer) TO authenticated, service_role;
