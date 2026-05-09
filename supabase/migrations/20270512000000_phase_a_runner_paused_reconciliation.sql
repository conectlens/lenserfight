-- Phase A (Trust Gateway): runner_paused / agent_paused naming reconciliation
--
-- Background:
--   The 20260503030000_autonomous_agent_os_phase8 migration introduced
--   `agents.workspace_settings.agent_paused`. Subsequent product docs
--   (`docs/reference/cli/agent-lifecycle.md`, `docs/reference/platform-api/policy-engine.md`,
--    `docs/explanation/agents/autonomous-agent-os.md`) refer to the same concept as
--   `runner_paused`. RFC-0003 §11 and `docs/explanation/gateway/requirements.md` (NR-1..3)
--   pin the canonical name as `runner_paused`.
--
-- Strategy (backward-compatible, no data loss):
--   1. Add `runner_paused boolean NOT NULL DEFAULT false`.
--   2. Backfill from `agent_paused`.
--   3. Add a BEFORE INSERT/UPDATE trigger that mirrors writes between the two columns
--      so both stay in sync regardless of which column callers write.
--   4. Add a public DEFINER RPC `fn_set_runner_paused(p_ai_lenser_id uuid, p_paused boolean)`
--      that performs the canonical write.
--   5. Mark `agent_paused` with a deprecation comment; do NOT drop yet (multi-release window).
--
-- Safety:
--   - Trigger writes are idempotent.
--   - All existing callers (apps/cli, libs/types, libs/features) continue to work.
--   - New callers should prefer `runner_paused` and `fn_set_runner_paused`.

-- ─── 1. Add column + backfill ────────────────────────────────────────────────

ALTER TABLE agents.workspace_settings
  ADD COLUMN IF NOT EXISTS runner_paused boolean NOT NULL DEFAULT false;

-- Backfill from agent_paused so existing paused workspaces stay paused.
UPDATE agents.workspace_settings
   SET runner_paused = agent_paused
 WHERE runner_paused IS DISTINCT FROM agent_paused;

COMMENT ON COLUMN agents.workspace_settings.runner_paused IS
  'Canonical pause flag for the workspace runner. Replaces agent_paused (deprecated).';

COMMENT ON COLUMN agents.workspace_settings.agent_paused IS
  'DEPRECATED: use runner_paused. Kept in sync via trigger fn_workspace_settings_paused_sync. '
  'Will be removed in a future major migration; do not write directly.';

-- ─── 2. Two-way sync trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.fn_workspace_settings_paused_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = agents, public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If exactly one side is set explicitly, mirror to the other.
    -- Both default to false; if both are false on insert, no-op.
    IF NEW.runner_paused IS DISTINCT FROM NEW.agent_paused THEN
      -- Prefer runner_paused if it is non-default and agent_paused is default.
      -- Otherwise prefer agent_paused (legacy callers).
      IF NEW.runner_paused = true AND NEW.agent_paused = false THEN
        NEW.agent_paused := true;
      ELSIF NEW.agent_paused = true AND NEW.runner_paused = false THEN
        NEW.runner_paused := true;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- If only one column changed, mirror it to the other.
    IF NEW.runner_paused IS DISTINCT FROM OLD.runner_paused
       AND NEW.agent_paused = OLD.agent_paused THEN
      NEW.agent_paused := NEW.runner_paused;
    ELSIF NEW.agent_paused IS DISTINCT FROM OLD.agent_paused
          AND NEW.runner_paused = OLD.runner_paused THEN
      NEW.runner_paused := NEW.agent_paused;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_settings_paused_sync ON agents.workspace_settings;
CREATE TRIGGER workspace_settings_paused_sync
  BEFORE INSERT OR UPDATE ON agents.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION agents.fn_workspace_settings_paused_sync();

-- ─── 3. Canonical setter RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_runner_paused(
  p_ai_lenser_id uuid,
  p_paused       boolean
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

  INSERT INTO agents.workspace_settings (ai_lenser_id, runner_paused)
  VALUES (p_ai_lenser_id, p_paused)
  ON CONFLICT (ai_lenser_id) DO UPDATE
    SET runner_paused = p_paused,
        updated_at    = now();

  -- Mirror legacy policy_evaluations row when pausing, matching fn_pause_agent shape.
  IF p_paused THEN
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
      'runner paused by owner',
      jsonb_build_object('paused_by', auth.uid(), 'source', 'fn_set_runner_paused'),
      now()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_set_runner_paused(uuid, boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_set_runner_paused(uuid, boolean) IS
  'Canonical pause/resume RPC. Prefer over fn_pause_agent / fn_resume_agent.';

-- ─── 4. Compatibility wrappers ───────────────────────────────────────────────
-- fn_pause_agent / fn_resume_agent already exist and continue to work via the
-- sync trigger. No change needed.
