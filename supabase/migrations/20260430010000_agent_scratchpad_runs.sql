-- =============================================================================
-- 20260430010000_agent_scratchpad_runs.sql
-- -----------------------------------------------------------------------------
-- Adds the persistence layer for the agent scratchpad workbench (Operate tier).
-- Each scratchpad run is a one-off prompt + optional model + optional tool
-- calls executed by the owner from the control room. Runs are owner-only and
-- can be promoted into a memory profile.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.scratchpad_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id    uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  actor_lenser_id uuid NOT NULL,
  prompt          text NOT NULL,
  model_id        uuid NULL,
  tool_calls      jsonb NOT NULL DEFAULT '[]'::jsonb,
  output          text NULL,
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  error           text NULL,
  cost_credits    integer NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scratchpad_runs_ai_lenser_started
  ON agents.scratchpad_runs (ai_lenser_id, started_at DESC);

ALTER TABLE agents.scratchpad_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scratchpad_runs_owner_select ON agents.scratchpad_runs;
CREATE POLICY scratchpad_runs_owner_select
  ON agents.scratchpad_runs
  FOR SELECT
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS scratchpad_runs_owner_write ON agents.scratchpad_runs;
CREATE POLICY scratchpad_runs_owner_write
  ON agents.scratchpad_runs
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.scratchpad_runs TO authenticated, service_role;

-- ─── RPC: create a scratchpad run ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_create_scratchpad_run(uuid, text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.fn_create_scratchpad_run(
  p_ai_lenser_id uuid,
  p_prompt       text,
  p_model_id     uuid DEFAULT NULL,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
RETURNS agents.scratchpad_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row   agents.scratchpad_runs;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.scratchpad_runs (ai_lenser_id, actor_lenser_id, prompt, model_id, metadata)
  VALUES (p_ai_lenser_id, v_actor, p_prompt, p_model_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_scratchpad_run(uuid, text, uuid, jsonb) TO authenticated;

-- ─── RPC: complete a scratchpad run ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_complete_scratchpad_run(uuid, text, text, integer, text);
CREATE OR REPLACE FUNCTION public.fn_complete_scratchpad_run(
  p_run_id       uuid,
  p_output       text,
  p_status       text DEFAULT 'completed',
  p_cost_credits integer DEFAULT 0,
  p_error        text DEFAULT NULL
)
RETURNS agents.scratchpad_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_existing agents.scratchpad_runs;
  v_row      agents.scratchpad_runs;
BEGIN
  SELECT * INTO v_existing FROM agents.scratchpad_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scratchpad run not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_existing.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('running', 'completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.scratchpad_runs
  SET output       = p_output,
      status       = p_status,
      cost_credits = COALESCE(p_cost_credits, 0),
      error        = p_error,
      completed_at = CASE
                       WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now()
                       ELSE completed_at
                     END
  WHERE id = p_run_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_complete_scratchpad_run(uuid, text, text, integer, text) TO authenticated;

-- ─── RPC: promote a scratchpad output into a memory profile entry ──────────
-- This appends a small memory_entries jsonb blob into the chosen memory
-- profile's `seed` column (added below) so the next run can read it.
ALTER TABLE agents.memory_profiles
  ADD COLUMN IF NOT EXISTS seed jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.fn_promote_scratchpad_to_memory(uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_promote_scratchpad_to_memory(
  p_run_id            uuid,
  p_memory_profile_id uuid
)
RETURNS agents.memory_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_run     agents.scratchpad_runs;
  v_profile agents.memory_profiles;
BEGIN
  SELECT * INTO v_run FROM agents.scratchpad_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scratchpad run not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_profile FROM agents.memory_profiles WHERE id = p_memory_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'memory profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_run.ai_lenser_id)
     OR NOT agents.can_manage_ai_lenser(v_profile.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE agents.memory_profiles
  SET seed = seed || jsonb_build_array(jsonb_build_object(
        'source', 'scratchpad',
        'run_id', v_run.id,
        'prompt', v_run.prompt,
        'output', v_run.output,
        'promoted_at', now()
      )),
      updated_at = now()
  WHERE id = p_memory_profile_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_promote_scratchpad_to_memory(uuid, uuid) TO authenticated;

COMMENT ON TABLE agents.scratchpad_runs IS
  'One-off owner-driven scratchpad runs. Owner-only via RLS. Promote outputs into memory_profiles via fn_promote_scratchpad_to_memory.';
