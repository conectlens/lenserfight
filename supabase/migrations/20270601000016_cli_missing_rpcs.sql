-- ─── CLI missing RPCs ────────────────────────────────────────────────────────
-- Fills all public-schema SECURITY DEFINER wrappers needed by apps/cli so it
-- can operate on cloud without direct non-public schema access via PostgREST.

-- ─── fn_list_active_team_runs ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT to_jsonb(tr.*)
    FROM agents.team_runs tr
    WHERE tr.ai_lenser_id = p_ai_lenser_id
      AND tr.status IN ('queued', 'running', 'blocked')
    ORDER BY tr.created_at DESC
    LIMIT 200;
END;
$$;

ALTER FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") IS 'Owner-only: list queued/running/blocked team_runs for an AI lenser. Max 200 rows.';
GRANT ALL ON FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_active_team_runs"("p_ai_lenser_id" "uuid") TO "service_role";

-- ─── fn_list_team_runs ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT to_jsonb(tr.*)
    FROM agents.team_runs tr
    WHERE tr.ai_lenser_id = p_ai_lenser_id
    ORDER BY tr.created_at DESC
    LIMIT LEAST(p_limit, 100);
END;
$$;

ALTER FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer) IS 'Owner-only: paginated recent team_runs for an AI lenser. Max 100 rows per call.';
GRANT ALL ON FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_team_runs"("p_ai_lenser_id" "uuid", "p_limit" integer) TO "service_role";

-- ─── fn_add_team_member ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_add_team_member"(
  "p_team_id"               "uuid",
  "p_agent_id"              "uuid",
  "p_role"                  "text" DEFAULT 'operator'::"text",
  "p_responsibility"        "text" DEFAULT ''::"text",
  "p_lane"                  integer DEFAULT 0,
  "p_sort_order"            integer DEFAULT 0,
  "p_personality_profile_id" "uuid" DEFAULT NULL::"uuid",
  "p_memory_profile_id"     "uuid" DEFAULT NULL::"uuid",
  "p_tool_profile_id"       "uuid" DEFAULT NULL::"uuid",
  "p_model_profile_id"      "uuid" DEFAULT NULL::"uuid"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_ai_lenser_id uuid;
  v_result       jsonb;
BEGIN
  SELECT t.ai_lenser_id INTO v_ai_lenser_id
  FROM agents.teams t
  WHERE t.id = p_team_id;

  IF v_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Team % not found', p_team_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own team %', p_team_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.team_members (
    team_id, agent_id, role, responsibility, lane, sort_order,
    personality_profile_id, memory_profile_id, tool_profile_id, model_profile_id,
    is_active
  ) VALUES (
    p_team_id, p_agent_id, p_role, p_responsibility, p_lane, p_sort_order,
    p_personality_profile_id, p_memory_profile_id, p_tool_profile_id, p_model_profile_id,
    true
  )
  RETURNING to_jsonb(agents.team_members.*) INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_add_team_member"("p_team_id" "uuid", "p_agent_id" "uuid", "p_role" "text", "p_responsibility" "text", "p_lane" integer, "p_sort_order" integer, "p_personality_profile_id" "uuid", "p_memory_profile_id" "uuid", "p_tool_profile_id" "uuid", "p_model_profile_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_add_team_member"("p_team_id" "uuid", "p_agent_id" "uuid", "p_role" "text", "p_responsibility" "text", "p_lane" integer, "p_sort_order" integer, "p_personality_profile_id" "uuid", "p_memory_profile_id" "uuid", "p_tool_profile_id" "uuid", "p_model_profile_id" "uuid") IS 'Owner-only: add a member to an agent team. Returns the inserted row as jsonb.';
