-- =============================================================================
-- 20260503020000_tools_phase7.sql
-- -----------------------------------------------------------------------------
-- Phase 7: Tools — runtime invocation log, approval gates, egress sandboxing.
--
-- Builds on Phase 5 tooling (agents.tools_registry / tool_assignments /
-- tool_profiles). This migration adds:
--   * agents.tools_registry.egress_class      - sandbox classification
--   * agents.tool_invocations                 - per-call audit log
--   * fn_invoke_tool / fn_complete_tool_invocation /
--     fn_approve_tool_invocation / fn_reject_tool_invocation RPCs
--   * agents.tool_invocations_v               - joined display view
--
-- Egress classes:
--   none       — pure compute, no I/O outside the agent runtime
--   read_only  — outbound reads (e.g. fetch web page); no writes
--   write      — mutates external systems; auto-flips requires_approval=true
-- =============================================================================

-- ─── Extend agents.tools_registry with egress_class ──────────────────────────

ALTER TABLE agents.tools_registry
  ADD COLUMN IF NOT EXISTS egress_class text NOT NULL DEFAULT 'none'
    CHECK (egress_class IN ('none','read_only','write'));

CREATE INDEX IF NOT EXISTS idx_tools_registry_egress
  ON agents.tools_registry (egress_class);

-- Auto-flip requires_approval for write-class tools (safety default).
DROP FUNCTION IF EXISTS agents.fn_tools_registry_egress_guard() CASCADE;
CREATE OR REPLACE FUNCTION agents.fn_tools_registry_egress_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.egress_class = 'write' AND NEW.requires_approval IS DISTINCT FROM true THEN
    NEW.requires_approval := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tools_registry_egress_guard ON agents.tools_registry;
CREATE TRIGGER trg_tools_registry_egress_guard
  BEFORE INSERT OR UPDATE ON agents.tools_registry
  FOR EACH ROW
  EXECUTE FUNCTION agents.fn_tools_registry_egress_guard();

