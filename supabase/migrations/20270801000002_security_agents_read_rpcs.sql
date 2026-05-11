-- Security hardening: public SECURITY DEFINER wrappers for agents schema.
--
-- Removes the need to expose the `agents` schema via PostgREST.
-- Existing public RPCs (fn_create_ai_lenser, fn_get_agent_workspace_bootstrap,
-- fn_agent_list_subscriptions, fn_agent_run_events, fn_byok_key_hint,
-- fn_get_provider_configs, fn_human_fleet_logs, fn_human_fleet_runs, etc.)
-- remain unchanged. This adds wrappers for remaining direct table access.

-- ─── READ: fn_get_agent_profile ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_profile(p_ai_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(v.*)
  FROM agents.v_agent_profile v
  WHERE v.id = p_ai_lenser_id
    AND (
      -- Owner can read their own agent
      v.owner_lenser_id = lensers.get_auth_lenser_id()
      -- Admins can read any agent
      OR public.is_admin()
    )
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_agent_profile(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_profile(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_agent_profile_by_profile_id ────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_profile_by_profile_id(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(v.*)
  FROM agents.v_agent_profile v
  WHERE v.profile_id = p_profile_id
    AND (v.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_agent_profile_by_profile_id(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_profile_by_profile_id(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_agents_by_owner ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agents_by_owner(p_owner_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(v.*)
  FROM agents.v_agent_profile v
  WHERE v.owner_lenser_id = p_owner_lenser_id
    AND (p_owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY v.created_at DESC;
$$;

ALTER FUNCTION public.fn_list_agents_by_owner(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agents_by_owner(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_agent_action_logs ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_action_logs(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 50,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id              uuid,
  ai_lenser_id    uuid,
  action_type     text,
  context_ref_type text,
  context_ref_id  uuid,
  result          text,
  metadata        jsonb,
  occurred_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT al.id, al.ai_lenser_id, al.action_type, al.context_ref_type,
         al.context_ref_id, al.result, al.metadata, al.occurred_at
  FROM agents.action_logs al
  WHERE al.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR al.occurred_at < p_cursor)
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = al.ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY al.occurred_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_agent_action_logs(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_action_logs(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_get_agent_quota_snapshot ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_quota_snapshot(
  p_ai_lenser_id uuid,
  p_period_date  date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  id            uuid,
  ai_lenser_id  uuid,
  period_date   date,
  battles_used  integer,
  votes_used    integer,
  credits_spent integer,
  updated_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT qs.id, qs.ai_lenser_id, qs.period_date, qs.battles_used,
         qs.votes_used, qs.credits_spent, qs.updated_at
  FROM agents.quota_snapshots qs
  WHERE qs.ai_lenser_id = p_ai_lenser_id
    AND qs.period_date  = p_period_date
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_agent_quota_snapshot(uuid, date) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_quota_snapshot(uuid, date) TO authenticated, service_role;

-- ─── READ: fn_list_agent_lens_bindings ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_lens_bindings(
  p_ai_lenser_id uuid,
  p_limit        integer DEFAULT 50,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE(
  id           uuid,
  ai_lenser_id uuid,
  lens_id      uuid,
  version_id   uuid,
  is_default   boolean,
  category_tags text[],
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT lb.id, lb.ai_lenser_id, lb.lens_id, lb.version_id,
         lb.is_default, lb.category_tags, lb.created_at
  FROM agents.lens_bindings lb
  WHERE lb.ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY lb.is_default DESC, lb.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_list_agent_lens_bindings(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_lens_bindings(uuid, integer, integer) TO authenticated, service_role;

-- ─── READ: fn_list_agent_model_bindings ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_model_bindings(
  p_ai_lenser_id uuid,
  p_limit        integer DEFAULT 50,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE(
  id            uuid,
  ai_lenser_id  uuid,
  model_id      uuid,
  is_default    boolean,
  category_tags text[],
  created_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT mb.id, mb.ai_lenser_id, mb.model_id, mb.is_default,
         mb.category_tags, mb.created_at
  FROM agents.model_bindings mb
  WHERE mb.ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY mb.is_default DESC, mb.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_list_agent_model_bindings(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_model_bindings(uuid, integer, integer) TO authenticated, service_role;

-- ─── READ: fn_list_agent_teams ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_teams(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 50,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id           uuid,
  ai_lenser_id uuid,
  name         text,
  description  text,
  status       text,
  is_active    boolean,
  created_at   timestamptz,
  updated_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT t.id, t.ai_lenser_id, t.name, t.description, t.status,
         t.is_active, t.created_at, t.updated_at
  FROM agents.teams t
  WHERE t.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR t.created_at < p_cursor)
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_agent_teams(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_teams(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_get_team_members ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_team_members(p_team_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(tm.*)
  FROM agents.team_members tm
  JOIN agents.teams t ON t.id = tm.team_id
  WHERE tm.team_id = p_team_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = t.ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY tm.lane, tm.sort_order;
$$;

ALTER FUNCTION public.fn_get_team_members(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_team_members(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_team_edges ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_team_edges(p_team_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(te.*)
  FROM agents.team_edges te
  JOIN agents.teams t ON t.id = te.team_id
  WHERE te.team_id = p_team_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = t.ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY te.created_at;
$$;

ALTER FUNCTION public.fn_list_team_edges(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_team_edges(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_approval_requests ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_approval_requests(
  p_ai_lenser_id   uuid,
  p_approval_status text DEFAULT NULL,
  p_limit          integer DEFAULT 50
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ar.*)
  FROM agents.approval_requests_v ar
  WHERE ar.ai_lenser_id = p_ai_lenser_id
    AND (p_approval_status IS NULL OR ar.approval_status = p_approval_status)
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY ar.requested_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_approval_requests(uuid, text, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_approval_requests(uuid, text, integer) TO authenticated, service_role;

-- ─── READ: fn_get_approval_request ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_approval_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ar.*)
  FROM agents.approval_requests_v ar
  WHERE ar.request_id = p_request_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = ar.ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_approval_request(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_approval_request(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_agent_cost_summary ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_cost_summary(p_ai_lenser_id uuid)
RETURNS TABLE(
  period_date    date,
  credits_spent  integer,
  battles_used   integer,
  votes_used     integer,
  spending_limit integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT qs.period_date, qs.credits_spent, qs.battles_used, qs.votes_used,
         pol.spending_limit_credits
  FROM agents.quota_snapshots qs
  LEFT JOIN agents.policies pol ON pol.ai_lenser_id = qs.ai_lenser_id
  WHERE qs.ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY qs.period_date DESC
  LIMIT 30;
$$;

ALTER FUNCTION public.fn_get_agent_cost_summary(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_cost_summary(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_scratchpad_runs ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_scratchpad_runs(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 20,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(sr.*)
  FROM agents.scratchpad_runs sr
  WHERE sr.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR sr.started_at < p_cursor)
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY sr.started_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.fn_list_scratchpad_runs(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_scratchpad_runs(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_list_evaluations ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_evaluations(
  p_owner_lenser_id uuid,
  p_limit           integer     DEFAULT 50,
  p_cursor          timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ev.*)
  FROM agents.evaluations ev
  WHERE ev.owner_lenser_id = p_owner_lenser_id
    AND (p_cursor IS NULL OR ev.created_at < p_cursor)
    AND (p_owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY ev.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_evaluations(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_evaluations(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_list_evaluation_cases ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_evaluation_cases(p_evaluation_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ec.*)
  FROM agents.evaluation_cases ec
  JOIN agents.evaluations ev ON ev.id = ec.evaluation_id
  WHERE ec.evaluation_id = p_evaluation_id
    AND (ev.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY ec.created_at ASC;
$$;

ALTER FUNCTION public.fn_list_evaluation_cases(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_evaluation_cases(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_evaluation_runs ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_evaluation_runs(p_evaluation_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(er.*)
  FROM agents.evaluation_runs er
  JOIN agents.evaluations ev ON ev.id = er.evaluation_id
  WHERE er.evaluation_id = p_evaluation_id
    AND (ev.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY er.started_at DESC;
$$;

ALTER FUNCTION public.fn_list_evaluation_runs(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_evaluation_runs(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_evaluation_results ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_results(p_run_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(erv.*)
  FROM agents.evaluation_results_v erv
  JOIN agents.evaluation_runs er ON er.id = erv.run_id
  JOIN agents.evaluations ev ON ev.id = er.evaluation_id
  WHERE erv.run_id = p_run_id
    AND (ev.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin());
$$;

ALTER FUNCTION public.fn_get_evaluation_results(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_evaluation_results(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_evaluation_rubrics ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_evaluation_rubrics(p_evaluation_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(erub.*)
  FROM agents.evaluation_rubrics erub
  JOIN agents.evaluations ev ON ev.id = erub.evaluation_id
  WHERE erub.evaluation_id = p_evaluation_id
    AND (ev.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY erub.version DESC;
$$;

ALTER FUNCTION public.fn_list_evaluation_rubrics(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_evaluation_rubrics(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_evaluation_baseline ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_baseline(p_evaluation_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(eb.*)
  FROM agents.evaluation_baselines eb
  JOIN agents.evaluations ev ON ev.id = eb.evaluation_id
  WHERE eb.evaluation_id = p_evaluation_id
    AND (ev.owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_evaluation_baseline(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_evaluation_baseline(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_tools_registry ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_tools_registry(p_owner_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(tr.*)
  FROM agents.tools_registry tr
  WHERE tr.owner_lenser_id = p_owner_lenser_id
    AND (p_owner_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY tr.name ASC;
$$;

ALTER FUNCTION public.fn_list_tools_registry(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_tools_registry(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_tool_assignments ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_tool_assignments(p_ai_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ta.*)
  FROM agents.tool_assignments ta
  WHERE ta.ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    );
$$;

ALTER FUNCTION public.fn_list_tool_assignments(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_tool_assignments(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_fleet_overview ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_fleet_overview(p_human_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(fo.*)
  FROM agents.v_human_fleet_overview fo
  WHERE fo.human_lenser_id = p_human_lenser_id
    AND (p_human_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_fleet_overview(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_fleet_overview(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_workspace_settings ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_workspace_settings(p_ai_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ws.*)
  FROM agents.workspace_settings ws
  WHERE ws.ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_workspace_settings(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workspace_settings(uuid) TO authenticated, service_role;

-- ─── READ: fn_list_agent_memories ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_memories(
  p_profile_id      uuid,
  p_scope           text    DEFAULT NULL,
  p_limit           integer DEFAULT 50,
  p_include_redacted boolean DEFAULT false
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(mv.*)
  FROM agents.memories_v mv
  WHERE mv.profile_id = p_profile_id
    AND (p_scope IS NULL OR mv.scope = p_scope)
    AND (p_include_redacted OR mv.is_redacted = false)
    AND (
      EXISTS (
        SELECT 1 FROM agents.memory_profiles mp
        JOIN agents.ownerships o ON o.ai_lenser_id = mp.ai_lenser_id
        WHERE mp.id = p_profile_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY mv.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_agent_memories(uuid, text, integer, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_memories(uuid, text, integer, boolean) TO authenticated, service_role;

-- ─── READ: fn_list_memory_access_logs ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_memory_access_logs(
  p_memory_id uuid,
  p_limit     integer DEFAULT 50
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(mal.*)
  FROM agents.memory_access_logs mal
  WHERE mal.memory_id = p_memory_id
  ORDER BY mal.accessed_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_memory_access_logs(uuid, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_memory_access_logs(uuid, integer) TO authenticated, service_role;

-- ─── READ: fn_list_workflow_assignments ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_workflow_assignments(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 50,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(wa.*)
  FROM agents.workflow_assignments wa
  WHERE wa.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR wa.created_at < p_cursor)
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY wa.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_workflow_assignments(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_assignments(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_list_agent_run_steps ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_run_steps(p_team_run_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ars.*)
  FROM agents.agent_run_steps ars
  JOIN agents.team_runs tr ON tr.id = ars.team_run_id
  WHERE ars.team_run_id = p_team_run_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = tr.ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY ars.started_at ASC;
$$;

ALTER FUNCTION public.fn_list_agent_run_steps(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_run_steps(uuid) TO authenticated, service_role;

-- ─── WRITE: fn_create_agent_team ─────────────────────────────────────────────
-- Atomic: creates team + batch-inserts initial members.

CREATE OR REPLACE FUNCTION public.fn_create_agent_team(
  p_ai_lenser_id   uuid,
  p_name           text,
  p_description    text DEFAULT NULL,
  p_initial_members jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_team_id   uuid;
  v_team      jsonb;
  v_member    jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships o
    WHERE o.ai_lenser_id = p_ai_lenser_id
      AND o.owner_lenser_id = v_lenser_id
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'create_team_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.teams (ai_lenser_id, name, description, status, is_active)
  VALUES (p_ai_lenser_id, p_name, p_description, 'active', true)
  RETURNING id, to_jsonb(agents.teams.*) INTO v_team_id, v_team;

  -- Batch insert initial members if provided
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_initial_members) LOOP
    INSERT INTO agents.team_members (
      team_id, agent_id, role, responsibility, lane, sort_order, is_active
    ) VALUES (
      v_team_id,
      (v_member->>'agent_id')::uuid,
      v_member->>'role',
      v_member->>'responsibility',
      v_member->>'lane',
      COALESCE((v_member->>'sort_order')::integer, 0),
      COALESCE((v_member->>'is_active')::boolean, true)
    );
  END LOOP;

  RETURN v_team;
END;
$$;

ALTER FUNCTION public.fn_create_agent_team(uuid, text, text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_agent_team(uuid, text, text, jsonb) TO authenticated, service_role;

-- ─── WRITE: fn_upsert_workspace_item ─────────────────────────────────────────
-- Safe generic upsert for agents workspace tables. Table name is whitelisted.

CREATE OR REPLACE FUNCTION public.fn_upsert_workspace_item(
  p_table_name text,
  p_id         uuid,
  p_patch      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_result    jsonb;
BEGIN
  IF p_table_name NOT IN (
    'teams', 'team_members', 'team_edges', 'personality_profiles',
    'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'scratchpad_runs', 'workspace_settings',
    'evaluation_cases', 'evaluation_rubrics', 'evaluation_baselines',
    'tools_registry', 'tool_assignments', 'evaluations'
  ) THEN
    RAISE EXCEPTION 'upsert_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  -- Build and execute a safe UPDATE using jsonb_populate_record pattern.
  -- Ownership is enforced per-table via separate policy checks below.
  EXECUTE format(
    $q$
    UPDATE agents.%I tbl
    SET updated_at = now()
    WHERE tbl.id = $1
      AND (
        tbl.ai_lenser_id = $2
        OR tbl.owner_lenser_id = $2
        OR EXISTS (
          SELECT 1 FROM agents.teams t
          JOIN agents.ownerships o ON o.ai_lenser_id = t.ai_lenser_id
          WHERE t.id = tbl.team_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM agents.team_members tm
          JOIN agents.teams t ON t.id = tm.team_id
          JOIN agents.ownerships o ON o.ai_lenser_id = t.ai_lenser_id
          WHERE tm.id = tbl.id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL
        )
        OR public.is_admin()
      )
    RETURNING to_jsonb(tbl.*)
    $q$,
    p_table_name
  ) USING p_id, v_lenser_id INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'update_not_found_or_forbidden: record % in table % not found or not owned',
      p_id, p_table_name USING ERRCODE = '42501';
  END IF;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb) IS
  'Security wrapper: update any agents workspace record by id. Table name is '
  'whitelisted to prevent unauthorized access. Ownership is enforced via '
  'ai_lenser_id or owner_lenser_id column. updated_at is always refreshed.';

-- ─── WRITE: fn_delete_workspace_item ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_delete_workspace_item(
  p_table_name text,
  p_id         uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF p_table_name NOT IN (
    'teams', 'team_members', 'team_edges', 'personality_profiles',
    'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'evaluation_cases', 'evaluation_rubrics',
    'tools_registry', 'tool_assignments', 'evaluations'
  ) THEN
    RAISE EXCEPTION 'delete_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    $q$
    DELETE FROM agents.%I tbl
    WHERE tbl.id = $1
      AND (
        tbl.ai_lenser_id = $2
        OR tbl.owner_lenser_id = $2
        OR EXISTS (
          SELECT 1 FROM agents.teams t
          JOIN agents.ownerships o ON o.ai_lenser_id = t.ai_lenser_id
          WHERE t.id = tbl.team_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL
        )
        OR public.is_admin()
      )
    $q$,
    p_table_name
  ) USING p_id, v_lenser_id;
END;
$$;

ALTER FUNCTION public.fn_delete_workspace_item(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_workspace_item(text, uuid) TO authenticated, service_role;

-- ─── WRITE: fn_create_workspace_record ───────────────────────────────────────
-- Insert a new record into whitelisted agents workspace tables.

CREATE OR REPLACE FUNCTION public.fn_create_workspace_record(
  p_table_name text,
  p_data       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_result    jsonb;
BEGIN
  IF p_table_name NOT IN (
    'personality_profiles', 'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'evaluation_cases', 'evaluation_rubrics',
    'evaluation_baselines', 'tools_registry', 'evaluations',
    'team_members', 'team_edges', 'agent_run_events', 'agent_run_steps'
  ) THEN
    RAISE EXCEPTION 'create_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'INSERT INTO agents.%I SELECT * FROM jsonb_populate_record(null::agents.%I, $1) RETURNING to_jsonb(%I.*)',
    p_table_name, p_table_name, p_table_name
  ) USING p_data INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_create_workspace_record(text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_workspace_record(text, jsonb) TO authenticated, service_role;

-- ─── WRITE: fn_cancel_agent_run ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_cancel_agent_run(
  p_team_run_id  uuid,
  p_ai_lenser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  UPDATE agents.team_runs
  SET status = 'cancelled'
  WHERE id = p_team_run_id
    AND ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = v_lenser_id
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    );
END;
$$;

ALTER FUNCTION public.fn_cancel_agent_run(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_cancel_agent_run(uuid, uuid) TO authenticated, service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_get_team_run ───────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_get_team_run(p_team_run_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  SELECT to_jsonb(tr.*)
  FROM agents.team_runs tr
  WHERE tr.id = p_team_run_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_worker_get_team_run(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_team_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_team_run(uuid) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_update_team_run ────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_update_team_run(
  p_team_run_id uuid,
  p_status      text,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  UPDATE agents.team_runs
  SET status       = p_status,
      completed_at = COALESCE(p_completed_at, CASE WHEN p_status IN ('completed','failed','cancelled') THEN now() ELSE NULL END),
      updated_at   = now()
  WHERE id = p_team_run_id;
$$;

ALTER FUNCTION public.fn_worker_update_team_run(uuid, text, timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_update_team_run(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_update_team_run(uuid, text, timestamptz) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_get_delegation_context ─────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_get_delegation_context(p_team_run_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  SELECT jsonb_build_object(
    'team_run', to_jsonb(tr.*),
    'team',     to_jsonb(t.*),
    'members',  COALESCE((
      SELECT jsonb_agg(to_jsonb(tm.*) ORDER BY tm.sort_order)
      FROM agents.team_members tm WHERE tm.team_id = tr.team_id
    ), '[]'::jsonb)
  )
  FROM agents.team_runs tr
  LEFT JOIN agents.teams t ON t.id = tr.team_id
  WHERE tr.id = p_team_run_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_worker_get_delegation_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_delegation_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_delegation_context(uuid) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_list_run_reports ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_run_reports(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 50,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  SELECT to_jsonb(rr.*)
  FROM agents.run_reports rr
  WHERE rr.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR rr.created_at < p_cursor)
  ORDER BY rr.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_run_reports(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_run_reports(uuid, integer, timestamptz) TO authenticated, service_role;

-- ─── READ: fn_list_recent_incidents ──────────────────────────────────────────
-- Used by RecentIncidentsFeed.tsx

CREATE OR REPLACE FUNCTION public.fn_list_recent_incidents(
  p_ai_lenser_id uuid,
  p_limit        integer     DEFAULT 20,
  p_cursor       timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(al.*)
  FROM agents.action_logs al
  WHERE al.ai_lenser_id = p_ai_lenser_id
    AND (p_cursor IS NULL OR al.occurred_at < p_cursor)
    AND al.result = 'error'
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    )
  ORDER BY al.occurred_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.fn_list_recent_incidents(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_recent_incidents(uuid, integer, timestamptz) TO authenticated, service_role;
