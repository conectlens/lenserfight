-- =============================================================================
-- 20260428010000_ai_catalog_agent_control_room.sql
-- -----------------------------------------------------------------------------
-- Expands the AI catalog metadata surface and introduces the owner-only
-- multi-agent control room domain for AI workspaces.
-- =============================================================================

-- ─── 1. AI catalog metadata ──────────────────────────────────────────────────

ALTER TABLE ai.providers
  ADD COLUMN IF NOT EXISTS support_level text NOT NULL DEFAULT 'runnable',
  ADD COLUMN IF NOT EXISTS logo_slug text;

ALTER TABLE ai.providers
  DROP CONSTRAINT IF EXISTS providers_support_level_check;

ALTER TABLE ai.providers
  ADD CONSTRAINT providers_support_level_check
  CHECK (support_level IN ('runnable', 'byok_only', 'catalog_only', 'deprecated'));

COMMENT ON COLUMN ai.providers.support_level IS
  'Catalog support tier for the provider: runnable, byok_only, catalog_only, deprecated.';

COMMENT ON COLUMN ai.providers.logo_slug IS
  'Stable UI asset slug for provider logos/cards.';

ALTER TABLE ai.models
  ADD COLUMN IF NOT EXISTS docs_url text,
  ADD COLUMN IF NOT EXISTS support_level text NOT NULL DEFAULT 'runnable',
  ADD COLUMN IF NOT EXISTS supports_streaming boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS use_cases text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS developer_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai.models
  DROP CONSTRAINT IF EXISTS models_support_level_check;

ALTER TABLE ai.models
  ADD CONSTRAINT models_support_level_check
  CHECK (support_level IN ('runnable', 'byok_only', 'catalog_only', 'deprecated'));

ALTER TABLE ai.models
  DROP CONSTRAINT IF EXISTS models_status_check;

ALTER TABLE ai.models
  ADD CONSTRAINT models_status_check
  CHECK (status IN ('active', 'preview', 'deprecated', 'legacy'));

COMMENT ON COLUMN ai.models.docs_url IS
  'Canonical upstream documentation URL for this model entry.';

COMMENT ON COLUMN ai.models.support_level IS
  'Catalog support tier for the model: runnable, byok_only, catalog_only, deprecated.';

COMMENT ON COLUMN ai.models.supports_streaming IS
  'Whether LenserFight can stream this model through a supported invocation path.';

COMMENT ON COLUMN ai.models.status IS
  'Catalog lifecycle state: active, preview, deprecated, legacy.';

COMMENT ON COLUMN ai.models.use_cases IS
  'Normalized recommended use-case tags for UI cards and CLI filtering.';

COMMENT ON COLUMN ai.models.developer_summary IS
  'Developer-facing explanation for when and how to use the model.';

COMMENT ON COLUMN ai.models.user_summary IS
  'User-facing explanation for what the model is best at.';

COMMENT ON COLUMN ai.models.metadata IS
  'Flexible metadata for source provenance, auth mode, platform/gateway compatibility, pricing snapshots, and provider-specific notes.';

-- ─── 2. Ownership helper ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.can_manage_ai_lenser(p_ai_lenser_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'agents', 'lensers', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agents.ownerships o
    WHERE o.ai_lenser_id = p_ai_lenser_id
      AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
      AND o.role IN ('owner', 'co_owner')
      AND o.revoked_at IS NULL
  );
$$;

ALTER FUNCTION agents.can_manage_ai_lenser(uuid) OWNER TO postgres;

COMMENT ON FUNCTION agents.can_manage_ai_lenser(uuid) IS
  'Owner/co-owner authorization helper for control-room tables and RPCs.';

GRANT EXECUTE ON FUNCTION agents.can_manage_ai_lenser(uuid) TO authenticated, service_role;

-- ─── 3. Agent control room tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  scratchpad jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_status_check CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT teams_name_length_check CHECK (char_length(trim(name)) BETWEEN 1 AND 120)
);