GRANT ALL ON FUNCTION "public"."fn_add_team_member"("p_team_id" "uuid", "p_agent_id" "uuid", "p_role" "text", "p_responsibility" "text", "p_lane" integer, "p_sort_order" integer, "p_personality_profile_id" "uuid", "p_memory_profile_id" "uuid", "p_tool_profile_id" "uuid", "p_model_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_add_team_member"("p_team_id" "uuid", "p_agent_id" "uuid", "p_role" "text", "p_responsibility" "text", "p_lane" integer, "p_sort_order" integer, "p_personality_profile_id" "uuid", "p_memory_profile_id" "uuid", "p_tool_profile_id" "uuid", "p_model_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_add_team_member"("p_team_id" "uuid", "p_agent_id" "uuid", "p_role" "text", "p_responsibility" "text", "p_lane" integer, "p_sort_order" integer, "p_personality_profile_id" "uuid", "p_memory_profile_id" "uuid", "p_tool_profile_id" "uuid", "p_model_profile_id" "uuid") TO "service_role";

-- ─── fn_remove_team_member ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_ai_lenser_id uuid;
BEGIN
  SELECT t.ai_lenser_id INTO v_ai_lenser_id
  FROM agents.team_members tm
  JOIN agents.teams t ON t.id = tm.team_id
  WHERE tm.id = p_member_id;

  IF v_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Team member % not found', p_member_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own this team member' USING ERRCODE = '42501';
  END IF;

  DELETE FROM agents.team_members WHERE id = p_member_id;
END;
$$;

ALTER FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") IS 'Owner-only: remove a member from an agent team. No-op if not found (after auth check).';
GRANT ALL ON FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_remove_team_member"("p_member_id" "uuid") TO "service_role";

-- ─── fn_add_team_edge ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_add_team_edge"(
  "p_team_id"         "uuid",
  "p_source_member_id" "uuid",
  "p_target_member_id" "uuid",
  "p_edge_type"       "text" DEFAULT 'delegates'::"text",
  "p_is_blocking"     boolean DEFAULT false
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_ai_lenser_id uuid;
  v_result       jsonb;
BEGIN
  SELECT t.ai_lenser_id INTO v_ai_lenser_id
  FROM agents.teams t
  WHERE t.id = p_team_id;

  IF v_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Team % not found', p_team_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own team %', p_team_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.team_edges (team_id, source_member_id, target_member_id, edge_type, is_blocking)
  VALUES (p_team_id, p_source_member_id, p_target_member_id, p_edge_type, p_is_blocking)
  RETURNING to_jsonb(agents.team_edges.*) INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_add_team_edge"("p_team_id" "uuid", "p_source_member_id" "uuid", "p_target_member_id" "uuid", "p_edge_type" "text", "p_is_blocking" boolean) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_add_team_edge"("p_team_id" "uuid", "p_source_member_id" "uuid", "p_target_member_id" "uuid", "p_edge_type" "text", "p_is_blocking" boolean) IS 'Owner-only: add a typed edge between two team members. Returns the inserted row as jsonb.';
GRANT ALL ON FUNCTION "public"."fn_add_team_edge"("p_team_id" "uuid", "p_source_member_id" "uuid", "p_target_member_id" "uuid", "p_edge_type" "text", "p_is_blocking" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_add_team_edge"("p_team_id" "uuid", "p_source_member_id" "uuid", "p_target_member_id" "uuid", "p_edge_type" "text", "p_is_blocking" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_add_team_edge"("p_team_id" "uuid", "p_source_member_id" "uuid", "p_target_member_id" "uuid", "p_edge_type" "text", "p_is_blocking" boolean) TO "service_role";

-- ─── fn_create_workflow_assignment ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_create_workflow_assignment"(
  "p_ai_lenser_id"           "uuid",
  "p_workflow_id"            "uuid",
  "p_assignee_kind"          "text",
  "p_assignee_ai_lenser_id"  "uuid" DEFAULT NULL::"uuid",
  "p_assignee_team_id"       "uuid" DEFAULT NULL::"uuid",
  "p_approval_policy"        "jsonb" DEFAULT NULL::"jsonb",
  "p_retry_policy"           "jsonb" DEFAULT NULL::"jsonb",
  "p_failure_policy"         "jsonb" DEFAULT NULL::"jsonb",
  "p_queue_policy"           "jsonb" DEFAULT NULL::"jsonb"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'Permission denied: caller does not own AI lenser %', p_ai_lenser_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workflow_assignments (
    ai_lenser_id, workflow_id, assignee_kind,
    assignee_ai_lenser_id, assignee_team_id,
    approval_policy, retry_policy, failure_policy, queue_policy
  ) VALUES (
    p_ai_lenser_id, p_workflow_id, p_assignee_kind,
    p_assignee_ai_lenser_id, p_assignee_team_id,
    COALESCE(p_approval_policy, '{"requiresApproval": true}'::jsonb),
    COALESCE(p_retry_policy,    '{"maxRetries": 1}'::jsonb),
    COALESCE(p_failure_policy,  '{"mode": "isolate"}'::jsonb),
    COALESCE(p_queue_policy,    '{"mode": "parallel"}'::jsonb)
  )
  RETURNING to_jsonb(agents.workflow_assignments.*) INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_create_workflow_assignment"("p_ai_lenser_id" "uuid", "p_workflow_id" "uuid", "p_assignee_kind" "text", "p_assignee_ai_lenser_id" "uuid", "p_assignee_team_id" "uuid", "p_approval_policy" "jsonb", "p_retry_policy" "jsonb", "p_failure_policy" "jsonb", "p_queue_policy" "jsonb") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_create_workflow_assignment"("p_ai_lenser_id" "uuid", "p_workflow_id" "uuid", "p_assignee_kind" "text", "p_assignee_ai_lenser_id" "uuid", "p_assignee_team_id" "uuid", "p_approval_policy" "jsonb", "p_retry_policy" "jsonb", "p_failure_policy" "jsonb", "p_queue_policy" "jsonb") IS 'Owner-only: create a workflow assignment for an AI lenser. Returns the inserted row as jsonb.';
GRANT ALL ON FUNCTION "public"."fn_create_workflow_assignment"("p_ai_lenser_id" "uuid", "p_workflow_id" "uuid", "p_assignee_kind" "text", "p_assignee_ai_lenser_id" "uuid", "p_assignee_team_id" "uuid", "p_approval_policy" "jsonb", "p_retry_policy" "jsonb", "p_failure_policy" "jsonb", "p_queue_policy" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_workflow_assignment"("p_ai_lenser_id" "uuid", "p_workflow_id" "uuid", "p_assignee_kind" "text", "p_assignee_ai_lenser_id" "uuid", "p_assignee_team_id" "uuid", "p_approval_policy" "jsonb", "p_retry_policy" "jsonb", "p_failure_policy" "jsonb", "p_queue_policy" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_workflow_assignment"("p_ai_lenser_id" "uuid", "p_workflow_id" "uuid", "p_assignee_kind" "text", "p_assignee_ai_lenser_id" "uuid", "p_assignee_team_id" "uuid", "p_approval_policy" "jsonb", "p_retry_policy" "jsonb", "p_failure_policy" "jsonb", "p_queue_policy" "jsonb") TO "service_role";

-- ─── fn_get_team_run_conversation ────────────────────────────────────────────
-- Returns messages from agents.v_team_run_conversation, aliasing message_id→id
-- for backward compatibility with CLI's TeamConversationRow interface.

CREATE OR REPLACE FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_ai_lenser_id uuid;
BEGIN
  SELECT tr.ai_lenser_id INTO v_ai_lenser_id
  FROM agents.team_runs tr
  WHERE tr.id = p_run_id;

  IF v_ai_lenser_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT jsonb_build_object(
      'id',                c.message_id,
      'team_run_id',       c.team_run_id,
      'from_agent_id',     c.from_agent_id,
      'to_agent_id',       c.to_agent_id,
      'kind',              c.kind,
      'payload',           c.payload,
      'parent_message_id', c.parent_message_id,
      'occurred_at',       c.occurred_at,
      'depth',             c.depth
    )
    FROM agents.v_team_run_conversation c
    WHERE c.team_run_id = p_run_id
    ORDER BY c.occurred_at ASC
    LIMIT LEAST(p_limit, 500);
END;
$$;

ALTER FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer) IS 'Owner-only: threaded messages for a team run. Returns message_id aliased as id. Max 500 rows.';
GRANT ALL ON FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_team_run_conversation"("p_run_id" "uuid", "p_limit" integer) TO "service_role";

-- ─── fn_get_team_run_scratchpad ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") RETURNS TABLE("shared_scratchpad" "jsonb", "shared_scratchpad_version" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_ai_lenser_id uuid;
BEGIN
  SELECT tr.ai_lenser_id INTO v_ai_lenser_id
  FROM agents.team_runs tr
  WHERE tr.id = p_run_id;

  IF v_ai_lenser_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT tr.shared_scratchpad, tr.shared_scratchpad_version
    FROM agents.team_runs tr
    WHERE tr.id = p_run_id;
END;
$$;

ALTER FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") IS 'Owner-only: fetch shared_scratchpad and version for a team run.';
GRANT ALL ON FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_team_run_scratchpad"("p_run_id" "uuid") TO "service_role";

-- ─── fn_list_standing_approvals ──────────────────────────────────────────────
-- Returns non-revoked standing approvals for AI lensers owned by the caller.
-- Aliases created_at→granted_at and created_by→granted_by for CLI compat.

CREATE OR REPLACE FUNCTION "public"."fn_list_standing_approvals"(
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid",
  "p_limit"       integer DEFAULT 50
) RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
  SELECT jsonb_build_object(
    'id',          sa.id,
    'ai_lenser_id', sa.ai_lenser_id,
    'workflow_id', sa.workflow_id,
    'gate_kind',   sa.gate_kind,
    'granted_at',  sa.created_at,
    'expires_at',  sa.expires_at,
    'revoked_at',  sa.revoked_at,
    'granted_by',  sa.created_by
  )
  FROM agents.standing_approvals sa
  WHERE sa.revoked_at IS NULL
    AND agents.can_manage_ai_lenser(sa.ai_lenser_id)
    AND (p_workflow_id IS NULL OR sa.workflow_id = p_workflow_id)
  ORDER BY sa.created_at DESC
  LIMIT LEAST(p_limit, 200);
$$;

ALTER FUNCTION "public"."fn_list_standing_approvals"("p_workflow_id" "uuid", "p_limit" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_list_standing_approvals"("p_workflow_id" "uuid", "p_limit" integer) IS 'Owner-only: list active (non-revoked) standing approvals across all owned AI lensers. Optional workflow filter.';
GRANT ALL ON FUNCTION "public"."fn_list_standing_approvals"("p_workflow_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_standing_approvals"("p_workflow_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_standing_approvals"("p_workflow_id" "uuid", "p_limit" integer) TO "service_role";

-- ─── fn_create_automation_rule ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_create_automation_rule"(
  "p_name"             "text",
  "p_match_event_type" "text",
  "p_action_kind"      "text",
  "p_action_config"    "jsonb",
  "p_match_filter"     "jsonb" DEFAULT '{}'::"jsonb",
  "p_is_active"        boolean DEFAULT true
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'automation', 'lensers'
    AS $$
DECLARE
  v_lenser_id uuid;
  v_result    jsonb;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO automation.trigger_rules (
    lenser_id, name, match_event_type, action_kind, action_config,
    match_filter, is_active
  ) VALUES (
    v_lenser_id, p_name, p_match_event_type, p_action_kind, p_action_config,
    COALESCE(p_match_filter, '{}'::jsonb), p_is_active
  )
  RETURNING to_jsonb(automation.trigger_rules.*) INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_create_automation_rule"("p_name" "text", "p_match_event_type" "text", "p_action_kind" "text", "p_action_config" "jsonb", "p_match_filter" "jsonb", "p_is_active" boolean) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_create_automation_rule"("p_name" "text", "p_match_event_type" "text", "p_action_kind" "text", "p_action_config" "jsonb", "p_match_filter" "jsonb", "p_is_active" boolean) IS 'Owner-only: create a new automation trigger rule for the current user. Returns the inserted row as jsonb.';
GRANT ALL ON FUNCTION "public"."fn_create_automation_rule"("p_name" "text", "p_match_event_type" "text", "p_action_kind" "text", "p_action_config" "jsonb", "p_match_filter" "jsonb", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_automation_rule"("p_name" "text", "p_match_event_type" "text", "p_action_kind" "text", "p_action_config" "jsonb", "p_match_filter" "jsonb", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_automation_rule"("p_name" "text", "p_match_event_type" "text", "p_action_kind" "text", "p_action_config" "jsonb", "p_match_filter" "jsonb", "p_is_active" boolean) TO "service_role";

-- ─── fn_list_automation_dispatch_history ────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer DEFAULT 25) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'automation', 'lensers'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Verify the caller owns the rule before showing dispatch history.
  IF NOT EXISTS (
    SELECT 1 FROM automation.trigger_rules r
    WHERE r.id = p_rule_id AND r.lenser_id = v_lenser_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT to_jsonb(ed.*)
    FROM automation.event_dispatches ed
    WHERE ed.rule_id = p_rule_id
    ORDER BY ed.attempted_at DESC
    LIMIT LEAST(p_limit, 100);
END;
$$;

ALTER FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer) IS 'Owner-only: list event_dispatch entries for a trigger rule. Max 100 rows per call.';
GRANT ALL ON FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_automation_dispatch_history"("p_rule_id" "uuid", "p_limit" integer) TO "service_role";

-- ─── fn_list_recent_workflow_runs ────────────────────────────────────────────
-- Cross-workflow paginated list of runs triggered by the current user.

CREATE OR REPLACE FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "status" "text", "trigger_mode" "text", "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "created_at" timestamp with time zone, "global_model_id" "text", "spent_credits" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'lensers'
    AS $$
  SELECT
    wr.id,
    wr.workflow_id,
    wr.status,
    wr.trigger_mode,
    wr.started_at,
    wr.completed_at,
    wr.created_at,
    wr.global_model_id,
    wr.spent_credits
  FROM lenses.workflow_runs wr
  WHERE wr.triggered_by = lensers.get_auth_lenser_id()
  ORDER BY wr.created_at DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset;
$$;

ALTER FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer, "p_offset" integer) IS 'Owner-only: paginated list of workflow runs across all workflows triggered by the current user. Max 200 rows per call.';
GRANT ALL ON FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_recent_workflow_runs"("p_limit" integer, "p_offset" integer) TO "service_role";
