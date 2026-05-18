-- =============================================================================
-- 20271222000000_fix_workspace_rpcs_and_schedule_owner.sql
-- -----------------------------------------------------------------------------
-- Four production bugs surfaced after workspace-switch:
--
--   1. fn_delete_workspace_item: references tbl.owner_lenser_id which does not
--      exist on any agents.* table in the allowlist. Postgres rejects the
--      DELETE plan with 42703 "column tbl.owner_lenser_id does not exist".
--      Fix: drop the owner_lenser_id branch. Ownership for agent objects flows
--      through ai_lenser_id or the agents.teams → agents.ownerships join.
--
--   2. fn_upsert_workspace_item: same column-not-exists hazard (same predicate).
--      Fix: drop owner_lenser_id branch.
--
--   3. fn_create_workspace_record: jsonb_populate_record produces a record with
--      id = NULL (the JSONB payload does not include id), which then violates
--      team_members.id NOT NULL — the table default gen_random_uuid() never
--      fires because jsonb_populate_record emits an explicit NULL field.
--      Fix: project the populated record without its NULL id column so the
--      column default applies on INSERT.
--
--   4. fn_upsert_workflow_schedule (public wrapper): owner check uses
--      lensers.get_auth_lenser_id(), which returns the ACTIVE workspace lenser
--      id. After fn_switch_active_lenser sets preferences.active_lenser_id to
--      an AI lenser, the comparison against workflows.lenser_id (human) fails
--      with 42501 "not the owner of workflow ...". Same root cause that was
--      fixed for agent management RPCs in 20270901000014. The function now
--      accepts either the active lenser id (human session) or the workspace
--      human owner id (AI session) — keeping legitimate operators authorized
--      regardless of active workspace.
--
-- All changes are SECURITY DEFINER. search_path, OWNER, and GRANTs preserved.
-- =============================================================================


-- ─── helper: build the per-table ownership predicate ────────────────────────
-- The agent workspace tables fall into four ownership shapes:
--   A. has tbl.ai_lenser_id          → join agents.ownerships directly
--   B. has tbl.team_id               → join teams → ownerships
--   C. has tbl.team_run_id           → join team_runs → ownerships
--   D. has tbl.owner_lenser_id       → compare directly (tools_registry)
--   E. has tbl.evaluation_id         → join evaluations → ownerships
-- Returning a parenthesized predicate keeps the format-string callers simple.