COMMENT ON TABLE agents.teams IS
  'Owner-managed agent teams for an AI workspace control room.';

CREATE TABLE IF NOT EXISTS agents.personality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  name text NOT NULL,
  tone text NOT NULL DEFAULT 'balanced',
  expertise_level text NOT NULL DEFAULT 'specialist',
  risk_tolerance text NOT NULL DEFAULT 'moderate',
  autonomy_level text NOT NULL DEFAULT 'guided',
  communication_style text NOT NULL DEFAULT 'concise',
  decision_style text NOT NULL DEFAULT 'evidence_first',
  escalation_behavior text NOT NULL DEFAULT 'ask_when_blocked',
  system_prompt_patch text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents.memory_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope_type text NOT NULL DEFAULT 'project',
  isolation_mode text NOT NULL DEFAULT 'isolated',
  retention_days integer NOT NULL DEFAULT 30,
  visibility text NOT NULL DEFAULT 'private',
  summary_strategy text NOT NULL DEFAULT 'rolling_summary',
  reset_policy text NOT NULL DEFAULT 'manual',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_profiles_retention_days_check CHECK (retention_days >= 0)
);

CREATE TABLE IF NOT EXISTS agents.tool_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  name text NOT NULL,
  allow_tools text[] NOT NULL DEFAULT '{}'::text[],
  deny_tools text[] NOT NULL DEFAULT '{}'::text[],
  tool_groups text[] NOT NULL DEFAULT '{}'::text[],
  provider_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_approval boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents.model_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider_key text,
  model_id uuid REFERENCES ai.models(id) ON DELETE SET NULL,
  model_key text,
  support_level text NOT NULL DEFAULT 'runnable',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES agents.teams(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator',
  responsibility text NOT NULL DEFAULT '',
  lane integer NOT NULL DEFAULT 0,
  personality_profile_id uuid REFERENCES agents.personality_profiles(id) ON DELETE SET NULL,
  memory_profile_id uuid REFERENCES agents.memory_profiles(id) ON DELETE SET NULL,
  tool_profile_id uuid REFERENCES agents.tool_profiles(id) ON DELETE SET NULL,
  model_profile_id uuid REFERENCES agents.model_profiles(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_members_unique_agent UNIQUE (team_id, agent_id)
);

CREATE TABLE IF NOT EXISTS agents.team_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES agents.teams(id) ON DELETE CASCADE,
  source_member_id uuid NOT NULL REFERENCES agents.team_members(id) ON DELETE CASCADE,
  target_member_id uuid NOT NULL REFERENCES agents.team_members(id) ON DELETE CASCADE,
  edge_type text NOT NULL DEFAULT 'delegates',
  is_blocking boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_edges_edge_type_check CHECK (edge_type IN (
    'delegates', 'reviews', 'reports_to', 'shares_context', 'handoff'
  )),
  CONSTRAINT team_edges_no_self_loop CHECK (source_member_id <> target_member_id)
);

CREATE TABLE IF NOT EXISTS agents.workflow_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  assignee_kind text NOT NULL DEFAULT 'agent',
  assignee_ai_lenser_id uuid REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  assignee_team_id uuid REFERENCES agents.teams(id) ON DELETE CASCADE,
  approval_policy jsonb NOT NULL DEFAULT '{"requiresApproval":true}'::jsonb,
  retry_policy jsonb NOT NULL DEFAULT '{"maxRetries":1}'::jsonb,
  failure_policy jsonb NOT NULL DEFAULT '{"mode":"isolate"}'::jsonb,
  queue_policy jsonb NOT NULL DEFAULT '{"mode":"parallel"}'::jsonb,
  output_destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_assignments_assignee_kind_check CHECK (assignee_kind IN ('agent', 'team')),
  CONSTRAINT workflow_assignments_target_check CHECK (
    (assignee_kind = 'agent' AND assignee_ai_lenser_id IS NOT NULL AND assignee_team_id IS NULL) OR
    (assignee_kind = 'team' AND assignee_team_id IS NOT NULL AND assignee_ai_lenser_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS agents.team_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  team_id uuid REFERENCES agents.teams(id) ON DELETE SET NULL,
  workflow_id uuid REFERENCES lenses.workflows(id) ON DELETE SET NULL,
  workflow_run_id uuid REFERENCES lenses.workflow_runs(id) ON DELETE SET NULL,
  workflow_assignment_id uuid REFERENCES agents.workflow_assignments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  approval_status text NOT NULL DEFAULT 'pending',
  scratchpad jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_runs_status_check CHECK (status IN (
    'queued', 'running', 'completed', 'failed', 'cancelled', 'blocked'
  )),
  CONSTRAINT team_runs_approval_status_check CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'not_required'
  ))
);

