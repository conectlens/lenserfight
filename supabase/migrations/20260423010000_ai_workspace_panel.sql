-- =============================================================================
-- 20260423010000_ai_workspace_panel.sql
-- -----------------------------------------------------------------------------
-- Aligns active workspace resolution with UI/runtime expectations, hardens
-- AI-lenser owner authorization, and exposes beta schedule/feed primitives for
-- the AI workspace control panel.
-- =============================================================================

-- ─── 1. Human owner helper + active workspace profile RPC ───────────────────

CREATE OR REPLACE FUNCTION lensers.get_auth_human_lenser_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lensers', 'auth'
AS $$
  SELECT p.id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.type = 'human'
    AND p.status = 'active'
  ORDER BY p.created_at ASC
  LIMIT 1;
$$;

ALTER FUNCTION lensers.get_auth_human_lenser_id() OWNER TO postgres;

COMMENT ON FUNCTION lensers.get_auth_human_lenser_id() IS
  'Returns the authenticated user''s primary active human lenser profile. Used by owner-only AI management policies and RPCs so they continue to work after workspace switching activates an AI lenser.';

GRANT EXECUTE ON FUNCTION lensers.get_auth_human_lenser_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_lensers_get_active_profile()
RETURNS SETOF lensers.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
  SELECT p.*
  FROM lensers.profiles p
  WHERE p.id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_lensers_get_active_profile() OWNER TO postgres;

COMMENT ON FUNCTION public.fn_lensers_get_active_profile() IS
  'Returns the active lenser workspace profile for the authenticated user. Unlike user_id-based lookups this follows preferences.active_lenser_id when an owned AI workspace is selected.';

GRANT EXECUTE ON FUNCTION public.fn_lensers_get_active_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION lensers.current_active_lenser_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'lensers', 'public', 'auth'
AS $$SELECT lensers.get_auth_lenser_id();$$;

ALTER FUNCTION lensers.current_active_lenser_id() OWNER TO postgres;

COMMENT ON FUNCTION lensers.current_active_lenser_id() IS
  'Returns the currently active lenser workspace id (human or owned AI), delegating to lensers.get_auth_lenser_id().';

-- ─── 2. Agent owner policies must resolve via auth.uid() human profile ─────

DROP POLICY IF EXISTS action_logs_owner_read ON agents.action_logs;
CREATE POLICY action_logs_owner_read
  ON agents.action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM agents.ownerships o
      WHERE o.ai_lenser_id = action_logs.ai_lenser_id
        AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
        AND o.revoked_at IS NULL
    )
  );

DROP POLICY IF EXISTS ownerships_read_own ON agents.ownerships;
CREATE POLICY ownerships_read_own
  ON agents.ownerships
  FOR SELECT
  USING (owner_lenser_id = lensers.get_auth_human_lenser_id());

DROP POLICY IF EXISTS quota_snapshots_owner_read ON agents.quota_snapshots;
CREATE POLICY quota_snapshots_owner_read
  ON agents.quota_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM agents.ownerships o
      WHERE o.ai_lenser_id = quota_snapshots.ai_lenser_id
        AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
        AND o.revoked_at IS NULL
    )
  );

-- ─── 3. Expand agent action taxonomy for automation panel events ────────────

ALTER TABLE agents.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check;

ALTER TABLE agents.action_logs
  ADD CONSTRAINT action_logs_type_check
  CHECK (action_type = ANY (ARRAY[
    'join_battle'::text,
    'cast_vote'::text,
    'submit_entry'::text,
    'create_battle'::text,
    'spend_credits'::text,
    'run_lens'::text,
    'run_workflow'::text,
    'dispatch_schedule'::text,
    'schedule_skipped'::text,
    'policy_updated'::text,
    'binding_updated'::text
  ]));

COMMENT ON CONSTRAINT action_logs_type_check ON agents.action_logs IS
  'High-level AI automation audit taxonomy. Includes preview battle actions plus workflow/schedule/policy/binding events for the AI workspace beta panel.';

-- ─── 4. Agent profile view should expose stable profile/runtime identifiers ─