CREATE OR REPLACE FUNCTION public.fn__workspace_ownership_predicate(
  p_table_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE p_table_name
    WHEN 'teams'                THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'evaluations'          THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'memory_profiles'      THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'model_profiles'       THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'personality_profiles' THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'scratchpad_runs'      THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'tool_assignments'     THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'tool_profiles'        THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'workflow_assignments' THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'workspace_settings'   THEN 'EXISTS (SELECT 1 FROM agents.ownerships o WHERE o.ai_lenser_id = tbl.ai_lenser_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'team_members'         THEN 'EXISTS (SELECT 1 FROM agents.teams t JOIN agents.ownerships o ON o.ai_lenser_id = t.ai_lenser_id WHERE t.id = tbl.team_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'team_edges'           THEN 'EXISTS (SELECT 1 FROM agents.teams t JOIN agents.ownerships o ON o.ai_lenser_id = t.ai_lenser_id WHERE t.id = tbl.team_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'agent_run_events'     THEN 'EXISTS (SELECT 1 FROM agents.team_runs tr JOIN agents.ownerships o ON o.ai_lenser_id = tr.ai_lenser_id WHERE tr.id = tbl.team_run_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'agent_run_steps'      THEN 'EXISTS (SELECT 1 FROM agents.team_runs tr JOIN agents.ownerships o ON o.ai_lenser_id = tr.ai_lenser_id WHERE tr.id = tbl.team_run_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'tools_registry'       THEN 'tbl.owner_lenser_id = $2'
    WHEN 'evaluation_cases'     THEN 'EXISTS (SELECT 1 FROM agents.evaluations e JOIN agents.ownerships o ON o.ai_lenser_id = e.ai_lenser_id WHERE e.id = tbl.evaluation_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'evaluation_rubrics'   THEN 'EXISTS (SELECT 1 FROM agents.evaluations e JOIN agents.ownerships o ON o.ai_lenser_id = e.ai_lenser_id WHERE e.id = tbl.evaluation_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
    WHEN 'evaluation_baselines' THEN 'EXISTS (SELECT 1 FROM agents.evaluations e JOIN agents.ownerships o ON o.ai_lenser_id = e.ai_lenser_id WHERE e.id = tbl.evaluation_id AND o.owner_lenser_id = $2 AND o.revoked_at IS NULL)'
  END
$$;

ALTER FUNCTION public.fn__workspace_ownership_predicate(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn__workspace_ownership_predicate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn__workspace_ownership_predicate(text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn__workspace_ownership_predicate(text) IS
  'Internal helper: returns a parameterized SQL predicate expressing ownership of an agents.<table> row by lenser id $2. Used by fn_delete_workspace_item / fn_upsert_workspace_item to dispatch per-table ownership shapes safely.';


-- ─── 1. fn_delete_workspace_item: drop owner_lenser_id predicate ─────────────

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
  v_lenser_id uuid := lensers.get_auth_human_lenser_id();
  v_predicate text;
BEGIN
  IF p_table_name NOT IN (
    'teams', 'team_members', 'team_edges', 'personality_profiles',
    'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'evaluation_cases', 'evaluation_rubrics',
    'evaluation_baselines', 'tools_registry', 'tool_assignments',
    'evaluations', 'scratchpad_runs', 'workspace_settings',
    'agent_run_events', 'agent_run_steps'
  ) THEN
    RAISE EXCEPTION 'delete_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  v_predicate := public.fn__workspace_ownership_predicate(p_table_name);
  IF v_predicate IS NULL THEN
    RAISE EXCEPTION 'delete_forbidden: no ownership predicate for %', p_table_name
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'DELETE FROM agents.%I tbl WHERE tbl.id = $1 AND (%s OR public.is_admin())',
    p_table_name,
    v_predicate
  ) USING p_id, v_lenser_id;
END;
$$;

ALTER FUNCTION public.fn_delete_workspace_item(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_workspace_item(text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_delete_workspace_item(text, uuid) IS
  'Delete an agents workspace record. Ownership: ai_lenser_id via agents.ownerships, or team_id via teams→ownerships, or is_admin. No reference to non-existent owner_lenser_id column.';


-- ─── 2. fn_upsert_workspace_item: drop owner_lenser_id predicate ─────────────

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
  v_lenser_id uuid := lensers.get_auth_human_lenser_id();
  v_predicate text;
  v_result    jsonb;
BEGIN
  IF p_table_name NOT IN (
    'teams', 'team_members', 'team_edges', 'personality_profiles',
    'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'scratchpad_runs', 'workspace_settings',
    'evaluation_cases', 'evaluation_rubrics', 'evaluation_baselines',
    'tools_registry', 'tool_assignments', 'evaluations',
    'agent_run_events', 'agent_run_steps'
  ) THEN
    RAISE EXCEPTION 'upsert_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  v_predicate := public.fn__workspace_ownership_predicate(p_table_name);
  IF v_predicate IS NULL THEN
    RAISE EXCEPTION 'upsert_forbidden: no ownership predicate for %', p_table_name
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'UPDATE agents.%I tbl SET updated_at = now() '
    'WHERE tbl.id = $1 AND (%s OR public.is_admin()) '
    'RETURNING to_jsonb(tbl.*)',
    p_table_name,
    v_predicate
  ) USING p_id, v_lenser_id INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'update_not_found_or_forbidden: record % in table % not found or not owned',
      p_id, p_table_name USING ERRCODE = '42501';
  END IF;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_upsert_workspace_item(text, uuid, jsonb) IS
  'Update any agents workspace record by id. Table name is whitelisted. Ownership enforced via human lenser id resolved through agents.ownerships (works after workspace switching). No reference to non-existent owner_lenser_id column on agent tables.';


-- ─── 3. fn_create_workspace_record: let column defaults fire on missing id ──
-- jsonb_populate_record materializes every column of the target record,
-- including a NULL 'id' when the payload omits it. That NULL then beats the
-- column DEFAULT clause and violates the NOT NULL primary key constraint on
-- team_members and friends. Build the INSERT column list at runtime from the
-- keys actually present in the payload (minus id/created_at/updated_at so
-- their defaults apply) and cast each value via jsonb_populate_record.

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

ALTER FUNCTION public.fn_create_workspace_record(text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_workspace_record(text, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_workspace_record(text, jsonb) IS
  'Create an agents workspace record. Strips id/created_at/updated_at from the JSONB payload so column defaults (gen_random_uuid, now) fire. Inserts only the columns the caller actually provided. Whitelisted on p_table_name.';


-- ─── 4. fn_upsert_workflow_schedule: accept human owner after workspace switch

DROP FUNCTION IF EXISTS public.fn_upsert_workflow_schedule(
  uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid,
  jsonb, jsonb, jsonb, jsonb
);

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id            uuid,
  p_schedule_id            uuid    DEFAULT NULL,
  p_cron_expr              text    DEFAULT '* * * * *',
  p_timezone               text    DEFAULT 'UTC',
  p_description            text    DEFAULT NULL,
  p_approval_policy        jsonb   DEFAULT '{"requiresApproval":true}'::jsonb,
  p_is_active              boolean DEFAULT true,
  p_global_model_id        text    DEFAULT NULL,
  p_assignee_id            uuid    DEFAULT NULL,
  p_workflow_assignment_id uuid    DEFAULT NULL,
  p_retry_policy           jsonb   DEFAULT '{"maxRetries":1}'::jsonb,
  p_failure_policy         jsonb   DEFAULT '{"mode":"isolate"}'::jsonb,
  p_queue_policy           jsonb   DEFAULT '{"mode":"parallel"}'::jsonb,
  p_inputs_template        jsonb   DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id                       uuid,
  workflow_id              uuid,
  cron_expr                text,
  timezone                 text,
  description              text,
  is_active                boolean,
  assignee_type            text,
  assignee_id              uuid,
  workflow_assignment_id   uuid,
  approval_policy          jsonb,
  retry_policy             jsonb,
  failure_policy           jsonb,
  queue_policy             jsonb,
  inputs_template          jsonb,
  global_model_id          text,
  next_run_at              timestamptz,
  last_run_at              timestamptz,
  last_run_id              uuid,
  last_dispatch_status     text,
  last_error_at            timestamptz,
  last_error_message       text,
  last_completed_at        timestamptz,
  last_result              jsonb,
  created_at               timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_owner_id          uuid;
  v_active_id         uuid := lensers.get_auth_lenser_id();
  v_human_id          uuid := lensers.get_auth_human_lenser_id();
  v_ai_lenser_id      uuid;
  v_parts             text[];
  v_requires_approval boolean;
  v_spending_limit    numeric;
BEGIN
  -- Resolve workflow owner (human profile id)
  SELECT w.lenser_id INTO v_owner_id
  FROM lenses.workflows w
  WHERE w.id = p_workflow_id;

  -- Authorize when:
  --   a) Active session lenser owns the workflow (legacy human session), OR
  --   b) Human profile resolved from active session owns the workflow
  --      (agent workspace active; human still owns the workflow), OR
  --   c) Caller is an admin.
  IF v_owner_id IS NULL
     OR (v_owner_id <> v_active_id
         AND (v_human_id IS NULL OR v_owner_id <> v_human_id)
         AND NOT public.is_admin())
  THEN
    RAISE EXCEPTION 'not the owner of workflow %', p_workflow_id
      USING ERRCODE = '42501';
  END IF;

  -- CRON validation
  v_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'Invalid CRON expression "%" — expected 5 fields', p_cron_expr
      USING ERRCODE = '22023';
  END IF;

  -- Cycle detection
  IF p_is_active AND lenses.fn_workflow_has_cycle(p_workflow_id) THEN
    RAISE EXCEPTION 'Cannot activate schedule for a workflow with cycles'
      USING ERRCODE = '22023', DETAIL = 'cycle_detected';
  END IF;

  -- Approval-bypass guard + audit (unchanged)
  IF p_is_active THEN
    v_requires_approval := COALESCE(
      (p_approval_policy->>'requiresApproval')::boolean,
      true
    );

    IF NOT v_requires_approval THEN
      SELECT al.id, pol.spending_limit_credits
        INTO v_ai_lenser_id, v_spending_limit
      FROM agents.ai_lensers al
      JOIN agents.policies pol ON pol.id = al.policy_id
      WHERE al.profile_id = v_owner_id
      LIMIT 1;

      IF v_spending_limit IS NULL THEN
        RAISE EXCEPTION
          'Cannot activate a schedule with requiresApproval=false and no spending_limit_credits. '
          'Set a spending limit on the agent policy before disabling approval gates.'
          USING ERRCODE = '23514';
      END IF;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
        VALUES (
          v_ai_lenser_id,
          'approval_bypass_attempted',
          'recorded',
          jsonb_build_object(
            'workflow_id',    p_workflow_id,
            'schedule_id',    p_schedule_id,
            'actor_lenser_id', v_owner_id,
            'spending_limit', v_spending_limit
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT * FROM lenses.fn_upsert_workflow_schedule_internal(
    p_workflow_id, p_schedule_id, p_cron_expr, p_timezone, p_description,
    p_approval_policy, p_is_active, p_global_model_id, p_assignee_id,
    p_workflow_assignment_id, p_retry_policy, p_failure_policy,
    p_queue_policy, p_inputs_template
  );
END;
$$;

ALTER FUNCTION public.fn_upsert_workflow_schedule(
  uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid,
  jsonb, jsonb, jsonb, jsonb
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(
  uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid,
  jsonb, jsonb, jsonb, jsonb
) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_upsert_workflow_schedule(
  uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid,
  jsonb, jsonb, jsonb, jsonb
) IS
  'Upsert a workflow schedule. Authorizes the active session lenser OR the resolved human owner OR an admin so the call succeeds after workspace switches.';


-- ─── 5. Reload PostgREST schema cache ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
