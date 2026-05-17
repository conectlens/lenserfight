-- Artifact Lifecycle Governance
--
-- Adds GitHub-style lifecycle controls for Lens, Workflow, Battle, and Agent.
-- The migration reuses existing version, event, reaction, and execution tables.

-- ── 1. Minimal lifecycle and snapshot columns ────────────────────────────────

ALTER TABLE lenses.lenses
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

ALTER TABLE lenses.workflows
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE agents.ai_lensers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

ALTER TABLE lenses.workflow_versions
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT;

ALTER TABLE lenses.workflow_versions
  DROP CONSTRAINT IF EXISTS workflow_versions_status_check;

ALTER TABLE lenses.workflow_versions
  ADD CONSTRAINT workflow_versions_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'snapshot'::text]));

ALTER TABLE lenses.workflow_version_nodes
  ADD COLUMN IF NOT EXISTS source_node_id UUID;

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS workflow_version_id UUID,
  ADD COLUMN IF NOT EXISTS workflow_snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot_hash TEXT;

ALTER TABLE lenses.workflow_node_results
  ADD COLUMN IF NOT EXISTS workflow_version_node_id UUID,
  ADD COLUMN IF NOT EXISTS resolved_lens_version_id UUID,
  ADD COLUMN IF NOT EXISTS node_snapshot_hash TEXT;

ALTER TABLE agents.team_runs
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot_hash TEXT;

ALTER TABLE battles.contender_entity_map
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot_hash TEXT;

ALTER TABLE battles.battle_execution_jobs
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS redacted_agent_snapshot_hash TEXT;

ALTER TABLE execution.requests
  ADD COLUMN IF NOT EXISTS resolved_artifact_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS resolved_artifact_snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS lens_content_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_runs_workflow_version_id_fkey'
      AND conrelid = 'lenses.workflow_runs'::regclass
  ) THEN
    ALTER TABLE lenses.workflow_runs
      ADD CONSTRAINT workflow_runs_workflow_version_id_fkey
      FOREIGN KEY (workflow_version_id)
      REFERENCES lenses.workflow_versions(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_node_results_workflow_version_node_id_fkey'
      AND conrelid = 'lenses.workflow_node_results'::regclass
  ) THEN
    ALTER TABLE lenses.workflow_node_results
      ADD CONSTRAINT workflow_node_results_workflow_version_node_id_fkey
      FOREIGN KEY (workflow_version_node_id)
      REFERENCES lenses.workflow_version_nodes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_node_results_resolved_lens_version_id_fkey'
      AND conrelid = 'lenses.workflow_node_results'::regclass
  ) THEN
    ALTER TABLE lenses.workflow_node_results
      ADD CONSTRAINT workflow_node_results_resolved_lens_version_id_fkey
      FOREIGN KEY (resolved_lens_version_id)
      REFERENCES lenses.versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TYPE content.entity_type_enum ADD VALUE IF NOT EXISTS 'agent';

