-- Security hardening: public SECURITY DEFINER wrappers for lenses and execution schemas.
--
-- Removes the need to expose `lenses` or `execution` schemas via PostgREST.
-- Covers: lensesRepository, executionRepository, workflowsRepository,
-- lenses-execute.route.ts, runs-get.route.ts, runs-sse.route.ts,
-- WorkflowRunMediaPage.tsx, schedule.ts CLI, scheduled-workflow-worker.ts,
-- and battle-worker.ts (fn_render_template).

-- ─── 1. fn_run_lens ──────────────────────────────────────────────────────────
-- Public wrapper for execution.fn_run_lens_api.
-- Used by platform-api lenses-execute.route.ts with user credentials.

CREATE OR REPLACE FUNCTION public.fn_run_lens(
  p_lens_id         uuid,
  p_version_id      uuid,
  p_model_id        uuid,
  p_inputs          jsonb DEFAULT '{}'::jsonb,
  p_funding_source  text  DEFAULT 'platform_credit',
  p_byok_key_id     uuid  DEFAULT NULL,
  p_idempotency_key text  DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'execution', 'lenses', 'lensers'
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  SELECT execution.fn_run_lens_api(
    p_lens_id, p_version_id, p_model_id, p_inputs,
    p_funding_source, p_byok_key_id, p_idempotency_key
  ) INTO v_run_id;
  RETURN v_run_id;
END;
$$;

ALTER FUNCTION public.fn_run_lens(uuid, uuid, uuid, jsonb, text, uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_run_lens(uuid, uuid, uuid, jsonb, text, uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_run_lens(uuid, uuid, uuid, jsonb, text, uuid, text) IS
  'Security wrapper: queue a lens execution. Delegates to execution.fn_run_lens_api.';

-- ─── 2. fn_get_run_details ────────────────────────────────────────────────────
-- Public wrapper for execution.fn_get_run_details.
-- Used by platform-api runs-get.route.ts with user credentials.

CREATE OR REPLACE FUNCTION public.fn_get_run_details(p_run_id uuid)
RETURNS TABLE(
  id             uuid,
  request_id     uuid,
  status         text,
  model_id       uuid,
  model_key      text,
  provider_key   text,
  started_at     timestamptz,
  completed_at   timestamptz,
  latency_ms     integer,
  token_input    integer,
  token_output   integer,
  credit_cost    bigint,
  billing_status text,
  error_code     text,
  error_message  text,
  artifacts      jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'execution', 'lensers'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM execution.fn_get_run_details(p_run_id);
END;
$$;

ALTER FUNCTION public.fn_get_run_details(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_run_details(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_run_details(uuid) IS
  'Security wrapper: get execution run details including aggregated artifacts. '
  'Delegates auth enforcement to execution.fn_get_run_details.';

-- ─── 3. fn_get_execution_artifacts ───────────────────────────────────────────
-- List individual artifact rows for a run (executionRepository.ts).
-- Auth guard: caller must be able to see the run via fn_get_run_details.

CREATE OR REPLACE FUNCTION public.fn_get_execution_artifacts(p_run_id uuid)
RETURNS TABLE(
  id                uuid,
  run_id            uuid,
  artifact_kind     text,
  content_text      text,
  content_json      jsonb,
  visibility        text,
  is_primary_output boolean,
  output_type       text,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'execution', 'lensers'
AS $$
  SELECT
    a.id, a.run_id, a.artifact_kind, a.content_text, a.content_json,
    a.visibility, a.is_primary_output, a.output_type, a.created_at
  FROM execution.artifacts a
  WHERE a.run_id = p_run_id
    AND EXISTS (
      SELECT 1 FROM execution.fn_get_run_details(p_run_id) LIMIT 1
    )
  ORDER BY a.is_primary_output DESC, a.created_at ASC;
$$;

ALTER FUNCTION public.fn_get_execution_artifacts(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_execution_artifacts(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_execution_artifacts(uuid) IS
  'Security wrapper: list artifacts for a run. Access gated via '
  'execution.fn_get_run_details — returns empty if caller cannot see the run.';

-- ─── 4. fn_list_my_private_lenses ────────────────────────────────────────────
-- List non-public lenses owned by the current user (lensesRepository.ts).
-- Public lenses are served by the vw_lenses_public view; this covers private/draft.

CREATE OR REPLACE FUNCTION public.fn_list_my_private_lenses(
  p_limit  integer     DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id                       uuid,
  lenser_id                uuid,
  visibility               text,
  parent_lens_id           uuid,
  forked_from_execution_id uuid,
  created_at               timestamptz,
  updated_at               timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    l.id, l.lenser_id, l.visibility, l.parent_lens_id,
    l.forked_from_execution_id, l.created_at, l.updated_at
  FROM lenses.lenses l
  WHERE l.lenser_id = lensers.get_auth_lenser_id()
    AND l.visibility <> 'public'
    AND (p_cursor IS NULL OR l.created_at < p_cursor)
  ORDER BY l.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_my_private_lenses(integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_my_private_lenses(integer, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_my_private_lenses(integer, timestamptz) IS
  'Security wrapper: list the current user''s non-public lenses (private/draft). '
  'Keyset-paginated by created_at DESC. Max 200 rows per call.';

-- ─── 5. fn_get_lens_version_detail ───────────────────────────────────────────
-- Get a specific lens version (lensesRepository.ts).
-- Owner sees any version; others see only published versions of public lenses.

CREATE OR REPLACE FUNCTION public.fn_get_lens_version_detail(p_version_id uuid)
RETURNS TABLE(
  id               uuid,
  lens_id          uuid,
  version_number   integer,
  status           text,
  template_body    text,
  changelog        text,
  parent_version_id uuid,
  published_at     timestamptz,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    v.id, v.lens_id, v.version_number, v.status::text,
    v.template_body, v.changelog, v.parent_version_id,
    v.published_at, v.created_at
  FROM lenses.versions v
  JOIN lenses.lenses l ON l.id = v.lens_id
  WHERE v.id = p_version_id
    AND (
      l.lenser_id = lensers.get_auth_lenser_id()
      OR (l.visibility = 'public' AND v.status = 'published')
    );
$$;

ALTER FUNCTION public.fn_get_lens_version_detail(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_version_detail(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lens_version_detail(uuid) IS
  'Security wrapper: get a lens version. Owner sees any status; '
  'others see only published versions of public lenses.';

-- ─── 6. fn_list_lens_versions ────────────────────────────────────────────────
-- List versions for a lens (lensesRepository.ts).
-- Respects same access rules as fn_get_lens_version_detail.

CREATE OR REPLACE FUNCTION public.fn_list_lens_versions(
  p_lens_id         uuid,
  p_include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id              uuid,
  lens_id         uuid,
  version_number  integer,
  status          text,
  changelog       text,
  parameter_count integer,
  published_at    timestamptz,
  created_at      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    v.id, v.lens_id, v.version_number, v.status::text,
    v.changelog, v.parameter_count, v.published_at, v.created_at
  FROM lenses.vw_lens_version_history v
  JOIN lenses.lenses l ON l.id = v.lens_id
  WHERE v.lens_id = p_lens_id
    AND (
      l.lenser_id = lensers.get_auth_lenser_id()
      OR (l.visibility = 'public' AND v.status = 'published')
    )
    AND (p_include_archived OR v.status <> 'archived')
  ORDER BY v.version_number DESC;
$$;

ALTER FUNCTION public.fn_list_lens_versions(uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_lens_versions(uuid, boolean)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_list_lens_versions(uuid, boolean) IS
  'Security wrapper: list versions for a lens. Owner sees all (optionally archived); '
  'others see published versions of public lenses only.';

-- ─── 7. fn_get_lens_fork_tree ────────────────────────────────────────────────
-- Return fork ancestry for a lens as an ordered jsonb array (lensesRepository.ts).
-- Returns: [{lens_id, parent_lens_id, depth, ...}] ordered by depth ASC.

CREATE OR REPLACE FUNCTION public.fn_get_lens_fork_tree(p_lens_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT COALESCE(
    jsonb_agg(to_jsonb(f.*) ORDER BY f.depth ASC),
    '[]'::jsonb
  )
  FROM lenses.vw_fork_history f
  WHERE f.lens_id = p_lens_id;
$$;

ALTER FUNCTION public.fn_get_lens_fork_tree(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_fork_tree(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lens_fork_tree(uuid) IS
  'Security wrapper: return the fork ancestry chain for a lens as a jsonb array '
  'ordered by depth ascending.';

-- ─── 8. fn_get_lens_version_parameters ───────────────────────────────────────
-- Return parameters for a lens version (lensesRepository.ts).

CREATE OR REPLACE FUNCTION public.fn_get_lens_version_parameters(p_version_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT COALESCE(
    jsonb_agg(to_jsonb(vp.*) ORDER BY vp.label ASC),
    '[]'::jsonb
  )
  FROM lenses.version_parameters vp
  JOIN lenses.versions v   ON v.id = vp.version_id
  JOIN lenses.lenses   l   ON l.id = v.lens_id
  WHERE vp.version_id = p_version_id
    AND (
      l.lenser_id = lensers.get_auth_lenser_id()
      OR (l.visibility = 'public' AND v.status = 'published')
    );
$$;

ALTER FUNCTION public.fn_get_lens_version_parameters(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_version_parameters(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lens_version_parameters(uuid) IS
  'Security wrapper: return the parameter definitions for a lens version '
  'as a jsonb array ordered by label.';

-- ─── 9. fn_get_workflow_run_media_manifest ────────────────────────────────────
-- Get media_manifest from a workflow run (WorkflowRunMediaPage.tsx).

CREATE OR REPLACE FUNCTION public.fn_get_workflow_run_media_manifest(p_run_id uuid)
RETURNS TABLE(media_manifest jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT wr.media_manifest
  FROM lenses.workflow_runs wr
  WHERE wr.id = p_run_id
    AND wr.triggered_by = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_get_workflow_run_media_manifest(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_run_media_manifest(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_workflow_run_media_manifest(uuid) IS
  'Security wrapper: get the media_manifest jsonb array for a workflow run '
  'owned by the current user.';

-- ─── 10. fn_toggle_workflow_schedule ─────────────────────────────────────────
-- Pause or resume a workflow schedule.
-- Replaces PATCH callRest('lenses', 'workflow_schedules', ...) in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_toggle_workflow_schedule(
  p_schedule_id uuid,
  p_is_active   boolean
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  UPDATE lenses.workflow_schedules
  SET    is_active  = p_is_active
  WHERE  id        = p_schedule_id
    AND  workflow_id IN (
      SELECT w.id FROM lenses.workflows w
      WHERE w.lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_toggle_workflow_schedule(uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_toggle_workflow_schedule(uuid, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_toggle_workflow_schedule(uuid, boolean) IS
  'Security wrapper: toggle is_active on a workflow schedule owned by the current user.';

-- ─── 11. fn_delete_workflow_schedule ─────────────────────────────────────────
-- Delete a workflow schedule.
-- Replaces DELETE callRest('lenses', 'workflow_schedules', ...) in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_delete_workflow_schedule(p_schedule_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  DELETE FROM lenses.workflow_schedules
  WHERE id        = p_schedule_id
    AND workflow_id IN (
      SELECT w.id FROM lenses.workflows w
      WHERE w.lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_delete_workflow_schedule(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_workflow_schedule(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_delete_workflow_schedule(uuid) IS
  'Security wrapper: delete a workflow schedule owned by the current user. '
  'Silently no-ops if not found or not owned by caller.';

-- ─── 12. fn_set_schedule_calendar ────────────────────────────────────────────
-- Assign a calendar to a workflow schedule.
-- Replaces PATCH { calendar_id } callRest in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_set_schedule_calendar(
  p_schedule_id uuid,
  p_calendar_id uuid
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  UPDATE lenses.workflow_schedules
  SET    calendar_id = p_calendar_id
  WHERE  id        = p_schedule_id
    AND  workflow_id IN (
      SELECT w.id FROM lenses.workflows w
      WHERE w.lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_set_schedule_calendar(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_set_schedule_calendar(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_set_schedule_calendar(uuid, uuid) IS
  'Security wrapper: assign a calendar to a workflow schedule owned by the current user.';

-- ─── 13. fn_set_schedule_condition ───────────────────────────────────────────
-- Update pre_dispatch_condition on a workflow schedule.
-- Replaces PATCH { pre_dispatch_condition } callRest in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_set_schedule_condition(
  p_schedule_id uuid,
  p_condition   jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  UPDATE lenses.workflow_schedules
  SET    pre_dispatch_condition = p_condition
  WHERE  id        = p_schedule_id
    AND  workflow_id IN (
      SELECT w.id FROM lenses.workflows w
      WHERE w.lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_set_schedule_condition(uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_set_schedule_condition(uuid, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_set_schedule_condition(uuid, jsonb) IS
  'Security wrapper: update pre_dispatch_condition on a workflow schedule.';

-- ─── 14. fn_set_schedule_inputs_rotation ─────────────────────────────────────
-- Replace inputs_rotation on a workflow schedule.
-- Replaces PATCH { inputs_rotation } callRest in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_set_schedule_inputs_rotation(
  p_schedule_id uuid,
  p_rotation    jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  UPDATE lenses.workflow_schedules
  SET    inputs_rotation = p_rotation
  WHERE  id        = p_schedule_id
    AND  workflow_id IN (
      SELECT w.id FROM lenses.workflows w
      WHERE w.lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_set_schedule_inputs_rotation(uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_set_schedule_inputs_rotation(uuid, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_set_schedule_inputs_rotation(uuid, jsonb) IS
  'Security wrapper: replace inputs_rotation on a workflow schedule.';

-- ─── 15. fn_create_schedule_calendar ─────────────────────────────────────────
-- Create a schedule calendar for the current user.
-- Replaces POST callRest('lenses', 'schedule_calendars', ...) in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_create_schedule_calendar(
  p_name     text,
  p_kind     text,
  p_dates    date[]  DEFAULT ARRAY[]::date[],
  p_timezone text    DEFAULT 'UTC'
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  INSERT INTO lenses.schedule_calendars
    (lenser_id, name, kind, dates, timezone, is_seed)
  VALUES
    (lensers.get_auth_lenser_id(), p_name, p_kind, p_dates, p_timezone, false)
  RETURNING id;
$$;

ALTER FUNCTION public.fn_create_schedule_calendar(text, text, date[], text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_schedule_calendar(text, text, date[], text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_schedule_calendar(text, text, date[], text) IS
  'Security wrapper: create a schedule calendar owned by the current user. '
  'lenser_id is derived from the session — callers cannot supply it.';

-- ─── 16. fn_get_schedule_calendars ───────────────────────────────────────────
-- List schedule calendars for the current user.
-- Replaces GET callRest('lenses', 'schedule_calendars', ...) in schedule.ts CLI.

CREATE OR REPLACE FUNCTION public.fn_get_schedule_calendars()
RETURNS TABLE(
  id         uuid,
  lenser_id  uuid,
  name       text,
  kind       text,
  dates      date[],
  timezone   text,
  is_seed    boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT sc.id, sc.lenser_id, sc.name, sc.kind, sc.dates,
         sc.timezone, sc.is_seed, sc.created_at
  FROM lenses.schedule_calendars sc
  WHERE sc.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY sc.created_at DESC;
$$;

ALTER FUNCTION public.fn_get_schedule_calendars() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_schedule_calendars()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_schedule_calendars() IS
  'Security wrapper: list all schedule calendars owned by the current user.';

-- ─── 17. fn_get_schedule_run_history ─────────────────────────────────────────
-- Paginated workflow run history for a schedule (schedule.ts CLI history view).
-- Replaces direct GET on lenses.workflow_runs.

CREATE OR REPLACE FUNCTION public.fn_get_schedule_run_history(
  p_workflow_id uuid,
  p_limit       integer     DEFAULT 20,
  p_cursor      timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id           uuid,
  workflow_id  uuid,
  schedule_id  uuid,
  status       text,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    wr.id, wr.workflow_id, wr.schedule_id, wr.status,
    wr.started_at, wr.completed_at, wr.created_at
  FROM lenses.workflow_runs wr
  JOIN lenses.lenses l ON l.id = wr.workflow_id
  WHERE wr.workflow_id = p_workflow_id
    AND l.lenser_id = lensers.get_auth_lenser_id()
    AND (p_cursor IS NULL OR wr.created_at < p_cursor)
  ORDER BY wr.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.fn_get_schedule_run_history(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_schedule_run_history(uuid, integer, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_schedule_run_history(uuid, integer, timestamptz) IS
  'Security wrapper: keyset-paginated run history for a workflow owned by the current user. '
  'Max 100 rows per call.';

-- ─── WORKER-ONLY RPCs ─────────────────────────────────────────────────────────
-- All functions below are SECURITY DEFINER with REVOKE FROM PUBLIC.
-- Called exclusively from platform-api workers using the service_role key.

-- ─── 18. fn_worker_render_template ───────────────────────────────────────────
-- Public wrapper for lenses.fn_render_template.
-- Replaces .schema('lenses').rpc('fn_render_template') in:
--   - apps/platform-api/src/worker/battle-worker.ts
--   - apps/platform-api/src/worker/scheduled-workflow-worker.ts

CREATE OR REPLACE FUNCTION public.fn_worker_render_template(
  p_version_id uuid,
  p_inputs     jsonb DEFAULT '{}'::jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
DECLARE
  v_result text;
BEGIN
  SELECT lenses.fn_render_template(p_version_id, p_inputs) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_worker_render_template(uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_render_template(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_render_template(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.fn_worker_render_template(uuid, jsonb) IS
  'Worker-only: render a lens version template with the supplied inputs. '
  'Delegates to lenses.fn_render_template.';

-- ─── 19. fn_worker_claim_scheduled_workflow_run ───────────────────────────────
-- Public wrapper for lenses.fn_claim_scheduled_workflow_run.
-- Replaces .schema('lenses').rpc('fn_claim_scheduled_workflow_run') in
-- scheduled-workflow-worker.ts.

CREATE OR REPLACE FUNCTION public.fn_worker_claim_scheduled_workflow_run(p_worker_id text)
RETURNS TABLE(
  run_id       uuid,
  workflow_id  uuid,
  schedule_id  uuid,
  inputs       jsonb,
  model_id     uuid,
  ai_lenser_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM lenses.fn_claim_scheduled_workflow_run(p_worker_id);
END;
$$;

ALTER FUNCTION public.fn_worker_claim_scheduled_workflow_run(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_claim_scheduled_workflow_run(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_claim_scheduled_workflow_run(text) TO service_role;

COMMENT ON FUNCTION public.fn_worker_claim_scheduled_workflow_run(text) IS
  'Worker-only: claim the next pending scheduled workflow run. '
  'Delegates to lenses.fn_claim_scheduled_workflow_run.';

-- ─── 20. fn_worker_get_workflow_context ──────────────────────────────────────
-- Get context for a workflow run (scheduled-workflow-worker.ts).
-- Returns workflow_id and triggered_by (lenser_id) for the run.

CREATE OR REPLACE FUNCTION public.fn_worker_get_workflow_context(p_run_id uuid)
RETURNS TABLE(
  workflow_id  uuid,
  triggered_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT wr.workflow_id, wr.triggered_by
  FROM lenses.workflow_runs wr
  WHERE wr.id = p_run_id;
$$;

ALTER FUNCTION public.fn_worker_get_workflow_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_workflow_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_workflow_context(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_workflow_context(uuid) IS
  'Worker-only: return workflow_id and triggered_by for a workflow run.';

-- ─── 21. fn_worker_get_workflow_graph ────────────────────────────────────────
-- Get nodes and edges for a workflow in one round-trip (scheduled-workflow-worker.ts).
-- Replaces two separate .schema('lenses').from('workflow_nodes/edges') calls.
-- Returns: { "nodes": [...], "edges": [...] }

CREATE OR REPLACE FUNCTION public.fn_worker_get_workflow_graph(p_workflow_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT jsonb_build_object(
    'nodes', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id',         n.id,
           'lens_id',    n.lens_id,
           'version_id', n.version_id,
           'config',     n.config
         ) ORDER BY n.ordinal
       )
       FROM lenses.workflow_nodes n
       WHERE n.workflow_id = p_workflow_id
      ), '[]'::jsonb
    ),
    'edges', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id',                e.id,
           'source_node_id',    e.source_node_id,
           'target_node_id',    e.target_node_id,
           'source_output_key', e.source_output_key,
           'target_param_label',e.target_param_label
         )
       )
       FROM lenses.workflow_edges e
       WHERE e.workflow_id = p_workflow_id
      ), '[]'::jsonb
    )
  );
$$;

ALTER FUNCTION public.fn_worker_get_workflow_graph(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_workflow_graph(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_workflow_graph(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_workflow_graph(uuid) IS
  'Worker-only: return workflow nodes and edges as { nodes: [...], edges: [...] }. '
  'Reduces two round-trips to one.';

-- ─── 22. fn_worker_upsert_node_result ────────────────────────────────────────
-- Upsert a workflow node execution result (scheduled-workflow-worker.ts).
-- Replaces direct .schema('lenses').from('workflow_node_results').upsert().

CREATE OR REPLACE FUNCTION public.fn_worker_upsert_node_result(
  p_run_id        uuid,
  p_node_id       uuid,
  p_status        text,
  p_output_data   jsonb DEFAULT NULL,
  p_error_message text  DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
DECLARE
  v_terminal text[] := ARRAY['completed', 'failed', 'timed_out', 'cancelled'];
BEGIN
  INSERT INTO lenses.workflow_node_results
    (run_id, node_id, status, output_data, error_message, started_at, completed_at)
  VALUES (
    p_run_id, p_node_id, p_status, p_output_data, p_error_message,
    CASE WHEN p_status = 'running' THEN now() ELSE NULL END,
    CASE WHEN p_status = ANY(v_terminal) THEN now() ELSE NULL END
  )
  ON CONFLICT (run_id, node_id) DO UPDATE
    SET status        = EXCLUDED.status,
        output_data   = COALESCE(EXCLUDED.output_data,   lenses.workflow_node_results.output_data),
        error_message = COALESCE(EXCLUDED.error_message, lenses.workflow_node_results.error_message),
        started_at    = COALESCE(lenses.workflow_node_results.started_at, EXCLUDED.started_at),
        completed_at  = CASE
          WHEN EXCLUDED.status = ANY(v_terminal) THEN now()
          ELSE lenses.workflow_node_results.completed_at
        END;
END;
$$;

ALTER FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text)
  TO service_role;

COMMENT ON FUNCTION public.fn_worker_upsert_node_result(uuid, uuid, text, jsonb, text) IS
  'Worker-only: upsert a workflow node execution result. '
  'Sets started_at on first "running" write; sets completed_at on terminal status. '
  'Preserves existing output_data/error_message if new value is NULL.';

-- ─── 23. fn_worker_insert_workflow_media_object ───────────────────────────────
-- Insert a media object produced by a workflow node (scheduled-workflow-worker.ts).
-- Replaces direct .schema('media').from('objects').insert().

CREATE OR REPLACE FUNCTION public.fn_worker_insert_workflow_media_object(
  p_workspace_id    uuid,
  p_owner_lenser_id uuid,
  p_run_id          uuid,
  p_node_id         uuid,
  p_external_url    text,
  p_mime_type       text,
  p_media_type      text,
  p_name            text
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'media'
AS $$
  INSERT INTO media.objects
    (workspace_id, owner_lenser_id, external_url, mime_type, media_type,
     name, visibility, lifecycle_state, metadata)
  VALUES (
    p_workspace_id, p_owner_lenser_id, p_external_url, p_mime_type, p_media_type,
    p_name, 'private', 'active',
    jsonb_build_object('workflow_run_id', p_run_id, 'node_id', p_node_id)
  )
  RETURNING id;
$$;

ALTER FUNCTION public.fn_worker_insert_workflow_media_object(uuid, uuid, uuid, uuid, text, text, text, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_insert_workflow_media_object(uuid, uuid, uuid, uuid, text, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_insert_workflow_media_object(uuid, uuid, uuid, uuid, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.fn_worker_insert_workflow_media_object(uuid, uuid, uuid, uuid, text, text, text, text) IS
  'Worker-only: insert a media.objects row for output produced by a workflow node. '
  'Tags the object with workflow_run_id and node_id in metadata.';
