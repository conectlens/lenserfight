-- fn_list_memory_profiles / fn_list_model_profiles only matched ownership
-- against the *active session lenser* (lensers.get_auth_lenser_id()), with
-- no fallback to the resolved human owner (lensers.get_auth_human_lenser_id())
-- the way write paths like fn_upsert_workflow_schedule already do. A caller
-- operating from inside an AI lenser's agent workspace session (active
-- lenser = the agent, not the human owner) fails this check and gets []
-- back for rows that were just created for that same ai_lenser_id — see
-- GitHub issue #481.
--
-- Separately, fn_create_workspace_record performed no ownership check at
-- all before inserting: being SECURITY DEFINER plpgsql with dynamic EXECUTE,
-- it bypasses RLS entirely and only validated p_table_name against an
-- allowlist. This let a caller create memory_profiles/model_profiles/
-- personality_profiles/tool_profiles rows for an ai_lenser_id they don't
-- own. Scoped fix: when the caller-supplied p_data carries an ai_lenser_id
-- key, require the same ownership check the read paths now enforce. The
-- other allowlisted tables (workflow_assignments, evaluation_*,
-- tools_registry, team_members, team_edges, agent_run_events,
-- agent_run_steps) don't key off ai_lenser_id and are not addressed here —
-- auditing their own authorization model is a separate, larger follow-up.

CREATE OR REPLACE FUNCTION "public"."fn_list_memory_profiles"("p_ai_lenser_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
  SELECT to_jsonb(mp.*)
  FROM agents.memory_profiles mp
  WHERE mp.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE (o.owner_lenser_id = lensers.get_auth_lenser_id()
               OR o.owner_lenser_id = lensers.get_auth_human_lenser_id())
          AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY mp.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION "public"."fn_list_model_profiles"("p_ai_lenser_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
  SELECT to_jsonb(mop.*)
  FROM agents.model_profiles mop
  WHERE mop.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE (o.owner_lenser_id = lensers.get_auth_lenser_id()
               OR o.owner_lenser_id = lensers.get_auth_human_lenser_id())
          AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY mop.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION "public"."fn_create_workspace_record"("p_table_name" "text", "p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_result    jsonb;
  v_data      jsonb := COALESCE(p_data, '{}'::jsonb);
  v_cols      text;
  v_selects   text;
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

  -- Drop fields whose column defaults should fire when the caller omits a
  -- value. Today these are id, created_at, updated_at. Stripping them keeps
  -- the INSERT column list lean so DEFAULT clauses apply.
  v_data := v_data - 'id' - 'created_at' - 'updated_at';

  IF jsonb_typeof(v_data) <> 'object' THEN
    RAISE EXCEPTION 'create_forbidden: p_data must be a JSON object' USING ERRCODE = '22023';
  END IF;

  -- Authorization: when the caller-supplied payload targets a specific
  -- ai_lenser_id, require that the caller (as either the active session
  -- lenser or its resolved human owner) actually owns that agent. Mirrors
  -- the read-side check in fn_list_memory_profiles / fn_list_model_profiles
  -- so a write can't silently succeed for an agent the caller doesn't
  -- control.
  IF v_data ? 'ai_lenser_id' THEN
    IF NOT (
      (v_data->>'ai_lenser_id')::uuid IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE (o.owner_lenser_id = lensers.get_auth_lenser_id()
               OR o.owner_lenser_id = lensers.get_auth_human_lenser_id())
          AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    ) THEN
      RAISE EXCEPTION 'create_forbidden: caller does not own ai_lenser_id %', v_data->>'ai_lenser_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Empty payloads: rely entirely on column defaults / NOT NULL violations
  -- (the caller did not specify any fields).
  IF (SELECT count(*) FROM jsonb_object_keys(v_data)) = 0 THEN
    EXECUTE format(
      'INSERT INTO agents.%I DEFAULT VALUES RETURNING to_jsonb(%I.*)',
      p_table_name, p_table_name
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Build the column list and the matching SELECT-from-record list from the
  -- keys actually present in v_data. jsonb_populate_record casts each value
  -- to the column's true type; we then project only those columns so the
  -- omitted ones fall back to their DEFAULT clause on INSERT.
  SELECT
    string_agg(quote_ident(k), ', '            ORDER BY k),
    string_agg(format('r.%I', k), ', '         ORDER BY k)
  INTO v_cols, v_selects
  FROM jsonb_object_keys(v_data) AS k;

  EXECUTE format(
    'INSERT INTO agents.%I (%s) '
    'SELECT %s FROM jsonb_populate_record(NULL::agents.%I, %L::jsonb) AS r '
    'RETURNING to_jsonb(%I.*)',
    p_table_name,
    v_cols,
    v_selects,
    p_table_name,
    v_data::text,
    p_table_name
  ) INTO v_result;

  RETURN v_result;
END;
$$;