CREATE INDEX IF NOT EXISTS idx_lenses_lifecycle_owner
  ON lenses.lenses (lenser_id, status, visibility, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_workflows_lifecycle_owner
  ON lenses.workflows (lenser_id, visibility, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_battles_lifecycle_creator
  ON battles.battles (creator_lenser_id, status, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_agents_lifecycle_profile
  ON agents.ai_lensers (profile_id, is_active, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_version_snapshot
  ON lenses.workflow_runs (workflow_id, workflow_version_id, workflow_snapshot_hash);

CREATE INDEX IF NOT EXISTS idx_workflow_node_results_version_node
  ON lenses.workflow_node_results (workflow_version_node_id);

CREATE INDEX IF NOT EXISTS idx_execution_requests_lens_snapshot
  ON execution.requests (lens_id, version_id, resolved_artifact_snapshot_hash);

CREATE INDEX IF NOT EXISTS idx_team_runs_agent_snapshot
  ON agents.team_runs (ai_lenser_id, redacted_agent_snapshot_hash);

CREATE INDEX IF NOT EXISTS idx_battle_entity_map_agent_snapshot
  ON battles.contender_entity_map (ai_lenser_id, redacted_agent_snapshot_hash);

COMMENT ON COLUMN lenses.workflow_runs.workflow_version_id IS
  'Immutable workflow version snapshot bound at run start.';
COMMENT ON COLUMN lenses.workflow_runs.workflow_snapshot_hash IS
  'SHA-256 hash of the workflow DAG snapshot used by this run.';
COMMENT ON COLUMN execution.requests.resolved_artifact_snapshot IS
  'Redacted execution-time artifact binding. For lenses, stores lens_id/version_id/content_hash only.';

-- ── 2. Shared lifecycle helpers ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_log_artifact_lifecycle_event(
  p_artifact_type TEXT,
  p_artifact_id   UUID,
  p_action        TEXT,
  p_actor_id      UUID,
  p_payload       JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, audit, battles
AS $$
BEGIN
  INSERT INTO audit.events (
    event_type,
    entity_schema,
    entity_table,
    entity_id,
    actor_type,
    actor_id,
    actor_lenser_id,
    payload,
    severity
  ) VALUES (
    'artifact.' || p_action,
    CASE p_artifact_type
      WHEN 'lens' THEN 'lenses'
      WHEN 'workflow' THEN 'lenses'
      WHEN 'battle' THEN 'battles'
      WHEN 'agent' THEN 'agents'
      ELSE 'public'
    END,
    CASE p_artifact_type
      WHEN 'lens' THEN 'lenses'
      WHEN 'workflow' THEN 'workflows'
      WHEN 'battle' THEN 'battles'
      WHEN 'agent' THEN 'ai_lensers'
      ELSE p_artifact_type
    END,
    p_artifact_id,
    CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'lenser' END,
    p_actor_id,
    p_actor_id,
    COALESCE(p_payload, '{}'::jsonb),
    'info'
  );
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lifecycle_is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), auth.role(), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_can_manage(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers
AS $$
DECLARE
  v_type  TEXT := lower(trim(p_artifact_type));
  v_actor UUID := lensers.get_auth_lenser_id();
BEGIN
  IF public.fn_lifecycle_is_service_role() THEN
    RETURN TRUE;
  END IF;

  IF v_actor IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_type IN ('lens', 'lenses') THEN
    RETURN EXISTS (
      SELECT 1 FROM lenses.lenses l
      WHERE l.id = p_artifact_id AND l.lenser_id = v_actor
    );
  ELSIF v_type IN ('workflow', 'workflows') THEN
    RETURN EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = p_artifact_id AND w.lenser_id = v_actor
    );
  ELSIF v_type IN ('battle', 'battles') THEN
    RETURN EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = p_artifact_id AND b.creator_lenser_id = v_actor
    );
  ELSIF v_type IN ('agent', 'ai_lenser', 'ai_lenser_id', 'lenser') THEN
    RETURN agents.can_manage_ai_lenser(p_artifact_id);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_can_view(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers, content
AS $$
DECLARE
  v_type TEXT := lower(trim(p_artifact_type));
BEGIN
  IF public.fn_lifecycle_is_service_role()
     OR public.fn_artifact_can_manage(v_type, p_artifact_id) THEN
    RETURN TRUE;
  END IF;

  IF v_type IN ('lens', 'lenses') THEN
    RETURN EXISTS (
      SELECT 1
      FROM lenses.lenses l
      JOIN lensers.profiles p ON p.id = l.lenser_id
      WHERE l.id = p_artifact_id
        AND l.visibility IN ('public'::content.visibility_enum, 'community'::content.visibility_enum)
        AND l.status = 'published'::content.content_status
        AND l.deleted_at IS NULL
        AND p.status = 'active'::lensers.lenser_status
    );
  ELSIF v_type IN ('workflow', 'workflows') THEN
    RETURN EXISTS (
      SELECT 1
      FROM lenses.workflows w
      JOIN lensers.profiles p ON p.id = w.lenser_id
      WHERE w.id = p_artifact_id
        AND w.visibility = 'public'
        AND w.deleted_at IS NULL
        AND p.status = 'active'::lensers.lenser_status
    );
  ELSIF v_type IN ('battle', 'battles') THEN
    RETURN EXISTS (
      SELECT 1
      FROM battles.battles b
      WHERE b.id = p_artifact_id
        AND b.deleted_at IS NULL
        AND b.status IN (
          'open'::battles.battle_status_enum,
          'executing'::battles.battle_status_enum,
          'voting'::battles.battle_status_enum,
          'scoring'::battles.battle_status_enum,
          'closed'::battles.battle_status_enum,
          'published'::battles.battle_status_enum,
          'archived'::battles.battle_status_enum
        )
    );
  ELSIF v_type IN ('agent', 'ai_lenser', 'ai_lenser_id', 'lenser') THEN
    RETURN EXISTS (
      SELECT 1
      FROM agents.ai_lensers al
      WHERE al.id = p_artifact_id
        AND al.is_active = TRUE
        AND al.suspended_at IS NULL
        AND al.deleted_at IS NULL
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_dependency_summary(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, execution, content
AS $$
DECLARE
  v_type    TEXT := lower(trim(p_artifact_type));
  v_counts  JSONB := '{}'::jsonb;
  v_total   INTEGER := 0;
  v_count   INTEGER := 0;
  v_reasons TEXT[] := '{}';
BEGIN
  IF v_type IN ('lens', 'lenses') THEN
    SELECT count(*)::int INTO v_count
    FROM execution.requests r
    WHERE r.lens_id = p_artifact_id
       OR r.version_id IN (SELECT v.id FROM lenses.versions v WHERE v.lens_id = p_artifact_id);
    v_counts := v_counts || jsonb_build_object('executions', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s execution requests', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM lenses.workflow_nodes WHERE lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('workflow_nodes', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s workflow nodes', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM lenses.workflow_version_nodes WHERE lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('workflow_version_nodes', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s workflow version nodes', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.battles WHERE lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('battles', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s battles', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.contender_lens_assignments WHERE lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('battle_lens_assignments', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s battle lens assignments', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.generated_challenges
    WHERE generator_lens_id = p_artifact_id
       OR generator_version_id IN (SELECT v.id FROM lenses.versions v WHERE v.lens_id = p_artifact_id);
    v_counts := v_counts || jsonb_build_object('generated_challenges', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s generated challenges', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.lens_bindings WHERE lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('agent_lens_bindings', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s agent lens bindings', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM lenses.lenses WHERE parent_lens_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('forks', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s forks', v_count); END IF;

    SELECT count(*)::int INTO v_count
    FROM lenses.versions
    WHERE lens_id = p_artifact_id AND status = 'published'::content.content_status;
    v_counts := v_counts || jsonb_build_object('published_versions', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s published versions', v_count); END IF;

  ELSIF v_type IN ('workflow', 'workflows') THEN
    SELECT count(*)::int INTO v_count FROM lenses.workflow_runs WHERE workflow_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('workflow_runs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s workflow runs', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.battles WHERE workflow_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('battles', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s battles', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.submissions WHERE workflow_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('battle_submissions', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s battle submissions', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.team_runs WHERE workflow_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('agent_team_runs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s agent team runs', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM lenses.workflows WHERE parent_workflow_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('forks', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s forks', v_count); END IF;

  ELSIF v_type IN ('battle', 'battles') THEN
    SELECT count(*)::int INTO v_count FROM battles.submissions WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('submissions', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s submissions', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.votes WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('votes', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s votes', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.contender_runs WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('contender_runs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s contender runs', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.battle_execution_jobs WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('execution_jobs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s execution jobs', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.rule_snapshots WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('rule_snapshots', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s rule snapshots', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM battles.generated_challenges WHERE battle_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('generated_challenges', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s generated challenges', v_count); END IF;

    SELECT count(*)::int INTO v_count
    FROM battles.battles
    WHERE id = p_artifact_id AND status <> 'draft'::battles.battle_status_enum;
    v_counts := v_counts || jsonb_build_object('started_or_public_state', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || 'battle has started or been published'; END IF;

  ELSIF v_type IN ('agent', 'ai_lenser', 'ai_lenser_id', 'lenser') THEN
    SELECT count(*)::int INTO v_count FROM battles.contender_entity_map WHERE ai_lenser_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('battle_contenders', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s battle contender slots', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.team_runs WHERE ai_lenser_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('team_runs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s team runs', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.run_reports WHERE ai_lenser_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('run_reports', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s run reports', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.policy_evaluations WHERE ai_lenser_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('policy_evaluations', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s policy evaluations', v_count); END IF;

    SELECT count(*)::int INTO v_count FROM agents.action_logs WHERE ai_lenser_id = p_artifact_id;
    v_counts := v_counts || jsonb_build_object('action_logs', v_count);
    IF v_count > 0 THEN v_total := v_total + v_count; v_reasons := v_reasons || format('%s action logs', v_count); END IF;
  ELSE
    RAISE EXCEPTION 'unsupported_artifact_type: %', p_artifact_type USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'artifact_type', v_type,
    'artifact_id', p_artifact_id,
    'counts', v_counts,
    'total', v_total,
    'blocking_reasons', to_jsonb(v_reasons),
    'has_dependencies', v_total > 0,
    'can_hard_delete', v_total = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_lifecycle_status(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers, content
AS $$
DECLARE
  v_type       TEXT := lower(trim(p_artifact_type));
  v_actor      UUID := lensers.get_auth_lenser_id();
  v_dependency JSONB;
  v_pinned     BOOLEAN := FALSE;
  v_status     JSONB;
BEGIN
  IF v_type IN ('lenses') THEN v_type := 'lens'; END IF;
  IF v_type IN ('workflows') THEN v_type := 'workflow'; END IF;
  IF v_type IN ('battles') THEN v_type := 'battle'; END IF;
  IF v_type IN ('ai_lenser', 'ai_lenser_id', 'lenser') THEN v_type := 'agent'; END IF;

  IF NOT public.fn_artifact_can_view(v_type, p_artifact_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  v_dependency := public.fn_artifact_dependency_summary(v_type, p_artifact_id);

  IF v_actor IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM content.reactions r
      WHERE r.entity_type = v_type::content.entity_type_enum
        AND r.entity_id = p_artifact_id
        AND r.lenser_id = v_actor
        AND r.reaction = 'saved'::content.reaction_enum
    ) INTO v_pinned;
  END IF;

  IF v_type = 'lens' THEN
    SELECT jsonb_build_object(
      'artifact_type', 'lens',
      'artifact_id', l.id,
      'state', CASE
        WHEN l.deleted_at IS NOT NULL THEN 'deleted'
        WHEN l.archived_at IS NOT NULL OR l.status = 'archived'::content.content_status THEN 'archived'
        ELSE l.status::text
      END,
      'visibility', l.visibility::text,
      'archived_at', l.archived_at,
      'deleted_at', l.deleted_at,
      'pinned', v_pinned,
      'version_id', l.head_version_id,
      'snapshot_hash', encode(v.content_hash, 'hex'),
      'dependency_summary', v_dependency
    )
    INTO v_status
    FROM lenses.lenses l
    LEFT JOIN lenses.versions v ON v.id = l.head_version_id
    WHERE l.id = p_artifact_id;
  ELSIF v_type = 'workflow' THEN
    SELECT jsonb_build_object(
      'artifact_type', 'workflow',
      'artifact_id', w.id,
      'state', CASE
        WHEN w.deleted_at IS NOT NULL THEN 'deleted'
        WHEN w.archived_at IS NOT NULL THEN 'archived'
        ELSE 'active'
      END,
      'visibility', w.visibility,
      'archived_at', w.archived_at,
      'deleted_at', w.deleted_at,
      'pinned', v_pinned,
      'version_id', w.head_version_id,
      'snapshot_hash', wv.snapshot_hash,
      'dependency_summary', v_dependency
    )
    INTO v_status
    FROM lenses.workflows w
    LEFT JOIN lenses.workflow_versions wv ON wv.id = w.head_version_id
    WHERE w.id = p_artifact_id;
  ELSIF v_type = 'battle' THEN
    SELECT jsonb_build_object(
      'artifact_type', 'battle',
      'artifact_id', b.id,
      'state', CASE
        WHEN b.deleted_at IS NOT NULL THEN 'deleted'
        WHEN b.archived_at IS NOT NULL OR b.status = 'archived'::battles.battle_status_enum THEN 'archived'
        ELSE b.status::text
      END,
      'visibility', CASE WHEN b.deleted_at IS NULL THEN 'historical' ELSE 'tombstone' END,
      'archived_at', b.archived_at,
      'deleted_at', b.deleted_at,
      'pinned', v_pinned,
      'version_id', NULL,
      'snapshot_hash', rs.snapshot_hash,
      'dependency_summary', v_dependency
    )
    INTO v_status
    FROM battles.battles b
    LEFT JOIN LATERAL (
      SELECT snapshot_hash
      FROM battles.rule_snapshots
      WHERE battle_id = b.id
      ORDER BY created_at DESC
      LIMIT 1
    ) rs ON TRUE
    WHERE b.id = p_artifact_id;
  ELSIF v_type = 'agent' THEN
    SELECT jsonb_build_object(
      'artifact_type', 'agent',
      'artifact_id', al.id,
      'state', CASE
        WHEN al.deleted_at IS NOT NULL THEN 'deleted'
        WHEN al.archived_at IS NOT NULL THEN 'archived'
        WHEN al.is_active AND al.suspended_at IS NULL THEN 'active'
        WHEN al.suspended_at IS NOT NULL THEN 'suspended'
        ELSE 'inactive'
      END,
      'visibility', CASE WHEN al.is_active AND al.suspended_at IS NULL THEN 'public' ELSE 'restricted' END,
      'archived_at', al.archived_at,
      'deleted_at', al.deleted_at,
      'pinned', v_pinned,
      'version_id', NULL,
      'snapshot_hash', NULL,
      'dependency_summary', v_dependency
    )
    INTO v_status
    FROM agents.ai_lensers al
    WHERE al.id = p_artifact_id;
  END IF;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_pin(
  p_artifact_type TEXT,
  p_artifact_id   UUID,
  p_pin           BOOLEAN DEFAULT TRUE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, content, lensers
AS $$
DECLARE
  v_actor UUID := lensers.get_auth_lenser_id();
  v_type  TEXT := lower(trim(p_artifact_type));
  v_entity content.entity_type_enum;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF v_type IN ('lenses') THEN v_type := 'lens'; END IF;
  IF v_type IN ('workflows') THEN v_type := 'workflow'; END IF;
  IF v_type IN ('battles') THEN v_type := 'battle'; END IF;
  IF v_type IN ('ai_lenser', 'ai_lenser_id', 'lenser') THEN v_type := 'agent'; END IF;

  IF v_type NOT IN ('lens', 'workflow', 'battle', 'agent') THEN
    RAISE EXCEPTION 'unsupported_artifact_type: %', p_artifact_type USING ERRCODE = '22023';
  END IF;

  IF NOT public.fn_artifact_can_view(v_type, p_artifact_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  v_entity := v_type::content.entity_type_enum;

  IF p_pin THEN
    INSERT INTO content.reactions (entity_type, entity_id, lenser_id, reaction)
    VALUES (v_entity, p_artifact_id, v_actor, 'saved'::content.reaction_enum)
    ON CONFLICT (entity_type, entity_id, lenser_id, reaction) DO NOTHING;
    PERFORM public.fn_log_artifact_lifecycle_event(v_type, p_artifact_id, 'pin', v_actor, '{}'::jsonb);
  ELSE
    DELETE FROM content.reactions
    WHERE entity_type = v_entity
      AND entity_id = p_artifact_id
      AND lenser_id = v_actor
      AND reaction = 'saved'::content.reaction_enum;
    PERFORM public.fn_log_artifact_lifecycle_event(v_type, p_artifact_id, 'unpin', v_actor, '{}'::jsonb);
  END IF;

  RETURN public.fn_artifact_lifecycle_status(v_type, p_artifact_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_archive(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers, content
AS $$
DECLARE
  v_type  TEXT := lower(trim(p_artifact_type));
  v_actor UUID := lensers.get_auth_lenser_id();
BEGIN
  IF v_type IN ('lenses') THEN v_type := 'lens'; END IF;
  IF v_type IN ('workflows') THEN v_type := 'workflow'; END IF;
  IF v_type IN ('battles') THEN v_type := 'battle'; END IF;
  IF v_type IN ('ai_lenser', 'ai_lenser_id', 'lenser') THEN v_type := 'agent'; END IF;

  IF NOT public.fn_artifact_can_manage(v_type, p_artifact_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_type = 'lens' THEN
    UPDATE lenses.lenses
       SET archived_at = COALESCE(archived_at, now()),
           status = 'archived'::content.content_status,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'workflow' THEN
    UPDATE lenses.workflows
       SET archived_at = COALESCE(archived_at, now()),
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'battle' THEN
    UPDATE battles.battles
       SET archived_at = COALESCE(archived_at, now()),
           status = 'archived'::battles.battle_status_enum,
           updated_at = now()
     WHERE id = p_artifact_id;
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (p_artifact_id, 'archived', v_actor, jsonb_build_object('action', 'archived'));
  ELSIF v_type = 'agent' THEN
    UPDATE agents.ai_lensers
       SET archived_at = COALESCE(archived_at, now()),
           is_active = false,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSE
    RAISE EXCEPTION 'unsupported_artifact_type: %', p_artifact_type USING ERRCODE = '22023';
  END IF;

  PERFORM public.fn_log_artifact_lifecycle_event(
    v_type,
    p_artifact_id,
    'archive',
    v_actor,
    public.fn_artifact_dependency_summary(v_type, p_artifact_id)
  );

  RETURN public.fn_artifact_lifecycle_status(v_type, p_artifact_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_restore(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers, content
AS $$
DECLARE
  v_type  TEXT := lower(trim(p_artifact_type));
  v_actor UUID := lensers.get_auth_lenser_id();
BEGIN
  IF v_type IN ('lenses') THEN v_type := 'lens'; END IF;
  IF v_type IN ('workflows') THEN v_type := 'workflow'; END IF;
  IF v_type IN ('battles') THEN v_type := 'battle'; END IF;
  IF v_type IN ('ai_lenser', 'ai_lenser_id', 'lenser') THEN v_type := 'agent'; END IF;

  IF NOT public.fn_artifact_can_manage(v_type, p_artifact_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_type = 'lens' THEN
    UPDATE lenses.lenses
       SET archived_at = NULL,
           deleted_at = NULL,
           status = CASE
             WHEN EXISTS (
               SELECT 1 FROM lenses.versions v
               WHERE v.lens_id = p_artifact_id
                 AND v.status = 'published'::content.content_status
             ) THEN 'published'::content.content_status
             ELSE 'draft'::content.content_status
           END,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'workflow' THEN
    UPDATE lenses.workflows
       SET archived_at = NULL,
           deleted_at = NULL,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'battle' THEN
    -- Restore to the most appropriate pre-archive status. Never auto-promote
    -- to 'open' — a battle that was never published (published_at IS NULL and
    -- finalized_at IS NULL) was a draft and must return to draft.
    UPDATE battles.battles
       SET archived_at = NULL,
           deleted_at = NULL,
           status = CASE
             WHEN published_at IS NOT NULL THEN 'published'::battles.battle_status_enum
             WHEN finalized_at IS NOT NULL THEN 'closed'::battles.battle_status_enum
             ELSE 'draft'::battles.battle_status_enum
           END,
           updated_at = now()
     WHERE id = p_artifact_id
       AND status = 'archived'::battles.battle_status_enum;
  ELSIF v_type = 'agent' THEN
    -- Do NOT reactivate suspended agents. A suspended agent must be explicitly
    -- unsuspended through a separate governance action. Archiving + restoring
    -- must not be a suspension bypass vector.
    UPDATE agents.ai_lensers
       SET archived_at = NULL,
           deleted_at = NULL,
           is_active = CASE WHEN suspended_at IS NULL THEN true ELSE false END,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSE
    RAISE EXCEPTION 'unsupported_artifact_type: %', p_artifact_type USING ERRCODE = '22023';
  END IF;

  PERFORM public.fn_log_artifact_lifecycle_event(v_type, p_artifact_id, 'restore', v_actor, '{}'::jsonb);
  RETURN public.fn_artifact_lifecycle_status(v_type, p_artifact_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_artifact_delete(
  p_artifact_type TEXT,
  p_artifact_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses, battles, agents, lensers, content
AS $$
DECLARE
  v_type       TEXT := lower(trim(p_artifact_type));
  v_actor      UUID := lensers.get_auth_lenser_id();
  v_dependency JSONB;
BEGIN
  IF v_type IN ('lenses') THEN v_type := 'lens'; END IF;
  IF v_type IN ('workflows') THEN v_type := 'workflow'; END IF;
  IF v_type IN ('battles') THEN v_type := 'battle'; END IF;
  IF v_type IN ('ai_lenser', 'ai_lenser_id', 'lenser') THEN v_type := 'agent'; END IF;

  IF NOT public.fn_artifact_can_manage(v_type, p_artifact_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  v_dependency := public.fn_artifact_dependency_summary(v_type, p_artifact_id);

  IF v_type = 'lens' THEN
    UPDATE lenses.lenses
       SET deleted_at = COALESCE(deleted_at, now()),
           archived_at = COALESCE(archived_at, now()),
           status = 'archived'::content.content_status,
           visibility = 'private'::content.visibility_enum,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'workflow' THEN
    UPDATE lenses.workflows
       SET deleted_at = COALESCE(deleted_at, now()),
           archived_at = COALESCE(archived_at, now()),
           visibility = 'private',
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSIF v_type = 'battle' THEN
    UPDATE battles.battles
       SET deleted_at = COALESCE(deleted_at, now()),
           archived_at = COALESCE(archived_at, now()),
           status = 'archived'::battles.battle_status_enum,
           updated_at = now()
     WHERE id = p_artifact_id;
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
      p_artifact_id,
      'archived',
      v_actor,
      jsonb_build_object('action', 'delete_tombstone', 'dependency_summary', v_dependency)
    );
  ELSIF v_type = 'agent' THEN
    UPDATE agents.ai_lensers
       SET deleted_at = COALESCE(deleted_at, now()),
           archived_at = COALESCE(archived_at, now()),
           is_active = false,
           updated_at = now()
     WHERE id = p_artifact_id;
  ELSE
    RAISE EXCEPTION 'unsupported_artifact_type: %', p_artifact_type USING ERRCODE = '22023';
  END IF;

  PERFORM public.fn_log_artifact_lifecycle_event(
    v_type,
    p_artifact_id,
    'delete_tombstone',
    v_actor,
    v_dependency
  );

  RETURN public.fn_artifact_lifecycle_status(v_type, p_artifact_id)
    || jsonb_build_object('delete_mode', 'tombstone');
END;
$$;

-- ── 3. Artifact-specific compatibility wrappers ─────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_delete_lens(p_lens_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_artifact_delete('lens', p_lens_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_archive_lens(p_lens_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_archive('lens', p_lens_id); $$;

CREATE OR REPLACE FUNCTION public.fn_restore_lens(p_lens_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_restore('lens', p_lens_id); $$;

CREATE OR REPLACE FUNCTION public.fn_delete_workflow(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_delete('workflow', p_workflow_id); $$;

CREATE OR REPLACE FUNCTION public.fn_archive_workflow(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_archive('workflow', p_workflow_id); $$;

CREATE OR REPLACE FUNCTION public.fn_restore_workflow(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_restore('workflow', p_workflow_id); $$;

CREATE OR REPLACE FUNCTION public.fn_delete_agent(p_ai_lenser_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_delete('agent', p_ai_lenser_id); $$;

CREATE OR REPLACE FUNCTION public.fn_archive_agent(p_ai_lenser_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_archive('agent', p_ai_lenser_id); $$;

CREATE OR REPLACE FUNCTION public.fn_restore_agent(p_ai_lenser_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_restore('agent', p_ai_lenser_id); $$;

CREATE OR REPLACE FUNCTION public.fn_battles_archive(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_artifact_archive('battle', p_battle_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_battles_delete(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_artifact_delete('battle', p_battle_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_battles_retract(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_artifact_archive('battle', p_battle_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_battles_restore(p_battle_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT public.fn_artifact_restore('battle', p_battle_id); $$;

CREATE OR REPLACE FUNCTION public.fn_lens_star(
  p_slug   TEXT,
  p_unstar BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, content, lenses
AS $$
DECLARE
  v_lens_id UUID;
BEGIN
  BEGIN
    v_lens_id := p_slug::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT l.id INTO v_lens_id
    FROM lenses.lenses l
    LEFT JOIN content.entity_translations et
      ON et.entity_id = l.id
     AND et.entity_type = 'lens'::content.entity_type_enum
     AND et.is_original = TRUE
    WHERE lower(replace(COALESCE(et.title, l.id::text), ' ', '-')) = lower(p_slug)
       OR lower(COALESCE(et.title, '')) = lower(p_slug)
    ORDER BY l.created_at DESC
    LIMIT 1;
  END;

  IF v_lens_id IS NULL THEN
    RAISE EXCEPTION 'lens_not_found: %', p_slug USING ERRCODE = 'P0002';
  END IF;

  RETURN public.fn_artifact_pin('lens', v_lens_id, NOT COALESCE(p_unstar, FALSE));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lenses_starred()
RETURNS SETOF JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, content, lenses, lensers
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'slug', lower(replace(COALESCE(et.title, l.id::text), ' ', '-')),
    'title', COALESCE(et.title, 'Untitled'),
    'author_username', p.handle,
    'starred_at', r.created_at,
    'lifecycle', public.fn_artifact_lifecycle_status('lens', l.id)
  )
  FROM content.reactions r
  JOIN lenses.lenses l ON l.id = r.entity_id
  LEFT JOIN content.entity_translations et
    ON et.entity_id = l.id
   AND et.entity_type = 'lens'::content.entity_type_enum
   AND et.is_original = TRUE
  LEFT JOIN lensers.profiles p ON p.id = l.lenser_id
  WHERE r.entity_type = 'lens'::content.entity_type_enum
    AND r.reaction = 'saved'::content.reaction_enum
    AND r.lenser_id = lensers.get_auth_lenser_id()
    AND public.fn_artifact_can_view('lens', l.id)
  ORDER BY r.created_at DESC;
$$;

-- ── 4. Reaction RPCs now support battle and agent pins ──────────────────────

CREATE OR REPLACE FUNCTION public.fn_content_reactions_get_user_for_target(
  p_target_type TEXT,
  p_target_id   UUID
) RETURNS TABLE(
  id UUID,
  target_id UUID,
  user_id UUID,
  reaction content.reaction_enum,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, content, lensers, auth
AS $$
DECLARE
  v_lenser_id UUID;
  v_entity    content.entity_type_enum;
  v_type      TEXT := lower(trim(p_target_type));
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN RETURN; END IF;

  IF v_type NOT IN ('thread', 'thread_reply', 'lens', 'workflow', 'battle', 'agent') THEN
    RETURN;
  END IF;

  IF v_type IN ('lens', 'workflow', 'battle', 'agent')
     AND NOT public.fn_artifact_can_view(v_type, p_target_id) THEN
    RETURN;
  END IF;

  v_entity := v_type::content.entity_type_enum;

  RETURN QUERY
    SELECT r.id, r.entity_id AS target_id, r.lenser_id AS user_id, r.reaction, r.created_at
    FROM content.reactions r
    WHERE r.entity_type = v_entity
      AND r.entity_id = p_target_id
      AND r.lenser_id = v_lenser_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_content_reactions_toggle(
  p_target_type TEXT,
  p_target_id   UUID,
  p_reaction    content.reaction_enum
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, content, lensers, auth
AS $$
DECLARE
  v_lenser_id UUID;
  v_added     BOOLEAN;
  v_counts    JSONB;
  v_entity    content.entity_type_enum;
  v_type      TEXT := lower(trim(p_target_type));
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_type NOT IN ('thread', 'thread_reply', 'lens', 'workflow', 'battle', 'agent') THEN
    RAISE EXCEPTION 'Invalid target_type: %', p_target_type USING ERRCODE = '22023';
  END IF;

  IF v_type IN ('lens', 'workflow', 'battle', 'agent')
     AND NOT public.fn_artifact_can_view(v_type, p_target_id) THEN
    RAISE EXCEPTION 'artifact_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  v_entity := v_type::content.entity_type_enum;

  IF p_reaction = 'copy'::content.reaction_enum THEN
    INSERT INTO content.reactions (entity_type, entity_id, lenser_id, reaction)
    VALUES (v_entity, p_target_id, v_lenser_id, p_reaction);
    v_added := TRUE;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM content.reactions
      WHERE entity_type = v_entity
        AND entity_id = p_target_id
        AND lenser_id = v_lenser_id
        AND reaction = p_reaction
    ) THEN
      DELETE FROM content.reactions
      WHERE entity_type = v_entity
        AND entity_id = p_target_id
        AND lenser_id = v_lenser_id
        AND reaction = p_reaction;
      v_added := FALSE;
    ELSE
      INSERT INTO content.reactions (entity_type, entity_id, lenser_id, reaction)
      VALUES (v_entity, p_target_id, v_lenser_id, p_reaction);
      v_added := TRUE;
    END IF;
  END IF;

  SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)
  INTO v_counts
  FROM (
    SELECT reaction, count(*)::int AS cnt
    FROM content.reactions
    WHERE entity_type = v_entity
      AND entity_id = p_target_id
    GROUP BY reaction
  ) s;

  RETURN jsonb_build_object('added', v_added, 'counts', v_counts);
END;
$$;

-- ── 5. Immutable workflow execution snapshots ───────────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_workflow_snapshot_hash(p_version_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, extensions, public
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  SELECT jsonb_build_object(
    'nodes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'source_node_id', n.source_node_id,
          'lens_id', n.lens_id,
          'version_id', n.version_id,
          'position_x', n.position_x,
          'position_y', n.position_y,
          'label', n.label,
          'ordinal', n.ordinal,
          'config', n.config
        )
        ORDER BY n.ordinal, n.id
      )
      FROM lenses.workflow_version_nodes n
      WHERE n.workflow_version_id = p_version_id
    ), '[]'::jsonb),
    'edges', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'source_node_id', e.source_node_id,
          'target_node_id', e.target_node_id,
          'source_output_key', e.source_output_key,
          'target_param_label', e.target_param_label
        )
        ORDER BY e.source_node_id, e.target_node_id, e.target_param_label
      )
      FROM lenses.workflow_version_edges e
      WHERE e.workflow_version_id = p_version_id
    ), '[]'::jsonb)
  )
  INTO v_payload;

  RETURN encode(extensions.digest(v_payload::text, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION lenses.fn_create_workflow_execution_snapshot(
  p_workflow_id UUID,
  p_actor_id    UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public, extensions
AS $$
DECLARE
  v_actor        UUID := COALESCE(p_actor_id, lensers.get_auth_lenser_id());
  v_next_version INTEGER;
  v_version_id   UUID;
  v_node_map     JSONB := '{}'::jsonb;
  v_old_node     RECORD;
  v_new_node_id  UUID;
  v_resolved_version_id UUID;
  v_hash         TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND w.archived_at IS NULL
      AND w.deleted_at IS NULL
      AND (w.visibility = 'public' OR w.lenser_id = v_actor OR public.fn_lifecycle_is_service_role())
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(max(version_number), 0) + 1
  INTO v_next_version
  FROM lenses.workflow_versions
  WHERE workflow_id = p_workflow_id;

  INSERT INTO lenses.workflow_versions (workflow_id, version_number, changelog, status, created_by)
  VALUES (p_workflow_id, v_next_version, 'Execution snapshot', 'snapshot', v_actor)
  RETURNING id INTO v_version_id;

  FOR v_old_node IN
    SELECT n.id, n.lens_id, n.version_id, n.position_x, n.position_y, n.label, n.ordinal, n.config
    FROM lenses.workflow_nodes n
    WHERE n.workflow_id = p_workflow_id
    ORDER BY n.ordinal, n.id
  LOOP
    SELECT COALESCE(
      v_old_node.version_id,
      (
        SELECT v.id
        FROM lenses.versions v
        WHERE v.lens_id = v_old_node.lens_id
          AND v.status = 'published'::content.content_status
        ORDER BY v.version_number DESC
        LIMIT 1
      ),
      l.head_version_id
    )
    INTO v_resolved_version_id
    FROM lenses.lenses l
    WHERE l.id = v_old_node.lens_id
      AND l.archived_at IS NULL
      AND l.deleted_at IS NULL;

    IF v_resolved_version_id IS NULL THEN
      RAISE EXCEPTION 'workflow_node_lens_unavailable: %', v_old_node.lens_id USING ERRCODE = '42501';
    END IF;

    v_new_node_id := gen_random_uuid();

    INSERT INTO lenses.workflow_version_nodes (
      id,
      workflow_version_id,
      source_node_id,
      lens_id,
      version_id,
      position_x,
      position_y,
      label,
      ordinal,
      config
    ) VALUES (
      v_new_node_id,
      v_version_id,
      v_old_node.id,
      v_old_node.lens_id,
      v_resolved_version_id,
      v_old_node.position_x,
      v_old_node.position_y,
      v_old_node.label,
      v_old_node.ordinal,
      v_old_node.config
    );

    v_node_map := v_node_map || jsonb_build_object(v_old_node.id::text, v_new_node_id::text);
  END LOOP;

  INSERT INTO lenses.workflow_version_edges (
    workflow_version_id,
    source_node_id,
    target_node_id,
    source_output_key,
    target_param_label
  )
  SELECT
    v_version_id,
    (v_node_map ->> e.source_node_id::text)::uuid,
    (v_node_map ->> e.target_node_id::text)::uuid,
    e.source_output_key,
    e.target_param_label
  FROM lenses.workflow_edges e
  WHERE e.workflow_id = p_workflow_id
    AND v_node_map ? e.source_node_id::text
    AND v_node_map ? e.target_node_id::text;

  v_hash := lenses.fn_workflow_snapshot_hash(v_version_id);

  UPDATE lenses.workflow_versions
     SET snapshot_hash = v_hash
   WHERE id = v_version_id;

  PERFORM public.fn_log_artifact_lifecycle_event(
    'workflow',
    p_workflow_id,
    'version_snapshot_create',
    v_actor,
    jsonb_build_object('workflow_version_id', v_version_id, 'snapshot_hash', v_hash)
  );

  RETURN v_version_id;
END;
$$;

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id       UUID,
  p_inputs            JSONB DEFAULT '{}'::jsonb,
  p_global_model_id   TEXT DEFAULT NULL,
  p_idempotency_key   TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
DECLARE
  v_lenser_id        UUID;
  v_run_id           UUID;
  v_rate_window_sec  INTEGER := 60;
  v_rate_limit_count INTEGER := 30;
  v_recent_count     INTEGER;
  v_role             TEXT;
  v_version_id       UUID;
  v_snapshot_hash    TEXT;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND w.archived_at IS NULL
      AND w.deleted_at IS NULL
      AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id OR public.fn_lifecycle_is_service_role())
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    SELECT id INTO v_run_id
    FROM lenses.workflow_runs
    WHERE workflow_id = p_workflow_id
      AND idempotency_key = p_idempotency_key
      AND (idempotency_expires_at IS NULL OR idempotency_expires_at > now())
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_run_id IS NOT NULL THEN
      RETURN v_run_id;
    END IF;
  END IF;

  BEGIN
    v_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_lenser_id IS NULL THEN
    IF v_role = 'anon' THEN
      RAISE EXCEPTION 'fn_start_workflow_run: anon not permitted'
        USING ERRCODE = '42501',
              HINT    = 'rate limit cannot be enforced for anon';
    END IF;
  ELSE
    v_recent_count := lenses.fn_count_recent_runs(v_lenser_id, v_rate_window_sec);
    IF v_recent_count >= v_rate_limit_count THEN
      RAISE EXCEPTION
        'rate_limited: % runs in the last % seconds (cap %)',
        v_recent_count, v_rate_window_sec, v_rate_limit_count
        USING ERRCODE = '54000', HINT = 'workflow_run_rate_limit';
    END IF;
  END IF;

  v_version_id := lenses.fn_create_workflow_execution_snapshot(p_workflow_id, v_lenser_id);

  SELECT snapshot_hash INTO v_snapshot_hash
  FROM lenses.workflow_versions
  WHERE id = v_version_id;

  INSERT INTO lenses.workflow_runs (
    workflow_id,
    workflow_version_id,
    workflow_snapshot_hash,
    triggered_by,
    status,
    context_inputs,
    global_model_id,
    idempotency_key,
    idempotency_expires_at
  )
  VALUES (
    p_workflow_id,
    v_version_id,
    v_snapshot_hash,
    v_lenser_id,
    'pending',
    p_inputs,
    p_global_model_id,
    p_idempotency_key,
    CASE
      WHEN p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0
      THEN now() + interval '24 hours'
      ELSE NULL
    END
  )
  RETURNING id INTO v_run_id;

  INSERT INTO lenses.workflow_node_results (
    run_id,
    node_id,
    workflow_version_node_id,
    resolved_lens_version_id,
    node_snapshot_hash,
    status
  )
  SELECT
    v_run_id,
    n.source_node_id,
    n.id,
    n.version_id,
    encode(extensions.digest(
      jsonb_build_object(
        'workflow_version_node_id', n.id,
        'lens_id', n.lens_id,
        'version_id', n.version_id,
        'config', n.config
      )::text,
      'sha256'
    ), 'hex'),
    'pending'
  FROM lenses.workflow_version_nodes n
  WHERE n.workflow_version_id = v_version_id
    AND n.source_node_id IS NOT NULL;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id UUID,
  p_inputs      JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO lenses
AS $$ SELECT lenses.fn_start_workflow_run(p_workflow_id, p_inputs, NULL::text, NULL::text); $$;

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id     UUID,
  p_inputs          JSONB DEFAULT '{}'::jsonb,
  p_global_model_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO lenses
AS $$ SELECT lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, NULL::text); $$;

CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id       UUID,
  p_inputs            JSONB DEFAULT '{}'::jsonb,
  p_global_model_id   TEXT DEFAULT NULL,
  p_idempotency_key   TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, lenses
AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key);
END;
$$;

-- ── 6. Lens execution snapshot guard ────────────────────────────────────────

CREATE OR REPLACE FUNCTION execution.trg_requests_resolve_lens_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO execution, lenses, public, extensions
AS $$
DECLARE
  v_lens    lenses.lenses%ROWTYPE;
  v_version lenses.versions%ROWTYPE;
  v_snapshot JSONB;
BEGIN
  IF NEW.lens_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_lens
  FROM lenses.lenses
  WHERE id = NEW.lens_id;

  IF NOT FOUND OR v_lens.archived_at IS NOT NULL OR v_lens.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'lens_unavailable_for_execution: %', NEW.lens_id USING ERRCODE = '42501';
  END IF;

  IF NEW.version_id IS NULL THEN
    SELECT * INTO v_version
    FROM lenses.versions
    WHERE lens_id = NEW.lens_id
      AND status = 'published'::content.content_status
    ORDER BY version_number DESC
    LIMIT 1;

    IF NOT FOUND AND v_lens.head_version_id IS NOT NULL THEN
      SELECT * INTO v_version
      FROM lenses.versions
      WHERE id = v_lens.head_version_id;
    END IF;

    IF FOUND THEN
      NEW.version_id := v_version.id;
    END IF;
  ELSE
    SELECT * INTO v_version
    FROM lenses.versions
    WHERE id = NEW.version_id
      AND lens_id = NEW.lens_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lens_version_unavailable_for_execution: %', NEW.lens_id USING ERRCODE = '42501';
  END IF;

  NEW.lens_content_hash := encode(v_version.content_hash, 'hex');
  v_snapshot := jsonb_build_object(
    'artifact_type', 'lens',
    'lens_id', NEW.lens_id,
    'version_id', v_version.id,
    'version_number', v_version.version_number,
    'content_hash', NEW.lens_content_hash,
    'snapshot_kind', 'lens_version'
  );

  NEW.resolved_artifact_snapshot := COALESCE(NEW.resolved_artifact_snapshot, v_snapshot);
  NEW.resolved_artifact_snapshot_hash := COALESCE(
    NEW.resolved_artifact_snapshot_hash,
    encode(extensions.digest(v_snapshot::text, 'sha256'), 'hex')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requests_resolve_lens_snapshot ON execution.requests;
CREATE TRIGGER trg_requests_resolve_lens_snapshot
  BEFORE INSERT ON execution.requests
  FOR EACH ROW
  EXECUTE FUNCTION execution.trg_requests_resolve_lens_snapshot();

-- ── 7. Redacted agent operational snapshots ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_redacted_agent_snapshot(p_ai_lenser_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, agents, lensers, lenses, extensions
AS $$
DECLARE
  v_snapshot JSONB;
BEGIN
  SELECT jsonb_build_object(
    'agent_id', al.id,
    'profile_id', al.profile_id,
    'handle', p.handle,
    'display_name', p.display_name,
    'runtime_pref', al.runtime_pref,
    'is_active', al.is_active,
    'suspended', al.suspended_at IS NOT NULL,
    'personality_note_hash', CASE
      WHEN al.personality_note IS NULL THEN NULL
      ELSE encode(extensions.digest(al.personality_note, 'sha256'), 'hex')
    END,
    'policies', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pol.id,
        'can_join_battles', pol.can_join_battles,
        'can_vote', pol.can_vote,
        'can_create_battles', pol.can_create_battles,
        'can_receive_sponsorship', pol.can_receive_sponsorship,
        'model_binding_mode', pol.model_binding_mode,
        'max_daily_battles', pol.max_daily_battles,
        'max_daily_votes', pol.max_daily_votes,
        'allowed_battle_types', pol.allowed_battle_types,
        'spending_limit_credits', pol.spending_limit_credits,
        'allowed_output_modalities', pol.allowed_output_modalities,
        'is_public_policy', pol.is_public_policy
      ) ORDER BY pol.created_at)
      FROM agents.policies pol
      WHERE pol.ai_lenser_id = al.id
    ), '[]'::jsonb),
    'lens_bindings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', lb.id,
        'lens_id', lb.lens_id,
        'version_id', COALESCE(lb.version_id, l.head_version_id),
        'is_default', lb.is_default,
        'category_tags', lb.category_tags
      ) ORDER BY lb.created_at)
      FROM agents.lens_bindings lb
      JOIN lenses.lenses l ON l.id = lb.lens_id
      WHERE lb.ai_lenser_id = al.id
    ), '[]'::jsonb),
    'model_bindings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', mb.id,
        'model_id', mb.model_id,
        'is_default', mb.is_default,
        'category_tags', mb.category_tags,
        'byok_adapter', mb.byok_adapter,
        'ollama_endpoint_hash', CASE
          WHEN mb.ollama_endpoint IS NULL THEN NULL
          ELSE encode(extensions.digest(mb.ollama_endpoint, 'sha256'), 'hex')
        END
      ) ORDER BY mb.created_at)
      FROM agents.model_bindings mb
      WHERE mb.ai_lenser_id = al.id
    ), '[]'::jsonb),
    'tool_profiles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tp.id,
        'allow_tools', tp.allow_tools,
        'deny_tools', tp.deny_tools,
        'tool_groups', tp.tool_groups,
        'requires_approval', tp.requires_approval,
        'is_default', tp.is_default
      ) ORDER BY tp.created_at)
      FROM agents.tool_profiles tp
      WHERE tp.ai_lenser_id = al.id
    ), '[]'::jsonb),
    'tool_assignments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ta.id,
        'tool_id', ta.tool_id,
        'profile_id', ta.profile_id,
        'allowed', ta.allowed
      ) ORDER BY ta.created_at)
      FROM agents.tool_assignments ta
      WHERE ta.ai_lenser_id = al.id
    ), '[]'::jsonb),
    'memory_policy', jsonb_build_object(
      'memory_profile_count', (
        SELECT count(*) FROM agents.memory_profiles mp WHERE mp.ai_lenser_id = al.id
      ),
      'memory_body_included', false
    ),
    'redaction', jsonb_build_object(
      'secrets_included', false,
      'oauth_tokens_included', false,
      'api_keys_included', false,
      'private_memory_bodies_included', false
    )
  )
  INTO v_snapshot
  FROM agents.ai_lensers al
  JOIN lensers.profiles p ON p.id = al.profile_id
  WHERE al.id = p_ai_lenser_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'agent_not_found: %', p_ai_lenser_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_redacted_agent_snapshot_hash(p_ai_lenser_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
  SELECT encode(extensions.digest(public.fn_redacted_agent_snapshot(p_ai_lenser_id)::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION agents.trg_team_runs_capture_agent_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO agents, public
AS $$
BEGIN
  IF NEW.ai_lenser_id IS NOT NULL AND NEW.redacted_agent_snapshot IS NULL THEN
    NEW.redacted_agent_snapshot := public.fn_redacted_agent_snapshot(NEW.ai_lenser_id);
    NEW.redacted_agent_snapshot_hash := public.fn_redacted_agent_snapshot_hash(NEW.ai_lenser_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_runs_capture_agent_snapshot ON agents.team_runs;
CREATE TRIGGER trg_team_runs_capture_agent_snapshot
  BEFORE INSERT OR UPDATE OF ai_lenser_id ON agents.team_runs
  FOR EACH ROW
  EXECUTE FUNCTION agents.trg_team_runs_capture_agent_snapshot();

CREATE OR REPLACE FUNCTION battles.trg_contender_entity_map_capture_agent_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, public
AS $$
BEGIN
  IF NEW.ai_lenser_id IS NOT NULL AND NEW.redacted_agent_snapshot IS NULL THEN
    NEW.redacted_agent_snapshot := public.fn_redacted_agent_snapshot(NEW.ai_lenser_id);
    NEW.redacted_agent_snapshot_hash := public.fn_redacted_agent_snapshot_hash(NEW.ai_lenser_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contender_entity_map_capture_agent_snapshot ON battles.contender_entity_map;
CREATE TRIGGER trg_contender_entity_map_capture_agent_snapshot
  BEFORE INSERT OR UPDATE OF ai_lenser_id ON battles.contender_entity_map
  FOR EACH ROW
  EXECUTE FUNCTION battles.trg_contender_entity_map_capture_agent_snapshot();

CREATE OR REPLACE FUNCTION battles.trg_battle_execution_jobs_capture_agent_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, public
AS $$
DECLARE
  v_ai_lenser_id UUID;
BEGIN
  IF NEW.redacted_agent_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT ai_lenser_id INTO v_ai_lenser_id
  FROM battles.contender_entity_map
  WHERE contender_id = NEW.contender_id;

  IF v_ai_lenser_id IS NOT NULL THEN
    NEW.redacted_agent_snapshot := public.fn_redacted_agent_snapshot(v_ai_lenser_id);
    NEW.redacted_agent_snapshot_hash := public.fn_redacted_agent_snapshot_hash(v_ai_lenser_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_battle_execution_jobs_capture_agent_snapshot ON battles.battle_execution_jobs;
CREATE TRIGGER trg_battle_execution_jobs_capture_agent_snapshot
  BEFORE INSERT OR UPDATE OF contender_id ON battles.battle_execution_jobs
  FOR EACH ROW
  EXECUTE FUNCTION battles.trg_battle_execution_jobs_capture_agent_snapshot();

-- ── 8. Battle snapshots and immutability guards ─────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_battle_config_snapshot(
  p_battle_id UUID,
  p_reason    TEXT DEFAULT 'lifecycle'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, audit, extensions, public
AS $$
DECLARE
  v_actor UUID := lensers.get_auth_lenser_id();
  v_rules_json JSONB;
  v_hash TEXT;
BEGIN
  SELECT jsonb_build_object(
    'snapshot_reason', p_reason,
    'title', b.title,
    'slug', b.slug,
    'task_prompt', b.task_prompt,
    'rubric_id', b.rubric_id,
    'status', b.status,
    'battle_type', b.battle_type,
    'contender_structure', b.contender_structure,
    'judging_mode', b.judging_mode,
    'task_source', b.task_source,
    'challenge_type', b.challenge_type,
    'generated_challenge_id', b.generated_challenge_id,
    'voter_eligibility', b.voter_eligibility,
    'max_contenders', b.max_contenders,
    'handicap_config', b.handicap_config,
    'workflow_id', b.workflow_id,
    'lens_id', b.lens_id,
    'content_type', b.content_type,
    'execution_starts_at', b.execution_starts_at,
    'auto_publish', b.auto_publish,
    'voting_duration_hours', b.voting_duration_hours,
    'ai_judge_enabled', b.ai_judge_enabled,
    'ai_judge_model_key', b.ai_judge_model_key,
    'ai_judge_prompt_hash', CASE
      WHEN b.ai_judge_prompt IS NULL THEN NULL
      ELSE encode(extensions.digest(b.ai_judge_prompt, 'sha256'), 'hex')
    END,
    'published_at', b.published_at,
    'captured_at', now()
  )
  INTO v_rules_json
  FROM battles.battles b
  WHERE b.id = p_battle_id;

  IF v_rules_json IS NULL THEN
    RAISE EXCEPTION 'battle_not_found: %', p_battle_id USING ERRCODE = 'P0002';
  END IF;

  v_hash := encode(extensions.digest(v_rules_json::text, 'sha256'), 'hex');

  INSERT INTO battles.rule_snapshots (battle_id, snapshot_hash, rules_json, created_by)
  VALUES (p_battle_id, v_hash, v_rules_json, v_actor);

  PERFORM public.fn_log_artifact_lifecycle_event(
    'battle',
    p_battle_id,
    'config_snapshot_create',
    v_actor,
    jsonb_build_object('snapshot_hash', v_hash, 'reason', p_reason)
  );

  RETURN v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_publish_battle(p_battle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, audit, extensions, public
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_hash TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM battles.battles
    WHERE id = p_battle_id
      AND creator_lenser_id = v_lenser_id
      AND status = 'draft'::battles.battle_status_enum
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_authorized_or_invalid_state' USING ERRCODE = '42501';
  END IF;

  v_hash := public.fn_create_battle_config_snapshot(p_battle_id, 'publish');

  UPDATE battles.battles
     SET status = 'open'::battles.battle_status_enum,
         published_at = now(),
         updated_at = now()
   WHERE id = p_battle_id;

  INSERT INTO audit.attestations (
    entity_type, entity_id, attested_by, attestation_type, proof_payload
  )
  VALUES (
    'battle', p_battle_id, v_lenser_id, 'battle_published',
    jsonb_build_object('snapshot_hash', v_hash, 'battle_id', p_battle_id)
  );

  INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
  VALUES (
    p_battle_id,
    'published',
    v_lenser_id,
    jsonb_build_object('snapshot_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'snapshot_hash', v_hash,
    'status', 'open',
    'battle_id', p_battle_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION battles.trg_snapshot_battle_on_first_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, public
AS $$
BEGIN
  IF OLD.status = 'draft'::battles.battle_status_enum
     AND NEW.status <> 'draft'::battles.battle_status_enum
     AND NOT EXISTS (SELECT 1 FROM battles.rule_snapshots rs WHERE rs.battle_id = NEW.id) THEN
    PERFORM public.fn_create_battle_config_snapshot(NEW.id, 'status_transition');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_battle_on_first_open ON battles.battles;
CREATE TRIGGER trg_snapshot_battle_on_first_open
  AFTER UPDATE OF status ON battles.battles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION battles.trg_snapshot_battle_on_first_open();

CREATE OR REPLACE FUNCTION battles.trg_battle_structural_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO battles, public
AS $$
DECLARE
  v_summary JSONB;
  v_has_evidence BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_summary := public.fn_artifact_dependency_summary('battle', OLD.id);
  v_has_evidence := COALESCE((v_summary ->> 'total')::int, 0) > 0
                    OR OLD.status <> 'draft'::battles.battle_status_enum;

  IF v_has_evidence AND (
      NEW.title IS DISTINCT FROM OLD.title
      OR NEW.slug IS DISTINCT FROM OLD.slug
      OR NEW.task_prompt IS DISTINCT FROM OLD.task_prompt
      OR NEW.rubric_id IS DISTINCT FROM OLD.rubric_id
      OR NEW.max_contenders IS DISTINCT FROM OLD.max_contenders
      OR NEW.battle_type IS DISTINCT FROM OLD.battle_type
      OR NEW.contender_structure IS DISTINCT FROM OLD.contender_structure
      OR NEW.judging_mode IS DISTINCT FROM OLD.judging_mode
      OR NEW.task_source IS DISTINCT FROM OLD.task_source
      OR NEW.challenge_type IS DISTINCT FROM OLD.challenge_type
      OR NEW.generated_challenge_id IS DISTINCT FROM OLD.generated_challenge_id
      OR NEW.voter_eligibility IS DISTINCT FROM OLD.voter_eligibility
      OR NEW.handicap_config IS DISTINCT FROM OLD.handicap_config
      OR NEW.workflow_id IS DISTINCT FROM OLD.workflow_id
      OR NEW.lens_id IS DISTINCT FROM OLD.lens_id
      OR NEW.content_type IS DISTINCT FROM OLD.content_type
      OR NEW.ai_judge_enabled IS DISTINCT FROM OLD.ai_judge_enabled
      OR NEW.ai_judge_model_key IS DISTINCT FROM OLD.ai_judge_model_key
      OR NEW.ai_judge_prompt IS DISTINCT FROM OLD.ai_judge_prompt
    ) THEN
    RAISE EXCEPTION 'battle_config_immutable: battle has historical or competitive evidence'
      USING ERRCODE = '55000',
            DETAIL = v_summary::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_battle_structural_immutability ON battles.battles;
CREATE TRIGGER trg_battle_structural_immutability
  BEFORE UPDATE ON battles.battles
  FOR EACH ROW
  EXECUTE FUNCTION battles.trg_battle_structural_immutability();

-- ── 9. Direct delete guards ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_block_unsafe_artifact_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_type TEXT;
  v_summary JSONB;
BEGIN
  IF public.fn_lifecycle_is_service_role() THEN
    RETURN OLD;
  END IF;

  v_type := CASE TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    WHEN 'lenses.lenses' THEN 'lens'
    WHEN 'lenses.workflows' THEN 'workflow'
    WHEN 'battles.battles' THEN 'battle'
    WHEN 'agents.ai_lensers' THEN 'agent'
    ELSE NULL
  END;

  IF v_type IS NULL THEN
    RETURN OLD;
  END IF;

  v_summary := public.fn_artifact_dependency_summary(v_type, OLD.id);

  IF COALESCE((v_summary ->> 'total')::int, 0) > 0 THEN
    RAISE EXCEPTION 'unsafe_hard_delete_blocked: use lifecycle delete/archive RPC instead'
      USING ERRCODE = '55000',
            DETAIL = v_summary::text;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_unsafe_lens_delete ON lenses.lenses;
CREATE TRIGGER trg_block_unsafe_lens_delete
  BEFORE DELETE ON lenses.lenses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_unsafe_artifact_delete();

DROP TRIGGER IF EXISTS trg_block_unsafe_workflow_delete ON lenses.workflows;
CREATE TRIGGER trg_block_unsafe_workflow_delete
  BEFORE DELETE ON lenses.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_unsafe_artifact_delete();

DROP TRIGGER IF EXISTS trg_block_unsafe_battle_delete ON battles.battles;
CREATE TRIGGER trg_block_unsafe_battle_delete
  BEFORE DELETE ON battles.battles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_unsafe_artifact_delete();

DROP TRIGGER IF EXISTS trg_block_unsafe_agent_delete ON agents.ai_lensers;
CREATE TRIGGER trg_block_unsafe_agent_delete
  BEFORE DELETE ON agents.ai_lensers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_unsafe_artifact_delete();

-- ── 10. RLS alignment and generated challenge creator fix ───────────────────

DROP POLICY IF EXISTS "battles_select" ON battles.battles;
CREATE POLICY "battles_select" ON battles.battles
FOR SELECT
USING (
  (
    status = ANY (ARRAY[
      'open'::battles.battle_status_enum,
      'executing'::battles.battle_status_enum,
      'voting'::battles.battle_status_enum,
      'scoring'::battles.battle_status_enum,
      'closed'::battles.battle_status_enum,
      'published'::battles.battle_status_enum,
      'archived'::battles.battle_status_enum
    ])
    AND deleted_at IS NULL
  )
  OR creator_lenser_id = lensers.get_auth_lenser_id()
);

DROP POLICY IF EXISTS "ai_lensers_public_read" ON agents.ai_lensers;
CREATE POLICY "ai_lensers_public_read" ON agents.ai_lensers
FOR SELECT
USING (
  is_active = TRUE
  AND suspended_at IS NULL
  AND archived_at IS NULL
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "generated_challenges_select_creator" ON battles.generated_challenges;
CREATE POLICY "generated_challenges_select_creator"
  ON battles.generated_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id
        AND b.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- ── 11. Grants ───────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.fn_artifact_archive(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_artifact_restore(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_artifact_delete(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_artifact_pin(TEXT, UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_artifact_dependency_summary(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_artifact_lifecycle_status(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_artifact_archive(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_artifact_restore(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_artifact_delete(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_artifact_pin(TEXT, UUID, BOOLEAN) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.fn_delete_lens(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_archive_lens(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_restore_lens(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_delete_workflow(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_archive_workflow(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_restore_workflow(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_delete_agent(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_archive_agent(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_restore_agent(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lens_star(TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lenses_starred() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_battles_restore(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot_hash(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fn_start_workflow_run(UUID, JSONB, TEXT, TEXT) FROM anon;

COMMENT ON FUNCTION public.fn_artifact_dependency_summary(TEXT, UUID) IS
  'Lifecycle governance dependency detector for Lens, Workflow, Battle, and Agent. Used to block unsafe hard delete/mutation and explain archive/tombstone fallback.';
COMMENT ON FUNCTION public.fn_artifact_lifecycle_status(TEXT, UUID) IS
  'Returns lifecycle state, pin state, version/snapshot ids, and dependency summary for a governed artifact.';
COMMENT ON FUNCTION public.fn_artifact_delete(TEXT, UUID) IS
  'Dependency-aware delete request. Public APIs tombstone/withdraw governed artifacts instead of hard-deleting competitive or historical evidence.';
