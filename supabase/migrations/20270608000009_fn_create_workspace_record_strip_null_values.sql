-- fn_create_workspace_record raised 23502 "null value in column ... violates
-- not-null constraint" whenever the caller sent an explicit JSON null for a
-- column that has a NOT NULL DEFAULT (e.g. team_members.responsibility
-- DEFAULT '' NOT NULL). The function already stripped id/created_at/
-- updated_at from the payload precisely so their DEFAULT clauses could fire
-- when the caller omitted them — but a caller sending `null` explicitly
-- (rather than omitting the key) bypassed that: jsonb_populate_record casts
-- the JSON null into the column's SQL NULL, which then hits the NOT NULL
-- constraint instead of falling back to the DEFAULT. See GitHub issue #478.
--
-- Fix: strip every key whose value is JSON null from the payload, not just
-- the three hardcoded ones. An explicit null now means the same thing as
-- omitting the field — let the column's own DEFAULT (or NULL, for nullable
-- columns with no default) apply — which is the least-surprising behavior
-- for a generic multi-table creator RPC and matches the issue's own
-- "audit other NOT NULL columns with defaults for the same issue" ask: this
-- fixes team_members.responsibility and every other NOT-NULL-DEFAULT column
-- across all fourteen allowlisted tables in one pass, not just this one
-- reported column.

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

  -- Treat an explicit JSON null the same as an omitted field: drop the key
  -- so the column's own DEFAULT (or NULL, if nullable with no default)
  -- applies, instead of failing NOT NULL columns whose default the caller
  -- didn't actually intend to override.
  SELECT COALESCE(jsonb_object_agg(kv.key, kv.value), '{}'::jsonb)
    INTO v_data
    FROM jsonb_each(v_data) AS kv(key, value)
   WHERE kv.value <> 'null'::jsonb;

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