CREATE TABLE IF NOT EXISTS agents.agent_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_run_id uuid NOT NULL REFERENCES agents.team_runs(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES agents.team_members(id) ON DELETE SET NULL,
  workflow_node_id uuid REFERENCES lenses.workflow_nodes(id) ON DELETE SET NULL,
  lane integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT 'Task',
  current_task text,
  recent_output_summary text,
  blocker_summary text,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_run_steps_status_check CHECK (status IN (
    'queued', 'running', 'completed', 'failed', 'blocked', 'skipped'
  ))
);

CREATE TABLE IF NOT EXISTS agents.agent_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_run_id uuid NOT NULL REFERENCES agents.team_runs(id) ON DELETE CASCADE,
  agent_run_step_id uuid REFERENCES agents.agent_run_steps(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_teams_ai_lenser ON agents.teams (ai_lenser_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_team_members_team ON agents.team_members (team_id, sort_order, lane);
CREATE INDEX IF NOT EXISTS idx_agents_workflow_assignments_ai_lenser ON agents.workflow_assignments (ai_lenser_id, workflow_id);
CREATE INDEX IF NOT EXISTS idx_agents_team_runs_ai_lenser ON agents.team_runs (ai_lenser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_agent_run_steps_team_run ON agents.agent_run_steps (team_run_id, lane, created_at);
CREATE INDEX IF NOT EXISTS idx_agents_agent_run_events_team_run ON agents.agent_run_events (team_run_id, occurred_at DESC);

-- ─── 4. Extended workflow scheduling ────────────────────────────────────────

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignee_type text NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS workflow_assignment_id uuid,
  ADD COLUMN IF NOT EXISTS approval_policy jsonb NOT NULL DEFAULT '{"requiresApproval":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_policy jsonb NOT NULL DEFAULT '{"maxRetries":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS failure_policy jsonb NOT NULL DEFAULT '{"mode":"isolate"}'::jsonb,
  ADD COLUMN IF NOT EXISTS queue_policy jsonb NOT NULL DEFAULT '{"mode":"parallel"}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_result jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE lenses.workflow_schedules
  DROP CONSTRAINT IF EXISTS workflow_schedules_assignee_type_check;

ALTER TABLE lenses.workflow_schedules
  ADD CONSTRAINT workflow_schedules_assignee_type_check
  CHECK (assignee_type IN ('agent', 'team'));

ALTER TABLE lenses.workflow_schedules
  DROP CONSTRAINT IF EXISTS workflow_schedules_workflow_assignment_id_fkey;

ALTER TABLE lenses.workflow_schedules
  ADD CONSTRAINT workflow_schedules_workflow_assignment_id_fkey
  FOREIGN KEY (workflow_assignment_id) REFERENCES agents.workflow_assignments(id) ON DELETE SET NULL;

COMMENT ON COLUMN lenses.workflow_schedules.timezone IS
  'IANA timezone used for CRON evaluation and next-run display.';

COMMENT ON COLUMN lenses.workflow_schedules.assignee_type IS
  'Whether this schedule targets a single agent or an agent team.';

COMMENT ON COLUMN lenses.workflow_schedules.assignee_id IS
  'Polymorphic target identifier. Resolves to agents.ai_lensers.id for agent schedules or agents.teams.id for team schedules.';

COMMENT ON COLUMN lenses.workflow_schedules.workflow_assignment_id IS
  'Optional explicit workflow assignment backing this schedule.';

-- ─── 5. RLS + grants ────────────────────────────────────────────────────────

ALTER TABLE agents.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.team_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.tool_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.workflow_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.team_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_run_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_owner_all ON agents.teams;
CREATE POLICY teams_owner_all ON agents.teams
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS personality_profiles_owner_all ON agents.personality_profiles;
CREATE POLICY personality_profiles_owner_all ON agents.personality_profiles
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS memory_profiles_owner_all ON agents.memory_profiles;
CREATE POLICY memory_profiles_owner_all ON agents.memory_profiles
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS tool_profiles_owner_all ON agents.tool_profiles;
CREATE POLICY tool_profiles_owner_all ON agents.tool_profiles
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS model_profiles_owner_all ON agents.model_profiles;
CREATE POLICY model_profiles_owner_all ON agents.model_profiles
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS workflow_assignments_owner_all ON agents.workflow_assignments;
CREATE POLICY workflow_assignments_owner_all ON agents.workflow_assignments
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS team_members_owner_all ON agents.team_members;
CREATE POLICY team_members_owner_all ON agents.team_members
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM agents.teams t
      WHERE t.id = team_members.team_id
        AND agents.can_manage_ai_lenser(t.ai_lenser_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agents.teams t
      WHERE t.id = team_members.team_id
        AND agents.can_manage_ai_lenser(t.ai_lenser_id)
    )
  );

DROP POLICY IF EXISTS team_edges_owner_all ON agents.team_edges;
CREATE POLICY team_edges_owner_all ON agents.team_edges
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM agents.teams t
      WHERE t.id = team_edges.team_id
        AND agents.can_manage_ai_lenser(t.ai_lenser_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agents.teams t
      WHERE t.id = team_edges.team_id
        AND agents.can_manage_ai_lenser(t.ai_lenser_id)
    )
  );

DROP POLICY IF EXISTS team_runs_owner_all ON agents.team_runs;
CREATE POLICY team_runs_owner_all ON agents.team_runs
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS agent_run_steps_owner_all ON agents.agent_run_steps;
CREATE POLICY agent_run_steps_owner_all ON agents.agent_run_steps
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM agents.team_runs tr
      WHERE tr.id = agent_run_steps.team_run_id
        AND agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agents.team_runs tr
      WHERE tr.id = agent_run_steps.team_run_id
        AND agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  );

DROP POLICY IF EXISTS agent_run_events_owner_all ON agents.agent_run_events;
CREATE POLICY agent_run_events_owner_all ON agents.agent_run_events
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM agents.team_runs tr
      WHERE tr.id = agent_run_events.team_run_id
        AND agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agents.team_runs tr
      WHERE tr.id = agent_run_events.team_run_id
        AND agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.team_edges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.personality_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.memory_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.tool_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.model_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.workflow_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.team_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.agent_run_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.agent_run_events TO authenticated;

-- ─── 6. Catalog RPCs ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_ai_catalog_providers()
RETURNS TABLE (
  id uuid,
  key text,
  display_name text,
  base_url text,
  docs_url text,
  support_level text,
  logo_slug text,
  metadata jsonb,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT
    p.id,
    p.key,
    p.display_name,
    p.base_url,
    p.docs_url,
    p.support_level,
    p.logo_slug,
    p.metadata,
    p.is_active
  FROM ai.providers p
  ORDER BY
    CASE p.support_level
      WHEN 'runnable' THEN 0
      WHEN 'byok_only' THEN 1
      WHEN 'catalog_only' THEN 2
      ELSE 3
    END,
    p.display_name;
$$;

ALTER FUNCTION public.fn_ai_catalog_providers() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_ai_catalog_providers() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_ai_catalog_models(
  p_provider_key text DEFAULT NULL,
  p_support_level text DEFAULT NULL,
  p_capability text DEFAULT NULL,
  p_modality text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  provider_id uuid,
  provider_key text,
  provider_name text,
  key text,
  name text,
  description text,
  docs_url text,
  support_level text,
  status text,
  capabilities text[],
  input_modalities text[],
  output_modalities text[],
  context_window_tokens integer,
  supports_tools boolean,
  supports_json_schema boolean,
  supports_vision boolean,
  supports_streaming boolean,
  use_cases text[],
  developer_summary text,
  user_summary text,
  metadata jsonb,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT
    m.id,
    m.provider_id,
    p.key AS provider_key,
    p.display_name AS provider_name,
    m.key,
    m.name,
    m.description,
    COALESCE(m.docs_url, m.provider_url),
    m.support_level,
    m.status,
    m.capabilities,
    m.input_modalities,
    m.output_modalities,
    m.context_window_tokens,
    m.supports_tools,
    m.supports_json_schema,
    m.supports_vision,
    m.supports_streaming,
    m.use_cases,
    m.developer_summary,
    m.user_summary,
    m.metadata,
    m.is_active
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
  WHERE (p_provider_key IS NULL OR p.key = p_provider_key)
    AND (p_support_level IS NULL OR m.support_level = p_support_level)
    AND (p_capability IS NULL OR p_capability = ANY (m.capabilities))
    AND (
      p_modality IS NULL OR
      p_modality = ANY (m.input_modalities) OR
      p_modality = ANY (m.output_modalities)
    )
  ORDER BY
    CASE m.support_level
      WHEN 'runnable' THEN 0
      WHEN 'byok_only' THEN 1
      WHEN 'catalog_only' THEN 2
      ELSE 3
    END,
    p.display_name,
    m.name;
$$;

ALTER FUNCTION public.fn_ai_catalog_models(text, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_ai_catalog_models(text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_ai_catalog_model_detail(
  p_provider_key text,
  p_model_key text
)
RETURNS TABLE (
  id uuid,
  provider_id uuid,
  provider_key text,
  provider_name text,
  key text,
  name text,
  description text,
  docs_url text,
  support_level text,
  status text,
  capabilities text[],
  input_modalities text[],
  output_modalities text[],
  context_window_tokens integer,
  supports_tools boolean,
  supports_json_schema boolean,
  supports_vision boolean,
  supports_streaming boolean,
  use_cases text[],
  developer_summary text,
  user_summary text,
  metadata jsonb,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT *
  FROM public.fn_ai_catalog_models(p_provider_key, NULL, NULL, NULL)
  WHERE key = p_model_key
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_ai_catalog_model_detail(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_ai_catalog_model_detail(text, text) TO anon, authenticated, service_role;

-- ─── 7. Extended workflow schedule RPCs ─────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_get_workflow_schedules(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_workflow_schedules(
  p_workflow_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  workflow_title text,
  cron_expr text,
  timezone text,
  global_model_id text,
  inputs_template jsonb,
  is_active boolean,
  assignee_type text,
  assignee_id uuid,
  workflow_assignment_id uuid,
  approval_policy jsonb,
  retry_policy jsonb,
  failure_policy jsonb,
  queue_policy jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_id uuid,
  last_dispatch_status text,
  last_error_at timestamptz,
  last_error_message text,
  last_completed_at timestamptz,
  last_result jsonb,
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
    s.timezone,
    s.global_model_id,
    s.inputs_template,
    s.is_active,
    s.assignee_type,
    s.assignee_id,
    s.workflow_assignment_id,
    s.approval_policy,
    s.retry_policy,
    s.failure_policy,
    s.queue_policy,
    s.next_run_at,
    s.last_run_at,
    s.last_run_id,
    s.last_dispatch_status,
    s.last_error_at,
    s.last_error_message,
    s.last_completed_at,
    s.last_result,
    s.created_at
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  WHERE w.lenser_id = lensers.get_auth_lenser_id()
    AND (p_workflow_id IS NULL OR s.workflow_id = p_workflow_id)
  ORDER BY s.created_at DESC;
$$;

ALTER FUNCTION public.fn_get_workflow_schedules(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_schedules(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_upsert_workflow_schedule(uuid, uuid, text, text, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id uuid,
  p_schedule_id uuid DEFAULT NULL,
  p_cron_expr text DEFAULT '* * * * *',
  p_timezone text DEFAULT 'UTC',
  p_global_model_id text DEFAULT NULL,
  p_inputs_template jsonb DEFAULT '{}'::jsonb,
  p_is_active boolean DEFAULT true,
  p_assignee_type text DEFAULT 'agent',
  p_assignee_id uuid DEFAULT NULL,
  p_workflow_assignment_id uuid DEFAULT NULL,
  p_approval_policy jsonb DEFAULT '{"requiresApproval":true}'::jsonb,
  p_retry_policy jsonb DEFAULT '{"maxRetries":1}'::jsonb,
  p_failure_policy jsonb DEFAULT '{"mode":"isolate"}'::jsonb,
  p_queue_policy jsonb DEFAULT '{"mode":"parallel"}'::jsonb
) RETURNS TABLE(
  id uuid,
  workflow_id uuid,
  workflow_title text,
  cron_expr text,
  timezone text,
  global_model_id text,
  inputs_template jsonb,
  is_active boolean,
  assignee_type text,
  assignee_id uuid,
  workflow_assignment_id uuid,
  approval_policy jsonb,
  retry_policy jsonb,
  failure_policy jsonb,
  queue_policy jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_id uuid,
  last_dispatch_status text,
  last_error_at timestamptz,
  last_error_message text,
  last_completed_at timestamptz,
  last_result jsonb,
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

  IF p_assignee_type NOT IN ('agent', 'team') THEN
    RAISE EXCEPTION 'Invalid assignee type. Expected agent or team.'
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
      timezone,
      global_model_id,
      inputs_template,
      is_active,
      assignee_type,
      assignee_id,
      workflow_assignment_id,
      approval_policy,
      retry_policy,
      failure_policy,
      queue_policy
    ) VALUES (
      p_workflow_id,
      p_cron_expr,
      COALESCE(NULLIF(trim(p_timezone), ''), 'UTC'),
      p_global_model_id,
      COALESCE(p_inputs_template, '{}'::jsonb),
      p_is_active,
      p_assignee_type,
      p_assignee_id,
      p_workflow_assignment_id,
      COALESCE(p_approval_policy, '{"requiresApproval":true}'::jsonb),
      COALESCE(p_retry_policy, '{"maxRetries":1}'::jsonb),
      COALESCE(p_failure_policy, '{"mode":"isolate"}'::jsonb),
      COALESCE(p_queue_policy, '{"mode":"parallel"}'::jsonb)
    )
    RETURNING workflow_schedules.id INTO v_schedule_id;
  ELSE
    UPDATE lenses.workflow_schedules s
    SET
      cron_expr = p_cron_expr,
      timezone = COALESCE(NULLIF(trim(p_timezone), ''), s.timezone, 'UTC'),
      global_model_id = p_global_model_id,
      inputs_template = COALESCE(p_inputs_template, '{}'::jsonb),
      is_active = p_is_active,
      assignee_type = p_assignee_type,
      assignee_id = p_assignee_id,
      workflow_assignment_id = p_workflow_assignment_id,
      approval_policy = COALESCE(p_approval_policy, s.approval_policy, '{}'::jsonb),
      retry_policy = COALESCE(p_retry_policy, s.retry_policy, '{}'::jsonb),
      failure_policy = COALESCE(p_failure_policy, s.failure_policy, '{}'::jsonb),
      queue_policy = COALESCE(p_queue_policy, s.queue_policy, '{}'::jsonb),
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

ALTER FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;

-- ─── 8. Workspace bootstrap RPC ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_agent_workspace_bootstrap(
  p_profile_handle text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'lenses'
AS $$
DECLARE
  v_profile_id uuid;
  v_ai_lenser_id uuid;
  v_owner_ok boolean;
BEGIN
  SELECT p.id, al.id
  INTO v_profile_id, v_ai_lenser_id
  FROM lensers.profiles p
  JOIN agents.ai_lensers al ON al.profile_id = p.id
  WHERE p.handle = p_profile_handle
    AND p.type = 'ai'
  LIMIT 1;

  IF v_ai_lenser_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT agents.can_manage_ai_lenser(v_ai_lenser_id) INTO v_owner_ok;
  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI workspace'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'profile_id', v_profile_id,
    'ai_lenser_id', v_ai_lenser_id,
    'teams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'ai_lenser_id', t.ai_lenser_id,
          'name', t.name,
          'description', t.description,
          'status', t.status,
          'is_active', t.is_active,
          'scratchpad', t.scratchpad,
          'member_count', (
            SELECT count(*) FROM agents.team_members tm WHERE tm.team_id = t.id AND tm.is_active = true
          ),
          'members', COALESCE((
            SELECT jsonb_agg(tm ORDER BY tm.lane, tm.sort_order, tm.created_at)
            FROM agents.team_members tm
            WHERE tm.team_id = t.id
          ), '[]'::jsonb),
          'edges', COALESCE((
            SELECT jsonb_agg(te ORDER BY te.created_at)
            FROM agents.team_edges te
            WHERE te.team_id = t.id
          ), '[]'::jsonb),
          'created_at', t.created_at,
          'updated_at', t.updated_at
        )
        ORDER BY t.updated_at DESC
      )
      FROM agents.teams t
      WHERE t.ai_lenser_id = v_ai_lenser_id
    ), '[]'::jsonb),
    'runs', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tr.id,
          'team_id', tr.team_id,
          'workflow_id', tr.workflow_id,
          'workflow_run_id', tr.workflow_run_id,
          'status', tr.status,
          'approval_status', tr.approval_status,
          'started_at', tr.started_at,
          'completed_at', tr.completed_at,
          'created_at', tr.created_at,
          'metadata', tr.metadata
        )
        ORDER BY tr.created_at DESC
      )
      FROM agents.team_runs tr
      WHERE tr.ai_lenser_id = v_ai_lenser_id
      LIMIT 20
    ), '[]'::jsonb),
    'profiles', jsonb_build_object(
      'personality', COALESCE((SELECT jsonb_agg(pp ORDER BY pp.updated_at DESC) FROM agents.personality_profiles pp WHERE pp.ai_lenser_id = v_ai_lenser_id), '[]'::jsonb),
      'memory', COALESCE((SELECT jsonb_agg(mp ORDER BY mp.updated_at DESC) FROM agents.memory_profiles mp WHERE mp.ai_lenser_id = v_ai_lenser_id), '[]'::jsonb),
      'tools', COALESCE((SELECT jsonb_agg(tp ORDER BY tp.updated_at DESC) FROM agents.tool_profiles tp WHERE tp.ai_lenser_id = v_ai_lenser_id), '[]'::jsonb),
      'models', COALESCE((SELECT jsonb_agg(modp ORDER BY modp.updated_at DESC) FROM agents.model_profiles modp WHERE modp.ai_lenser_id = v_ai_lenser_id), '[]'::jsonb)
    ),
    'workflow_assignments', COALESCE((
      SELECT jsonb_agg(wa ORDER BY wa.updated_at DESC)
      FROM agents.workflow_assignments wa
      WHERE wa.ai_lenser_id = v_ai_lenser_id
    ), '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.fn_get_agent_workspace_bootstrap(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_workspace_bootstrap(text) TO authenticated, service_role;