-- ─── agents.tool_invocations ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.tool_invocations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_run_id         uuid NOT NULL REFERENCES agents.team_runs(id) ON DELETE CASCADE,
  agent_run_step_id   uuid NULL REFERENCES agents.agent_run_steps(id) ON DELETE SET NULL,
  tool_id             uuid NOT NULL REFERENCES agents.tools_registry(id) ON DELETE RESTRICT,
  ai_lenser_id        uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  input               jsonb NOT NULL DEFAULT '{}'::jsonb,
  output              jsonb NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','running','completed','failed')),
  approval_status     text NOT NULL DEFAULT 'not_required'
                        CHECK (approval_status IN ('pending','approved','rejected','not_required')),
  approval_required   boolean NOT NULL DEFAULT false,
  approval_decided_by uuid NULL REFERENCES lensers.profiles(id) ON DELETE SET NULL,
  approval_reason     text NULL,
  error               text NULL,
  cost_estimate       numeric NULL,
  started_at          timestamptz NULL,
  completed_at        timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_team_run
  ON agents.tool_invocations (team_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_agent_status
  ON agents.tool_invocations (ai_lenser_id, status);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_tool
  ON agents.tool_invocations (tool_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_pending_approval
  ON agents.tool_invocations (ai_lenser_id, created_at DESC)
  WHERE approval_status = 'pending';

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE agents.tool_invocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tool_invocations_owner_all ON agents.tool_invocations;
CREATE POLICY tool_invocations_owner_all ON agents.tool_invocations
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.tool_invocations
  TO authenticated, service_role;

-- ─── RPC: invoke a tool (creates row, computes approval gate) ───────────────

DROP FUNCTION IF EXISTS public.fn_invoke_tool(uuid, uuid, uuid, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.fn_invoke_tool(
  p_team_run_id       uuid,
  p_tool_id           uuid,
  p_ai_lenser_id      uuid,
  p_input             jsonb,
  p_agent_run_step_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_tool          agents.tools_registry;
  v_assignment    agents.tool_assignments;
  v_profile       agents.tool_profiles;
  v_requires      boolean := false;
  v_appr_status   text;
  v_status        text;
  v_started_at    timestamptz;
  v_id            uuid;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tool FROM agents.tools_registry WHERE id = p_tool_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tool not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_tool.status <> 'active' THEN
    RAISE EXCEPTION 'tool % is %', v_tool.key, v_tool.status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_assignment
    FROM agents.tool_assignments
   WHERE ai_lenser_id = p_ai_lenser_id AND tool_id = p_tool_id;
  IF NOT FOUND OR v_assignment.allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'tool % not assigned to agent', v_tool.key USING ERRCODE = '42501';
  END IF;

  IF v_assignment.profile_id IS NOT NULL THEN
    SELECT * INTO v_profile FROM agents.tool_profiles WHERE id = v_assignment.profile_id;
    IF FOUND AND v_profile.requires_approval THEN
      v_requires := true;
    END IF;
  END IF;

  IF v_tool.requires_approval OR v_tool.egress_class = 'write' THEN
    v_requires := true;
  END IF;

  IF v_requires THEN
    v_appr_status := 'pending';
    v_status      := 'pending';
    v_started_at  := NULL;
  ELSE
    v_appr_status := 'not_required';
    v_status      := 'running';
    v_started_at  := now();
  END IF;

  INSERT INTO agents.tool_invocations (
    team_run_id, agent_run_step_id, tool_id, ai_lenser_id,
    input, status, approval_status, approval_required, started_at
  )
  VALUES (
    p_team_run_id, p_agent_run_step_id, p_tool_id, p_ai_lenser_id,
    COALESCE(p_input, '{}'::jsonb), v_status, v_appr_status, v_requires, v_started_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.fn_invoke_tool(uuid, uuid, uuid, jsonb, uuid) TO authenticated;

-- ─── RPC: complete a tool invocation ─────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_complete_tool_invocation(uuid, text, jsonb, text, numeric);
CREATE OR REPLACE FUNCTION public.fn_complete_tool_invocation(
  p_invocation_id uuid,
  p_status        text,
  p_output        jsonb DEFAULT NULL,
  p_error         text DEFAULT NULL,
  p_cost          numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_inv.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('completed','failed') THEN
    RAISE EXCEPTION 'completion status must be completed or failed' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET status        = p_status,
         output        = COALESCE(p_output, output),
         error         = COALESCE(p_error, error),
         cost_estimate = COALESCE(p_cost, cost_estimate),
         completed_at  = now()
   WHERE id = p_invocation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.fn_complete_tool_invocation(uuid, text, jsonb, text, numeric) TO authenticated;

-- ─── RPC: approve a tool invocation ──────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_approve_tool_invocation(uuid);
CREATE OR REPLACE FUNCTION public.fn_approve_tool_invocation(
  p_invocation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_inv.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF v_inv.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'invocation is not pending approval' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET approval_status     = 'approved',
         approval_decided_by = auth.uid(),
         status              = 'running',
         started_at          = now()
   WHERE id = p_invocation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_approve_tool_invocation(uuid) TO authenticated;

-- ─── RPC: reject a tool invocation ───────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_reject_tool_invocation(uuid, text);
CREATE OR REPLACE FUNCTION public.fn_reject_tool_invocation(
  p_invocation_id uuid,
  p_reason        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_inv.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF v_inv.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'invocation is not pending approval' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET approval_status     = 'rejected',
         approval_decided_by = auth.uid(),
         approval_reason     = p_reason,
         status              = 'rejected',
         completed_at        = now()
   WHERE id = p_invocation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_reject_tool_invocation(uuid, text) TO authenticated;

-- ─── View: tool invocations joined with registry + step display data ─────────

DROP VIEW IF EXISTS agents.tool_invocations_v;
CREATE OR REPLACE VIEW agents.tool_invocations_v AS
SELECT
  inv.id,
  inv.team_run_id,
  inv.agent_run_step_id,
  inv.tool_id,
  inv.ai_lenser_id,
  tr.key            AS tool_key,
  tr.name           AS tool_name,
  tr.category       AS tool_category,
  tr.egress_class,
  tr.is_dangerous,
  step.title        AS step_title,
  inv.input,
  inv.output,
  inv.status,
  inv.approval_status,
  inv.approval_required,
  inv.approval_decided_by,
  inv.approval_reason,
  inv.error,
  inv.cost_estimate,
  inv.started_at,
  inv.completed_at,
  inv.created_at
FROM agents.tool_invocations inv
JOIN agents.tools_registry   tr   ON tr.id = inv.tool_id
LEFT JOIN agents.agent_run_steps step ON step.id = inv.agent_run_step_id
WHERE agents.can_manage_ai_lenser(inv.ai_lenser_id);

GRANT SELECT ON agents.tool_invocations_v TO authenticated, service_role;

-- ─── Comments ────────────────────────────────────────────────────────────────

COMMENT ON TABLE agents.tool_invocations IS
  'Per-call log of tool executions during agent runs. Carries approval state, I/O, cost, and timing.';

COMMENT ON COLUMN agents.tools_registry.egress_class IS
  'Sandbox classification: none (compute-only), read_only (outbound reads), write (mutations). write auto-forces requires_approval.';