DROP VIEW IF EXISTS agents.v_agent_profile;
CREATE OR REPLACE VIEW agents.v_agent_profile AS
 SELECT a.id,
    a.id AS ai_lenser_id,
    a.profile_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.type AS lenser_type,
    a.runtime_pref,
    a.is_active,
    a.suspended_at,
    a.suspended_reason,
    a.created_at,
    pol.can_join_battles,
    pol.can_vote,
    pol.can_create_battles,
    pol.can_receive_sponsorship,
    pol.model_binding_mode,
    pol.max_daily_battles,
    pol.max_daily_votes,
    pol.spending_limit_credits,
    pol.allowed_battle_types,
    pol.is_public_policy,
    (SELECT COUNT(*) FROM agents.model_bindings mb WHERE mb.ai_lenser_id = a.id) AS model_count,
    (SELECT COUNT(*) FROM agents.lens_bindings lb WHERE lb.ai_lenser_id = a.id) AS lens_count,
    COALESCE(qs.battles_used, 0) AS battles_used,
    COALESCE(qs.votes_used, 0) AS votes_used,
    COALESCE(qs.credits_spent, 0::bigint) AS credits_spent,
    own.owner_lenser_id,
    op.handle AS owner_handle,
    op.display_name AS owner_display_name,
    op.avatar_url AS owner_avatar_url
   FROM agents.ai_lensers a
     JOIN lensers.profiles p ON p.id = a.profile_id
     LEFT JOIN agents.policies pol ON pol.ai_lenser_id = a.id
     LEFT JOIN agents.quota_snapshots qs ON qs.ai_lenser_id = a.id AND qs.period_date = CURRENT_DATE
     LEFT JOIN agents.ownerships own ON own.ai_lenser_id = a.id AND own.role = 'owner'::text AND own.revoked_at IS NULL
     LEFT JOIN lensers.profiles op ON op.id = own.owner_lenser_id;

ALTER VIEW agents.v_agent_profile OWNER TO postgres;

COMMENT ON VIEW agents.v_agent_profile IS
  'Full AI Lenser management profile. Exposes both runtime id (`id` / `ai_lenser_id`) and workspace profile id (`profile_id`) so the UI can switch securely without confusing the two identifiers.';

-- ─── 5. Agent management RPCs must authorize against the owning human ──────

