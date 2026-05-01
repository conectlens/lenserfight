-- =============================================================================
-- 20260503030000_autonomous_agent_os_phase8.sql
-- -----------------------------------------------------------------------------
-- Phase 8: Autonomous Agent OS — run governance, policy evaluation, and
-- post-run reporting.
--
-- Builds on Phase 7 tooling (agents.tool_invocations / tool_assignments /
-- tools_registry). This migration adds:
--   * agents.workspace_settings          - 6 new governance columns
--   * agents.run_reports                 - immutable post-run summary records
--   * agents.run_incidents               - incident log per report
--   * agents.policy_evaluations          - immutable pre-run/pre-tool audit log
--   * agents.v_run_unified               - union view over team_runs + orphan workflow_runs
--   * fn_cancel_run                      - cancel a team run and propagate
--   * fn_pause_agent / fn_resume_agent   - per-agent pause toggle
--   * fn_toggle_kill_switch              - global kill switch per workspace
--   * fn_evaluate_pre_run_policy         - ordered policy check returning verdict
--   * fn_create_run_report               - generate an immutable run report
--   * fn_record_run_incident             - attach an incident to a report
--   * fn_update_workspace_settings       - extended upsert with new columns
-- =============================================================================

-- ─── 1. ALTER TABLE agents.workspace_settings ────────────────────────────────

