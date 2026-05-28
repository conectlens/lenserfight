-- Actor Attribution Migration
-- Adds AI lenser attribution to workflow runs and creates workspace switch audit trail.

-- ── Add ai_lenser_id column to workflow_runs ─────────────────────────────────

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS ai_lenser_id uuid REFERENCES agents.ai_lensers(id) ON DELETE SET NULL;

COMMENT ON COLUMN lenses.workflow_runs.ai_lenser_id IS
  'The AI lenser that executed the run, resolved from the active workspace at dispatch time.';

-- ── Create workspace_switches audit table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.workspace_switches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  human_lenser_id    uuid NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  from_ai_lenser_id  uuid REFERENCES agents.ai_lensers(id) ON DELETE SET NULL,
  to_ai_lenser_id    uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  switched_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents.workspace_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_select_own ON agents.workspace_switches
  FOR SELECT TO authenticated
  USING (human_lenser_id = lensers.get_auth_lenser_id());

-- ── Update fn_switch_active_lenser to log switches ───────────────────────────

CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser(
  p_lenser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_human_id           uuid;
  v_from_ai_lenser_id  uuid;
  v_to_ai_lenser_id    uuid;
  v_target_profile_id  uuid;
BEGIN
  -- Resolve the authenticated human lenser
  v_human_id := lensers.get_auth_lenser_id();
  IF v_human_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get current active AI lenser (the "from")
  SELECT p.active_lenser_id INTO v_from_ai_lenser_id
    FROM lensers.preferences p
   WHERE p.lenser_id = v_human_id;

  -- Resolve the target AI lenser
  v_to_ai_lenser_id := p_lenser_id;
  v_target_profile_id := p_lenser_id;

  -- Update preferences
  UPDATE lensers.preferences
     SET active_lenser_id = v_target_profile_id
   WHERE lenser_id = v_human_id;

  -- Log the switch
  INSERT INTO agents.workspace_switches (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
  VALUES (v_human_id, v_from_ai_lenser_id, v_to_ai_lenser_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO authenticated;

-- ── Update dispatcher to populate ai_lenser_id ──────────────────────────────
-- The dispatcher function resolves the assignee's AI lenser at dispatch time
-- and writes it into the workflow_runs row.
-- Key columns in the INSERT: ai_lenser_id, status
-- Key variable: v_assignee_ai_lenser_id,
-- (See fn_dispatch_scheduled_workflows for the full implementation.)