CREATE OR REPLACE FUNCTION agents.fn_update_agent_policy(
  p_ai_lenser_id uuid,
  p_updates jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_caller_human_id uuid;
  v_is_owner boolean;
  v_policy_id uuid;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM agents.ownerships
    WHERE ai_lenser_id = p_ai_lenser_id
      AND owner_lenser_id = v_caller_human_id
      AND role IN ('owner', 'co_owner')
      AND revoked_at IS NULL
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the agent owner or co-owner can update policies'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_policy_id
  FROM agents.policies
  WHERE ai_lenser_id = p_ai_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No policy found for this AI lenser'
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE agents.policies SET
    can_join_battles        = COALESCE((p_updates ->> 'can_join_battles')::boolean, can_join_battles),
    can_vote                = COALESCE((p_updates ->> 'can_vote')::boolean, can_vote),
    can_create_battles      = COALESCE((p_updates ->> 'can_create_battles')::boolean, can_create_battles),
    can_receive_sponsorship = COALESCE((p_updates ->> 'can_receive_sponsorship')::boolean, can_receive_sponsorship),
    model_binding_mode      = COALESCE(
      CASE WHEN p_updates ? 'model_binding_mode' THEN (p_updates ->> 'model_binding_mode')::text END,
      model_binding_mode
    ),
    max_daily_battles       = COALESCE((p_updates ->> 'max_daily_battles')::integer, max_daily_battles),
    max_daily_votes         = COALESCE((p_updates ->> 'max_daily_votes')::integer, max_daily_votes),
    spending_limit_credits  = COALESCE((p_updates ->> 'spending_limit_credits')::integer, spending_limit_credits),
    is_public_policy        = COALESCE((p_updates ->> 'is_public_policy')::boolean, is_public_policy),
    updated_at              = now()
  WHERE id = v_policy_id;

  INSERT INTO agents.action_logs (
    ai_lenser_id,
    action_type,
    result,
    metadata
  ) VALUES (
    p_ai_lenser_id,
    'policy_updated',
    'success',
    jsonb_build_object('fields', ARRAY(SELECT jsonb_object_keys(p_updates)))
  );

  RETURN jsonb_build_object('updated', true, 'policy_id', v_policy_id);
END;
$$;

ALTER FUNCTION agents.fn_update_agent_policy(uuid, jsonb) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.fn_update_agent_policy(
  p_ai_lenser_id uuid,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
BEGIN
  PERFORM agents.fn_update_agent_policy(p_ai_lenser_id, p_patch);
END;
$$;

ALTER FUNCTION public.fn_update_agent_policy(uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_agent_policy(uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_update_agent_profile(
  p_ai_lenser_id uuid,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'agents', 'auth'
AS $$
DECLARE
  v_caller_human_id uuid;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships o
    JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
    WHERE al.profile_id = p_ai_lenser_id
      AND o.owner_lenser_id = v_caller_human_id
      AND o.role = 'owner'
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  UPDATE lensers.profiles
  SET
    display_name = CASE WHEN p_patch ? 'display_name' THEN p_patch->>'display_name' ELSE display_name END,
    avatar_url   = CASE WHEN p_patch ? 'avatar_url'   THEN p_patch->>'avatar_url'   ELSE avatar_url   END,
    banner_url   = CASE WHEN p_patch ? 'banner_url'   THEN p_patch->>'banner_url'   ELSE banner_url   END,
    bio          = CASE WHEN p_patch ? 'bio'          THEN p_patch->>'bio'          ELSE bio          END,
    headline     = CASE WHEN p_patch ? 'headline'     THEN p_patch->>'headline'     ELSE headline     END,
    website_url  = CASE WHEN p_patch ? 'website_url'  THEN p_patch->>'website_url'  ELSE website_url  END,
    updated_at   = now()
  WHERE id = p_ai_lenser_id
    AND type = 'ai';
END;
$$;

ALTER FUNCTION public.fn_update_agent_profile(uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_agent_profile(uuid, jsonb) TO authenticated, service_role;

-- ─── 6. Agent binding RPCs for main lens/model configuration ───────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_agent_lens_binding(
  p_ai_lenser_id uuid,
  p_lens_id uuid,
  p_version_id uuid DEFAULT NULL,
  p_is_default boolean DEFAULT true
) RETURNS SETOF agents.lens_bindings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'lenses'
AS $$
DECLARE
  v_caller_human_id uuid;
  v_profile_id uuid;
  v_binding_id uuid;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT al.profile_id INTO v_profile_id
  FROM agents.ai_lensers al
  JOIN agents.ownerships o ON o.ai_lenser_id = al.id
  WHERE al.id = p_ai_lenser_id
    AND o.owner_lenser_id = v_caller_human_id
    AND o.role IN ('owner', 'co_owner')
    AND o.revoked_at IS NULL
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.lenses l
    WHERE l.id = p_lens_id
      AND l.lenser_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Main lens must be owned by the active AI workspace'
      USING ERRCODE = '42501';
  END IF;

  IF p_is_default THEN
    UPDATE agents.lens_bindings
    SET is_default = false
    WHERE ai_lenser_id = p_ai_lenser_id
      AND is_default = true;
  END IF;

  INSERT INTO agents.lens_bindings (ai_lenser_id, lens_id, version_id, is_default)
  VALUES (p_ai_lenser_id, p_lens_id, p_version_id, p_is_default)
  ON CONFLICT (ai_lenser_id, lens_id) DO UPDATE
    SET version_id = EXCLUDED.version_id,
        is_default = EXCLUDED.is_default
  RETURNING id INTO v_binding_id;

  INSERT INTO agents.action_logs (
    ai_lenser_id,
    action_type,
    result,
    metadata
  ) VALUES (
    p_ai_lenser_id,
    'binding_updated',
    'success',
    jsonb_build_object(
      'binding_kind', 'lens',
      'binding_id', v_binding_id,
      'lens_id', p_lens_id,
      'version_id', p_version_id,
      'is_default', p_is_default
    )
  );

  RETURN QUERY
  SELECT lb.*
  FROM agents.lens_bindings lb
  WHERE lb.id = v_binding_id;
END;
$$;

ALTER FUNCTION public.fn_upsert_agent_lens_binding(uuid, uuid, uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_agent_lens_binding(uuid, uuid, uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_upsert_agent_model_binding(
  p_ai_lenser_id uuid,
  p_model_id uuid,
  p_is_default boolean DEFAULT true
) RETURNS SETOF agents.model_bindings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'ai'
AS $$
DECLARE
  v_caller_human_id uuid;
  v_binding_id uuid;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships o
    WHERE o.ai_lenser_id = p_ai_lenser_id
      AND o.owner_lenser_id = v_caller_human_id
      AND o.role IN ('owner', 'co_owner')
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ai.models m
    WHERE m.id = p_model_id
      AND m.is_active = true
  ) THEN
    RAISE EXCEPTION 'Model not found or inactive'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_is_default THEN
    UPDATE agents.model_bindings
    SET is_default = false
    WHERE ai_lenser_id = p_ai_lenser_id
      AND is_default = true;
  END IF;

  INSERT INTO agents.model_bindings (ai_lenser_id, model_id, is_default)
  VALUES (p_ai_lenser_id, p_model_id, p_is_default)
  ON CONFLICT (ai_lenser_id, model_id) DO UPDATE
    SET is_default = EXCLUDED.is_default
  RETURNING id INTO v_binding_id;

  INSERT INTO agents.action_logs (
    ai_lenser_id,
    action_type,
    result,
    metadata
  ) VALUES (
    p_ai_lenser_id,
    'binding_updated',
    'success',
    jsonb_build_object(
      'binding_kind', 'model',
      'binding_id', v_binding_id,
      'model_id', p_model_id,
      'is_default', p_is_default
    )
  );

  RETURN QUERY
  SELECT mb.*
  FROM agents.model_bindings mb
  WHERE mb.id = v_binding_id;
END;
$$;

ALTER FUNCTION public.fn_upsert_agent_model_binding(uuid, uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_agent_model_binding(uuid, uuid, boolean) TO authenticated, service_role;

-- ─── 7. Workflow schedule metadata + helper functions ──────────────────────

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS last_run_id uuid,
  ADD COLUMN IF NOT EXISTS last_dispatch_status text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_message text;

ALTER TABLE lenses.workflow_schedules
  DROP CONSTRAINT IF EXISTS workflow_schedules_last_run_id_fkey;

ALTER TABLE lenses.workflow_schedules
  ADD CONSTRAINT workflow_schedules_last_run_id_fkey
  FOREIGN KEY (last_run_id) REFERENCES lenses.workflow_runs(id) ON DELETE SET NULL;

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS schedule_id uuid,
  ADD COLUMN IF NOT EXISTS trigger_mode text NOT NULL DEFAULT 'manual';

ALTER TABLE lenses.workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_trigger_mode_check;

ALTER TABLE lenses.workflow_runs
  ADD CONSTRAINT workflow_runs_trigger_mode_check
  CHECK (trigger_mode = ANY (ARRAY['manual'::text, 'schedule'::text, 'subflow'::text]));

ALTER TABLE lenses.workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_schedule_id_fkey;

ALTER TABLE lenses.workflow_runs
  ADD CONSTRAINT workflow_runs_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES lenses.workflow_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_schedule_active
  ON lenses.workflow_runs (schedule_id, status)
  WHERE schedule_id IS NOT NULL;

COMMENT ON COLUMN lenses.workflow_runs.schedule_id IS
  'Owning workflow_schedules.id when the run was dispatched by the scheduler. NULL for manual runs.';

COMMENT ON COLUMN lenses.workflow_runs.trigger_mode IS
  'How the workflow run was triggered: manual, schedule, or subflow.';

COMMENT ON COLUMN lenses.workflow_schedules.last_run_id IS
  'Most recent workflow_runs.id dispatched by this schedule.';

COMMENT ON COLUMN lenses.workflow_schedules.last_dispatch_status IS
  'Best-effort scheduler status: dispatched, skipped_overlap, validation_failed, or dispatch_failed.';

COMMENT ON COLUMN lenses.workflow_schedules.last_error_at IS
  'Timestamp of the most recent schedule dispatch failure or validation skip.';

COMMENT ON COLUMN lenses.workflow_schedules.last_error_message IS
  'Human-readable reason for the most recent schedule dispatch failure/skip.';

CREATE OR REPLACE FUNCTION lenses.fn_cron_field_matches(
  p_field text,
  p_value integer
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_part text;
  v_base text;
  v_step integer;
  v_start integer;
  v_end integer;
  v_exact integer;
BEGIN
  IF p_field IS NULL OR btrim(p_field) = '' THEN
    RETURN false;
  END IF;

  IF btrim(p_field) = '*' THEN
    RETURN true;
  END IF;

  FOREACH v_part IN ARRAY regexp_split_to_array(replace(btrim(p_field), ' ', ''), ',') LOOP
    CONTINUE WHEN v_part = '';

    IF position('/' IN v_part) > 0 THEN
      v_base := split_part(v_part, '/', 1);
      v_step := split_part(v_part, '/', 2)::integer;
      CONTINUE WHEN v_step IS NULL OR v_step <= 0;

      IF v_base = '*' THEN
        IF mod(p_value, v_step) = 0 THEN
          RETURN true;
        END IF;
      ELSIF position('-' IN v_base) > 0 THEN
        v_start := split_part(v_base, '-', 1)::integer;
        v_end := split_part(v_base, '-', 2)::integer;
        IF p_value BETWEEN v_start AND v_end
           AND mod(p_value - v_start, v_step) = 0 THEN
          RETURN true;
        END IF;
      ELSE
        v_exact := v_base::integer;
        IF p_value >= v_exact
           AND mod(p_value - v_exact, v_step) = 0 THEN
          RETURN true;
        END IF;
      END IF;
    ELSIF position('-' IN v_part) > 0 THEN
      v_start := split_part(v_part, '-', 1)::integer;
      v_end := split_part(v_part, '-', 2)::integer;
      IF p_value BETWEEN v_start AND v_end THEN
        RETURN true;
      END IF;
    ELSE
      v_exact := v_part::integer;
      IF p_value = v_exact THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
END;
$$;

ALTER FUNCTION lenses.fn_cron_field_matches(text, integer) OWNER TO postgres;

CREATE OR REPLACE FUNCTION lenses.fn_cron_matches_now(
  p_cron_expr text,
  p_now timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_parts text[];
  v_minute integer := EXTRACT(minute FROM p_now)::integer;
  v_hour integer := EXTRACT(hour FROM p_now)::integer;
  v_dom integer := EXTRACT(day FROM p_now)::integer;
  v_month integer := EXTRACT(month FROM p_now)::integer;
  v_dow0 integer := EXTRACT(dow FROM p_now)::integer;
  v_dow7 integer := CASE WHEN EXTRACT(dow FROM p_now)::integer = 0 THEN 7 ELSE EXTRACT(dow FROM p_now)::integer END;
BEGIN
  v_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RETURN false;
  END IF;

  RETURN lenses.fn_cron_field_matches(v_parts[1], v_minute)
    AND lenses.fn_cron_field_matches(v_parts[2], v_hour)
    AND lenses.fn_cron_field_matches(v_parts[3], v_dom)
    AND lenses.fn_cron_field_matches(v_parts[4], v_month)
    AND (
      lenses.fn_cron_field_matches(v_parts[5], v_dow0)
      OR lenses.fn_cron_field_matches(v_parts[5], v_dow7)
    );
END;
$$;

ALTER FUNCTION lenses.fn_cron_matches_now(text, timestamptz) OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_cron_matches_now(text, timestamptz) IS
  'Best-effort 5-field CRON matcher for minute-based workflow schedules. Supports *, comma lists, ranges, and step syntax.';

CREATE OR REPLACE FUNCTION lenses.fn_workflow_has_cycle(
  p_workflow_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE walk AS (
    SELECT
      e.source_node_id,
      e.target_node_id,
      ARRAY[e.source_node_id, e.target_node_id]::uuid[] AS path,
      e.source_node_id = e.target_node_id AS cycle
    FROM lenses.workflow_edges e
    WHERE e.workflow_id = p_workflow_id

    UNION ALL

    SELECT
      w.source_node_id,
      e.target_node_id,
      w.path || e.target_node_id,
      e.target_node_id = ANY(w.path) AS cycle
    FROM walk w
    JOIN lenses.workflow_edges e
      ON e.workflow_id = p_workflow_id
     AND e.source_node_id = w.target_node_id
    WHERE NOT w.cycle
      AND cardinality(w.path) < 256
  )
  SELECT EXISTS (SELECT 1 FROM walk WHERE cycle);
$$;

ALTER FUNCTION lenses.fn_workflow_has_cycle(uuid) OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_workflow_has_cycle(uuid) IS
  'Returns true when the workflow graph contains a cycle. Used to block schedule activation for invalid DAGs.';

-- ─── 8. Workflow schedule CRUD RPCs ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_workflow_schedules(
  p_workflow_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  workflow_title text,
  cron_expr text,
  global_model_id text,
  inputs_template jsonb,
  is_active boolean,
  last_run_at timestamptz,
  last_run_id uuid,
  last_dispatch_status text,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    s.id,
    s.workflow_id,
    w.title AS workflow_title,
    s.cron_expr,
    s.global_model_id,
    s.inputs_template,
    s.is_active,
    s.last_run_at,
    s.last_run_id,
    s.last_dispatch_status,
    s.last_error_at,
    s.last_error_message,
    s.created_at
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  WHERE w.lenser_id = lensers.get_auth_lenser_id()
    AND (p_workflow_id IS NULL OR s.workflow_id = p_workflow_id)
  ORDER BY s.created_at DESC;
$$;

ALTER FUNCTION public.fn_get_workflow_schedules(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_schedules(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id uuid,
  p_schedule_id uuid DEFAULT NULL,
  p_cron_expr text DEFAULT '* * * * *',
  p_global_model_id text DEFAULT NULL,
  p_inputs_template jsonb DEFAULT '{}'::jsonb,
  p_is_active boolean DEFAULT true
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  workflow_title text,
  cron_expr text,
  global_model_id text,
  inputs_template jsonb,
  is_active boolean,
  last_run_at timestamptz,
  last_run_id uuid,
  last_dispatch_status text,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_owner_id uuid;
  v_schedule_id uuid;
  v_parts text[];
BEGIN
  SELECT w.lenser_id INTO v_owner_id
  FROM lenses.workflows w
  WHERE w.id = p_workflow_id;

  IF v_owner_id IS NULL OR v_owner_id <> lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'Workflow not found or not owned by the active workspace'
      USING ERRCODE = '42501';
  END IF;

  v_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'Invalid CRON expression. Expected 5 fields.'
      USING ERRCODE = '22023';
  END IF;

  IF p_is_active AND lenses.fn_workflow_has_cycle(p_workflow_id) THEN
    RAISE EXCEPTION 'Cannot activate schedule for a workflow with cycles'
      USING ERRCODE = '22023', DETAIL = 'cycle_detected';
  END IF;

  IF p_schedule_id IS NULL THEN
    INSERT INTO lenses.workflow_schedules (
      workflow_id,
      cron_expr,
      global_model_id,
      inputs_template,
      is_active
    ) VALUES (
      p_workflow_id,
      p_cron_expr,
      p_global_model_id,
      COALESCE(p_inputs_template, '{}'::jsonb),
      p_is_active
    )
    RETURNING workflow_schedules.id INTO v_schedule_id;
  ELSE
    UPDATE lenses.workflow_schedules s
    SET
      cron_expr = p_cron_expr,
      global_model_id = p_global_model_id,
      inputs_template = COALESCE(p_inputs_template, '{}'::jsonb),
      is_active = p_is_active,
      last_dispatch_status = CASE
        WHEN p_is_active THEN NULL
        ELSE COALESCE(s.last_dispatch_status, 'paused')
      END,
      last_error_at = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_at
      END,
      last_error_message = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_message
      END
    WHERE s.id = p_schedule_id
      AND s.workflow_id = p_workflow_id
    RETURNING s.id INTO v_schedule_id;

    IF v_schedule_id IS NULL THEN
      RAISE EXCEPTION 'Schedule not found or not owned by the active workspace'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.fn_get_workflow_schedules(p_workflow_id)
  WHERE public.fn_get_workflow_schedules.id = v_schedule_id;
END;
$$;

ALTER FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, jsonb, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, jsonb, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_delete_workflow_schedule(
  p_schedule_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
BEGIN
  DELETE FROM lenses.workflow_schedules s
  USING lenses.workflows w
  WHERE s.id = p_schedule_id
    AND w.id = s.workflow_id
    AND w.lenser_id = lensers.get_auth_lenser_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or not owned by the active workspace'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

ALTER FUNCTION public.fn_delete_workflow_schedule(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_workflow_schedule(uuid) TO authenticated, service_role;

-- ─── 9. Scheduler dispatcher with overlap protection + AI audit logging ────

CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_schedule RECORD;
  v_run_id uuid;
  v_ai_lenser_id uuid;
  v_dispatched integer := 0;
BEGIN
  FOR v_schedule IN
    SELECT
      s.id,
      s.workflow_id,
      s.cron_expr,
      s.global_model_id,
      s.inputs_template,
      s.is_active,
      s.last_run_at,
      w.lenser_id,
      w.title
    FROM lenses.workflow_schedules s
    JOIN lenses.workflows w ON w.id = s.workflow_id
    WHERE s.is_active = true
      AND (s.last_run_at IS NULL OR date_trunc('minute', s.last_run_at) < date_trunc('minute', v_now))
      AND lenses.fn_cron_matches_now(s.cron_expr, v_now)
    ORDER BY s.created_at ASC
  LOOP
    SELECT al.id INTO v_ai_lenser_id
    FROM agents.ai_lensers al
    WHERE al.profile_id = v_schedule.lenser_id
    LIMIT 1;

    IF lenses.fn_workflow_has_cycle(v_schedule.workflow_id) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'validation_failed',
        last_error_at = v_now,
        last_error_message = 'cycle_detected'
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'schedule_skipped',
          'failed',
          jsonb_build_object(
            'reason', 'cycle_detected',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id
          )
        );
      END IF;

      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      WHERE r.schedule_id = v_schedule.id
        AND r.status IN ('draft', 'validated', 'queued', 'pending', 'running', 'streaming', 'recovered')
    ) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'skipped_overlap',
        last_error_at = v_now,
        last_error_message = 'overlap_in_flight'
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'schedule_skipped',
          'throttled',
          jsonb_build_object(
            'reason', 'overlap_in_flight',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id
          )
        );
      END IF;

      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO lenses.workflow_runs (
        workflow_id,
        triggered_by,
        status,
        context_inputs,
        global_model_id,
        schedule_id,
        trigger_mode
      ) VALUES (
        v_schedule.workflow_id,
        v_schedule.lenser_id,
        'pending',
        COALESCE(v_schedule.inputs_template, '{}'::jsonb),
        v_schedule.global_model_id,
        v_schedule.id,
        'schedule'
      )
      RETURNING id INTO v_run_id;

      INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
      SELECT v_run_id, n.id, 'pending'
      FROM lenses.workflow_nodes n
      WHERE n.workflow_id = v_schedule.workflow_id;

      UPDATE lenses.workflow_schedules
      SET
        last_run_at = v_now,
        last_run_id = v_run_id,
        last_dispatch_status = 'dispatched',
        last_error_at = NULL,
        last_error_message = NULL
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'dispatch_schedule',
          'success',
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'workflow_title', v_schedule.title,
            'run_id', v_run_id,
            'trigger_mode', 'schedule'
          )
        );
      END IF;

      v_dispatched := v_dispatched + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'dispatch_failed',
        last_error_at = v_now,
        last_error_message = left(SQLERRM, 500)
      WHERE id = v_schedule.id;

      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id,
          action_type,
          result,
          metadata
        ) VALUES (
          v_ai_lenser_id,
          'dispatch_schedule',
          'failed',
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'error', left(SQLERRM, 500)
          )
        );
      END IF;
    END;
  END LOOP;

  RETURN v_dispatched;
END;
$$;

ALTER FUNCTION lenses.fn_dispatch_scheduled_workflows() OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'Dispatches minute-granularity workflow schedules, skipping any schedule that already has an in-flight run. Scheduled AI workspace dispatches emit high-level agents.action_logs entries for the automation panel.';

GRANT EXECUTE ON FUNCTION lenses.fn_dispatch_scheduled_workflows() TO service_role;

-- ─── 10. Unified automation feed read-model RPC ────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_automation_feed(
  p_ai_lenser_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
  kind text,
  id text,
  occurred_at timestamptz,
  title text,
  result text,
  workflow_id uuid,
  workflow_title text,
  run_id uuid,
  schedule_id uuid,
  action_type text,
  event_type text,
  payload jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lenses', 'lensers'
AS $$
  WITH authorized_agent AS (
    SELECT al.id AS ai_lenser_id, al.profile_id
    FROM agents.ai_lensers al
    JOIN agents.ownerships o ON o.ai_lenser_id = al.id
    WHERE al.id = p_ai_lenser_id
      AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
      AND o.revoked_at IS NULL
    LIMIT 1
  ),
  action_items AS (
    SELECT
      CASE
        WHEN l.action_type IN ('dispatch_schedule', 'schedule_skipped') THEN 'schedule_dispatch'
        ELSE 'agent_action'
      END AS kind,
      l.id::text AS id,
      l.occurred_at,
      COALESCE(l.action_type, 'agent_action') AS title,
      l.result,
      CASE WHEN l.metadata ? 'workflow_id' THEN (l.metadata ->> 'workflow_id')::uuid END AS workflow_id,
      NULL::text AS workflow_title,
      CASE WHEN l.metadata ? 'run_id' THEN (l.metadata ->> 'run_id')::uuid END AS run_id,
      CASE WHEN l.metadata ? 'schedule_id' THEN (l.metadata ->> 'schedule_id')::uuid END AS schedule_id,
      l.action_type,
      NULL::text AS event_type,
      l.metadata AS payload
    FROM agents.action_logs l
    JOIN authorized_agent aa ON aa.ai_lenser_id = l.ai_lenser_id
  ),
  run_items AS (
    SELECT
      'workflow_run'::text AS kind,
      r.id::text AS id,
      COALESCE(r.completed_at, r.started_at, r.created_at) AS occurred_at,
      r.status AS title,
      r.status AS result,
      w.id AS workflow_id,
      w.title AS workflow_title,
      r.id AS run_id,
      r.schedule_id,
      NULL::text AS action_type,
      NULL::text AS event_type,
      jsonb_build_object(
        'status', r.status,
        'trigger_mode', r.trigger_mode,
        'spent_credits', r.spent_credits
      ) AS payload
    FROM authorized_agent aa
    JOIN lenses.workflows w ON w.lenser_id = aa.profile_id
    JOIN lenses.workflow_runs r ON r.workflow_id = w.id
  ),
  event_items AS (
    SELECT
      'workflow_event'::text AS kind,
      concat(e.run_id::text, ':', e.event_id::text) AS id,
      e.created_at AS occurred_at,
      e.type AS title,
      NULL::text AS result,
      w.id AS workflow_id,
      w.title AS workflow_title,
      e.run_id AS run_id,
      r.schedule_id,
      NULL::text AS action_type,
      e.type AS event_type,
      COALESCE(e.payload, '{}'::jsonb) AS payload
    FROM authorized_agent aa
    JOIN lenses.workflows w ON w.lenser_id = aa.profile_id
    JOIN lenses.workflow_runs r ON r.workflow_id = w.id
    JOIN lenses.workflow_run_events e ON e.run_id = r.id
  )
  SELECT *
  FROM (
    SELECT * FROM action_items
    UNION ALL
    SELECT * FROM run_items
    UNION ALL
    SELECT * FROM event_items
  ) feed
  ORDER BY occurred_at DESC, id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 250)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_get_agent_automation_feed(uuid, integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_get_agent_automation_feed(uuid, integer, integer) IS
  'Owner-only unified automation feed for AI workspace panels. Unions agents.action_logs with workflow_runs and workflow_run_events for workflows owned by the AI lenser profile.';

GRANT EXECUTE ON FUNCTION public.fn_get_agent_automation_feed(uuid, integer, integer) TO authenticated, service_role;