ALTER TABLE agents.workspace_settings
  ADD COLUMN IF NOT EXISTS max_parallel_runs  integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS global_kill_switch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_paused       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dark_launch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dark_launch_pct    integer NOT NULL DEFAULT 0
    CHECK (dark_launch_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS budget_enforce     boolean NOT NULL DEFAULT true;

-- ─── 2. CREATE TABLE agents.run_reports ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.run_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id            uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  team_run_id             uuid NULL REFERENCES agents.team_runs(id) ON DELETE SET NULL,
  workflow_run_id         uuid NULL REFERENCES lenses.workflow_runs(id) ON DELETE SET NULL,
  title                   text NOT NULL,
  summary                 text NULL,
  metrics                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_steps             integer NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  total_tool_invocations  integer NOT NULL DEFAULT 0 CHECK (total_tool_invocations >= 0),
  total_memory_writes     integer NOT NULL DEFAULT 0 CHECK (total_memory_writes >= 0),
  total_cost_estimate     numeric NOT NULL DEFAULT 0 CHECK (total_cost_estimate >= 0),
  evaluation_score        numeric NULL,
  outcome                 text NOT NULL
    CHECK (outcome IN ('success','partial','failed','cancelled','killed')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. CREATE TABLE agents.run_incidents ────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.run_incidents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_report_id   uuid NOT NULL REFERENCES agents.run_reports(id) ON DELETE CASCADE,
  ai_lenser_id    uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  incident_type   text NOT NULL
    CHECK (incident_type IN (
      'tool_failure','budget_exceeded','policy_violation','timeout',
      'step_failure','approval_rejected','kill_switch'
    )),
  severity        text NOT NULL
    CHECK (severity IN ('low','medium','high','critical')),
  title           text NOT NULL,
  description     text NULL,
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at     timestamptz NULL,
  resolution      text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. CREATE TABLE agents.policy_evaluations ───────────────────────────────

CREATE TABLE IF NOT EXISTS agents.policy_evaluations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id        uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  team_run_id         uuid NULL REFERENCES agents.team_runs(id) ON DELETE SET NULL,
  tool_invocation_id  uuid NULL REFERENCES agents.tool_invocations(id) ON DELETE SET NULL,
  evaluation_point    text NOT NULL
    CHECK (evaluation_point IN ('pre_run','pre_side_effect','pre_tool')),
  policy_type         text NOT NULL
    CHECK (policy_type IN (
      'budget','kill_switch','pause','parallel_limit','dark_launch','approval'
    )),
  verdict             text NOT NULL
    CHECK (verdict IN ('allow','deny','pause','require_approval')),
  reason              text NULL,
  context             jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. Indexes ──────────────────────────────────────────────────────────────

-- run_reports
CREATE INDEX IF NOT EXISTS idx_run_reports_ai_lenser
  ON agents.run_reports (ai_lenser_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_reports_team_run
  ON agents.run_reports (team_run_id)
  WHERE team_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_run_reports_outcome
  ON agents.run_reports (outcome, created_at DESC);

-- run_incidents
CREATE INDEX IF NOT EXISTS idx_run_incidents_report
  ON agents.run_incidents (run_report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_incidents_agent_type
  ON agents.run_incidents (ai_lenser_id, incident_type);

CREATE INDEX IF NOT EXISTS idx_run_incidents_severity
  ON agents.run_incidents (severity, created_at DESC);

-- policy_evaluations
CREATE INDEX IF NOT EXISTS idx_policy_evals_agent_at
  ON agents.policy_evaluations (ai_lenser_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_evals_team_run
  ON agents.policy_evaluations (team_run_id)
  WHERE team_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_policy_evals_deny
  ON agents.policy_evaluations (ai_lenser_id, evaluated_at DESC)
  WHERE verdict = 'deny';

-- ─── 6. RLS ──────────────────────────────────────────────────────────────────

-- run_reports: immutable — SELECT + INSERT only for authenticated
ALTER TABLE agents.run_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS run_reports_owner_select ON agents.run_reports;
CREATE POLICY run_reports_owner_select ON agents.run_reports
  FOR SELECT
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS run_reports_owner_insert ON agents.run_reports;
CREATE POLICY run_reports_owner_insert ON agents.run_reports
  FOR INSERT
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.run_reports TO service_role;
GRANT SELECT, INSERT ON agents.run_reports TO authenticated;

-- run_incidents: full CRUD for owners + service_role
ALTER TABLE agents.run_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS run_incidents_owner_all ON agents.run_incidents;
CREATE POLICY run_incidents_owner_all ON agents.run_incidents
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.run_incidents TO authenticated, service_role;

-- policy_evaluations: immutable audit log — SELECT + INSERT only for authenticated
ALTER TABLE agents.policy_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_evaluations_owner_select ON agents.policy_evaluations;
CREATE POLICY policy_evaluations_owner_select ON agents.policy_evaluations
  FOR SELECT
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS policy_evaluations_owner_insert ON agents.policy_evaluations;
CREATE POLICY policy_evaluations_owner_insert ON agents.policy_evaluations
  FOR INSERT
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.policy_evaluations TO service_role;
GRANT SELECT, INSERT ON agents.policy_evaluations TO authenticated;

-- ─── 7. VIEW agents.v_run_unified ────────────────────────────────────────────

DROP VIEW IF EXISTS agents.v_run_unified;
CREATE OR REPLACE VIEW agents.v_run_unified AS

-- Branch 1: team_runs (explicit agent runs)
SELECT
  tr.id                                                             AS run_id,
  'team'::text                                                      AS run_type,
  tr.ai_lenser_id,
  tr.status,
  tr.approval_status,
  COALESCE(ti_agg.total_cost, 0)                                    AS total_cost,
  COALESCE(step_agg.step_count, 0)                                  AS step_count,
  COALESCE(mem_agg.memory_write_count, 0)                           AS memory_write_count,
  eval_agg.latest_score                                             AS latest_evaluation_score,
  tr.started_at,
  tr.completed_at,
  CASE
    WHEN tr.started_at IS NOT NULL AND tr.completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (tr.completed_at - tr.started_at))
    ELSE NULL
  END                                                               AS duration_seconds
FROM agents.team_runs tr
LEFT JOIN (
  SELECT team_run_id,
         SUM(cost_estimate) AS total_cost
    FROM agents.tool_invocations
   GROUP BY team_run_id
) ti_agg ON ti_agg.team_run_id = tr.id
LEFT JOIN (
  SELECT team_run_id,
         COUNT(*) AS step_count
    FROM agents.agent_run_steps
   GROUP BY team_run_id
) step_agg ON step_agg.team_run_id = tr.id
LEFT JOIN (
  SELECT team_run_id,
         COUNT(*) AS memory_write_count
    FROM agents.memories
   WHERE source IN ('agent','tool')
   GROUP BY team_run_id
) mem_agg ON mem_agg.team_run_id = tr.id
LEFT JOIN LATERAL (
  SELECT er.score AS latest_score
    FROM agents.evaluation_runs er
    JOIN agents.evaluations e ON e.id = er.evaluation_id
   WHERE e.target_type = 'workflow'
     AND e.target_id   = tr.workflow_id
     AND er.status     = 'completed'
   ORDER BY er.completed_at DESC NULLS LAST
   LIMIT 1
) eval_agg ON true
WHERE tr.workflow_id IS NOT NULL
  AND agents.can_manage_ai_lenser(tr.ai_lenser_id)

UNION ALL

-- Branch 2: orphan workflow_runs (not linked to any team_run)
SELECT
  wr.id                                                             AS run_id,
  'workflow'::text                                                  AS run_type,
  wr.ai_lenser_id,
  wr.status,
  NULL::text                                                        AS approval_status,
  COALESCE(wr.spent_credits, 0)                                     AS total_cost,
  0                                                                 AS step_count,
  0                                                                 AS memory_write_count,
  NULL::numeric                                                     AS latest_evaluation_score,
  wr.started_at,
  wr.completed_at,
  CASE
    WHEN wr.started_at IS NOT NULL AND wr.completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at))
    ELSE NULL
  END                                                               AS duration_seconds
FROM lenses.workflow_runs wr
WHERE wr.ai_lenser_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
      FROM agents.team_runs tr2
     WHERE tr2.workflow_run_id = wr.id
  )
  AND agents.can_manage_ai_lenser(wr.ai_lenser_id);

GRANT SELECT ON agents.v_run_unified TO authenticated, service_role;

-- ─── 8. RPCs ─────────────────────────────────────────────────────────────────

-- ─── fn_cancel_run ───────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_cancel_run(uuid);
CREATE OR REPLACE FUNCTION public.fn_cancel_run(
  p_team_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_run agents.team_runs;
BEGIN
  SELECT * INTO v_run
    FROM agents.team_runs
   WHERE id = p_team_run_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team run not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_run.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  IF v_run.status IN ('completed','failed','cancelled') THEN
    RAISE EXCEPTION 'run already terminal' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.team_runs
     SET status       = 'cancelled',
         completed_at = now()
   WHERE id = p_team_run_id;

  IF v_run.workflow_run_id IS NOT NULL THEN
    UPDATE lenses.workflow_runs
       SET status       = 'cancelled',
           completed_at = COALESCE(completed_at, now())
     WHERE id = v_run.workflow_run_id
       AND status NOT IN ('completed','failed','cancelled');
  END IF;

  INSERT INTO agents.agent_run_events (
    team_run_id,
    event_type,
    payload,
    occurred_at
  ) VALUES (
    p_team_run_id,
    'run_cancelled',
    jsonb_build_object(
      'cancelled_by',     auth.uid(),
      'previous_status',  v_run.status
    ),
    now()
  );

  INSERT INTO agents.policy_evaluations (
    ai_lenser_id,
    team_run_id,
    evaluation_point,
    policy_type,
    verdict,
    reason,
    context,
    evaluated_at
  ) VALUES (
    v_run.ai_lenser_id,
    p_team_run_id,
    'pre_run',
    'kill_switch',
    'deny',
    'run cancelled by owner',
    jsonb_build_object('cancelled_by', auth.uid()),
    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_run(uuid) TO authenticated, service_role;

-- ─── fn_pause_agent ──────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_pause_agent(uuid);
CREATE OR REPLACE FUNCTION public.fn_pause_agent(
  p_ai_lenser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id, agent_paused)
  VALUES (p_ai_lenser_id, true)
  ON CONFLICT (ai_lenser_id) DO UPDATE
    SET agent_paused = true,
        updated_at   = now();

  INSERT INTO agents.policy_evaluations (
    ai_lenser_id,
    evaluation_point,
    policy_type,
    verdict,
    reason,
    context,
    evaluated_at
  ) VALUES (
    p_ai_lenser_id,
    'pre_run',
    'pause',
    'deny',
    'agent paused by owner',
    jsonb_build_object('paused_by', auth.uid()),
    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_pause_agent(uuid) TO authenticated, service_role;

-- ─── fn_resume_agent ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_resume_agent(uuid);
CREATE OR REPLACE FUNCTION public.fn_resume_agent(
  p_ai_lenser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id, agent_paused)
  VALUES (p_ai_lenser_id, false)
  ON CONFLICT (ai_lenser_id) DO UPDATE
    SET agent_paused = false,
        updated_at   = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resume_agent(uuid) TO authenticated, service_role;

-- ─── fn_toggle_kill_switch ───────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_toggle_kill_switch(uuid, boolean);
CREATE OR REPLACE FUNCTION public.fn_toggle_kill_switch(
  p_ai_lenser_id uuid,
  p_enabled      boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id, global_kill_switch)
  VALUES (p_ai_lenser_id, p_enabled)
  ON CONFLICT (ai_lenser_id) DO UPDATE
    SET global_kill_switch = p_enabled,
        updated_at         = now();

  IF p_enabled THEN
    INSERT INTO agents.policy_evaluations (
      ai_lenser_id,
      evaluation_point,
      policy_type,
      verdict,
      reason,
      context,
      evaluated_at
    ) VALUES (
      p_ai_lenser_id,
      'pre_run',
      'kill_switch',
      'deny',
      'global kill switch activated',
      jsonb_build_object('activated_by', auth.uid()),
      now()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_toggle_kill_switch(uuid, boolean) TO authenticated, service_role;

-- ─── fn_evaluate_pre_run_policy ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_evaluate_pre_run_policy(uuid, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.fn_evaluate_pre_run_policy(
  p_ai_lenser_id uuid,
  p_workflow_id  uuid,
  p_context      jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (verdict text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_settings        agents.workspace_settings;
  v_credits_used    numeric;
  v_active_runs     integer;
  v_workflow_hash   integer;
  v_verdict         text;
  v_reason          text;
  v_policy_type     text;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  -- Load or default settings
  SELECT * INTO v_settings
    FROM agents.workspace_settings
   WHERE ai_lenser_id = p_ai_lenser_id;

  IF NOT FOUND THEN
    -- All defaults: allow
    v_verdict     := 'allow';
    v_reason      := NULL;
    v_policy_type := 'kill_switch';

    INSERT INTO agents.policy_evaluations (
      ai_lenser_id, team_run_id, tool_invocation_id,
      evaluation_point, policy_type, verdict, reason, context, evaluated_at
    ) VALUES (
      p_ai_lenser_id, NULL, NULL,
      'pre_run', v_policy_type, v_verdict, v_reason,
      COALESCE(p_context, '{}'::jsonb), now()
    );

    RETURN QUERY SELECT v_verdict, v_reason;
    RETURN;
  END IF;

  -- 1. Global kill switch
  IF v_settings.global_kill_switch THEN
    v_verdict     := 'deny';
    v_reason      := 'global kill switch active';
    v_policy_type := 'kill_switch';

  -- 2. Agent paused
  ELSIF v_settings.agent_paused THEN
    v_verdict     := 'pause';
    v_reason      := 'agent is paused';
    v_policy_type := 'pause';

  -- 3. Daily budget
  ELSIF v_settings.budget_enforce THEN
    SELECT COALESCE(SUM(credits_spent), 0)
      INTO v_credits_used
      FROM agents.quota_snapshots
     WHERE ai_lenser_id = p_ai_lenser_id
       AND period_date  = CURRENT_DATE;

    IF v_credits_used >= v_settings.max_daily_credits THEN
      v_verdict     := 'deny';
      v_reason      := 'daily budget exceeded';
      v_policy_type := 'budget';
    END IF;
  END IF;

  -- 4. Parallel run limit (only if not already denied above)
  IF v_verdict IS NULL THEN
    SELECT COUNT(*)
      INTO v_active_runs
      FROM agents.team_runs
     WHERE ai_lenser_id = p_ai_lenser_id
       AND status IN ('queued','running','blocked');

    IF v_active_runs >= v_settings.max_parallel_runs THEN
      v_verdict     := 'deny';
      v_reason      := 'max_parallel_runs limit reached';
      v_policy_type := 'parallel_limit';
    END IF;
  END IF;

  -- 5. Dark launch gating
  IF v_verdict IS NULL
     AND v_settings.dark_launch_enabled
     AND p_workflow_id IS NOT NULL
  THEN
    v_workflow_hash := (('x' || md5(p_workflow_id::text))::bit(32)::int & 2147483647) % 100;
    IF v_workflow_hash >= v_settings.dark_launch_pct THEN
      v_verdict     := 'deny';
      v_reason      := 'outside dark launch percentage';
      v_policy_type := 'dark_launch';
    END IF;
  END IF;

  -- 6. Approval default: require_human
  IF v_verdict IS NULL AND v_settings.approval_default = 'require_human' THEN
    v_verdict     := 'require_approval';
    v_reason      := 'workspace default requires human approval';
    v_policy_type := 'approval';
  END IF;

  -- 7. Approval default: deny-all
  IF v_verdict IS NULL AND v_settings.approval_default = 'deny' THEN
    v_verdict     := 'deny';
    v_reason      := 'workspace approval policy is deny-all';
    v_policy_type := 'approval';
  END IF;

  -- 8. Default: allow
  IF v_verdict IS NULL THEN
    v_verdict     := 'allow';
    v_reason      := NULL;
    v_policy_type := 'kill_switch';
  END IF;

  -- Always audit
  INSERT INTO agents.policy_evaluations (
    ai_lenser_id, team_run_id, tool_invocation_id,
    evaluation_point, policy_type, verdict, reason, context, evaluated_at
  ) VALUES (
    p_ai_lenser_id, NULL, NULL,
    'pre_run', v_policy_type, v_verdict, v_reason,
    COALESCE(p_context, '{}'::jsonb), now()
  );

  RETURN QUERY SELECT v_verdict, v_reason;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evaluate_pre_run_policy(uuid, uuid, jsonb) TO authenticated, service_role;

-- ─── fn_create_run_report ─────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_create_run_report(uuid);
CREATE OR REPLACE FUNCTION public.fn_create_run_report(
  p_team_run_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_run               agents.team_runs;
  v_total_steps       integer;
  v_total_tools       integer;
  v_total_cost        numeric;
  v_total_mem_writes  integer;
  v_eval_score        numeric;
  v_outcome           text;
  v_title             text;
  v_metrics           jsonb;
  v_step_statuses     jsonb;
  v_tool_statuses     jsonb;
  v_duration_secs     numeric;
  v_report_id         uuid;
BEGIN
  SELECT * INTO v_run
    FROM agents.team_runs
   WHERE id = p_team_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team run not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_run.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  IF v_run.status NOT IN ('completed','failed','cancelled') THEN
    RAISE EXCEPTION 'run must be terminal before creating a report' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM agents.run_reports WHERE team_run_id = p_team_run_id
  ) THEN
    RAISE EXCEPTION 'report already exists for this run' USING ERRCODE = '23505';
  END IF;

  -- Aggregate step count
  SELECT COUNT(*)
    INTO v_total_steps
    FROM agents.agent_run_steps
   WHERE team_run_id = p_team_run_id;

  -- Aggregate tool count and cost
  SELECT
    COUNT(*),
    COALESCE(SUM(cost_estimate), 0)
  INTO v_total_tools, v_total_cost
    FROM agents.tool_invocations
   WHERE team_run_id = p_team_run_id;

  -- Aggregate memory writes
  SELECT COUNT(*)
    INTO v_total_mem_writes
    FROM agents.memories
   WHERE team_run_id = p_team_run_id
     AND source IN ('agent','tool');

  -- Latest completed evaluation score for the workflow
  SELECT er.score
    INTO v_eval_score
    FROM agents.evaluation_runs er
    JOIN agents.evaluations e ON e.id = er.evaluation_id
   WHERE e.target_type = 'workflow'
     AND e.target_id   = v_run.workflow_id
     AND er.status     = 'completed'
   ORDER BY er.completed_at DESC NULLS LAST
   LIMIT 1;

  -- Detect 'killed': cancelled + kill_switch policy denial
  IF EXISTS (
    SELECT 1
      FROM agents.policy_evaluations
     WHERE team_run_id = p_team_run_id
       AND policy_type = 'kill_switch'
       AND verdict     = 'deny'
  ) AND v_run.status = 'cancelled' THEN
    v_outcome := 'killed';
  ELSE
    CASE v_run.status
      WHEN 'completed' THEN v_outcome := 'success';
      WHEN 'failed'    THEN v_outcome := 'failed';
      WHEN 'cancelled' THEN v_outcome := 'cancelled';
      ELSE                  v_outcome := 'partial';
    END CASE;
  END IF;

  -- Title
  SELECT 'Run Report: ' || COALESCE(w.title, p_team_run_id::text)
    INTO v_title
    FROM lenses.workflows w
   WHERE w.id = v_run.workflow_id;

  IF v_title IS NULL THEN
    v_title := 'Run Report: ' || p_team_run_id::text;
  END IF;

  -- Step status breakdown
  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
    INTO v_step_statuses
    FROM (
      SELECT status, COUNT(*) AS cnt
        FROM agents.agent_run_steps
       WHERE team_run_id = p_team_run_id
       GROUP BY status
    ) s;

  -- Tool status breakdown
  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
    INTO v_tool_statuses
    FROM (
      SELECT status, COUNT(*) AS cnt
        FROM agents.tool_invocations
       WHERE team_run_id = p_team_run_id
       GROUP BY status
    ) t;

  -- Duration
  IF v_run.started_at IS NOT NULL AND v_run.completed_at IS NOT NULL THEN
    v_duration_secs := EXTRACT(EPOCH FROM (v_run.completed_at - v_run.started_at));
  ELSE
    v_duration_secs := NULL;
  END IF;

  -- Compose metrics
  v_metrics := jsonb_build_object(
    'step_statuses',  v_step_statuses,
    'tool_statuses',  v_tool_statuses,
    'duration_seconds', v_duration_secs
  );

  INSERT INTO agents.run_reports (
    ai_lenser_id,
    team_run_id,
    workflow_run_id,
    title,
    metrics,
    total_steps,
    total_tool_invocations,
    total_memory_writes,
    total_cost_estimate,
    evaluation_score,
    outcome
  ) VALUES (
    v_run.ai_lenser_id,
    p_team_run_id,
    v_run.workflow_run_id,
    v_title,
    v_metrics,
    COALESCE(v_total_steps, 0),
    COALESCE(v_total_tools, 0),
    COALESCE(v_total_mem_writes, 0),
    COALESCE(v_total_cost, 0),
    v_eval_score,
    v_outcome
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_run_report(uuid) TO authenticated, service_role;

-- ─── fn_record_run_incident ───────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_record_run_incident(uuid, text, text, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.fn_record_run_incident(
  p_run_report_id  uuid,
  p_incident_type  text,
  p_severity       text,
  p_title          text,
  p_description    text,
  p_context        jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_report    agents.run_reports;
  v_id        uuid;
BEGIN
  SELECT * INTO v_report
    FROM agents.run_reports
   WHERE id = p_run_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run report not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_report.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  IF p_incident_type NOT IN (
    'tool_failure','budget_exceeded','policy_violation','timeout',
    'step_failure','approval_rejected','kill_switch'
  ) THEN
    RAISE EXCEPTION 'invalid incident_type: %', p_incident_type USING ERRCODE = '22023';
  END IF;

  IF p_severity NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'invalid severity: %', p_severity USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.run_incidents (
    run_report_id,
    ai_lenser_id,
    incident_type,
    severity,
    title,
    description,
    context
  ) VALUES (
    p_run_report_id,
    v_report.ai_lenser_id,
    p_incident_type,
    p_severity,
    p_title,
    p_description,
    COALESCE(p_context, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_run_incident(uuid, text, text, text, text, jsonb) TO authenticated, service_role;

-- ─── 9. Replace fn_update_workspace_settings ─────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_update_workspace_settings(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.fn_update_workspace_settings(
  p_ai_lenser_id uuid,
  p_patch        jsonb
)
RETURNS agents.workspace_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_row agents.workspace_settings;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id)
  VALUES (p_ai_lenser_id)
  ON CONFLICT (ai_lenser_id) DO NOTHING;

  UPDATE agents.workspace_settings
  SET default_model_id     = COALESCE((p_patch->>'default_model_id')::uuid,     default_model_id),
      default_provider_key = COALESCE(p_patch->>'default_provider_key',         default_provider_key),
      approval_default     = COALESCE(p_patch->>'approval_default',             approval_default),
      retention_days       = COALESCE((p_patch->>'retention_days')::integer,     retention_days),
      max_daily_credits    = COALESCE((p_patch->>'max_daily_credits')::integer,  max_daily_credits),
      webhooks             = COALESCE(p_patch->'webhooks',                       webhooks),
      api_access_enabled   = COALESCE((p_patch->>'api_access_enabled')::boolean, api_access_enabled),
      metadata             = COALESCE(p_patch->'metadata',                       metadata),
      max_parallel_runs    = COALESCE((p_patch->>'max_parallel_runs')::integer,  max_parallel_runs),
      global_kill_switch   = COALESCE((p_patch->>'global_kill_switch')::boolean, global_kill_switch),
      agent_paused         = COALESCE((p_patch->>'agent_paused')::boolean,       agent_paused),
      dark_launch_enabled  = COALESCE((p_patch->>'dark_launch_enabled')::boolean,dark_launch_enabled),
      dark_launch_pct      = COALESCE((p_patch->>'dark_launch_pct')::integer,    dark_launch_pct),
      budget_enforce       = COALESCE((p_patch->>'budget_enforce')::boolean,     budget_enforce),
      updated_at           = now()
  WHERE ai_lenser_id = p_ai_lenser_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_update_workspace_settings(uuid, jsonb) TO authenticated;

-- ─── 10. COMMENT ON TABLE ────────────────────────────────────────────────────

COMMENT ON TABLE agents.run_reports IS
  'Immutable post-run summary records. One report per terminal team run. Aggregates steps, tool invocations, memory writes, cost, and evaluation score at the moment of report creation.';

COMMENT ON TABLE agents.run_incidents IS
  'Incident log attached to a run report. Records tool failures, budget overruns, policy violations, timeouts, and kill-switch events with severity classification.';

COMMENT ON TABLE agents.policy_evaluations IS
  'Immutable audit log of pre-run, pre-side-effect, and pre-tool policy verdicts. One row per evaluation point; never updated after insert.';
