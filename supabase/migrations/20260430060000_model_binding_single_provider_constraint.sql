-- Single-provider enforcement for AI agent model bindings
-- When agents.policies.model_binding_mode = 'single', all model bindings must
-- belong to the same provider. This trigger enforces that invariant at the DB level.

-- ─────────────────────────────────────────────────────────────
-- Index: fast lookup of existing bindings for an agent
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_model_bindings_ai_lenser_id
  ON agents.model_bindings (ai_lenser_id);

-- ─────────────────────────────────────────────────────────────
-- Trigger function: validate provider consistency on INSERT
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.check_model_binding_single_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, ai, public
AS $$
DECLARE
  v_binding_mode    text;
  v_new_provider    text;
  v_existing_provider text;
BEGIN
  -- Resolve model_binding_mode for this agent
  SELECT pol.model_binding_mode::text INTO v_binding_mode
  FROM agents.policies pol
  WHERE pol.ai_lenser_id = NEW.ai_lenser_id
  LIMIT 1;

  -- If no policy row yet or mode is not 'single', allow
  IF v_binding_mode IS NULL OR v_binding_mode <> 'single' THEN
    RETURN NEW;
  END IF;

  -- Resolve provider key of the incoming model
  SELECT p.key INTO v_new_provider
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
  WHERE m.id = NEW.model_id;

  IF v_new_provider IS NULL THEN
    RAISE EXCEPTION 'Model % not found in ai.models or its provider is missing.', NEW.model_id;
  END IF;

  -- Find the provider key of any existing binding (excluding self on UPDATE)
  SELECT DISTINCT p.key INTO v_existing_provider
  FROM agents.model_bindings mb
  JOIN ai.models m ON m.id = mb.model_id
  JOIN ai.providers p ON p.id = m.provider_id
  WHERE mb.ai_lenser_id = NEW.ai_lenser_id
    AND mb.id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF v_existing_provider IS NOT NULL AND v_existing_provider <> v_new_provider THEN
    RAISE EXCEPTION
      'Provider mismatch: agent is in single-provider mode (current: %). Cannot add model from provider "%" — remove existing bindings first.',
      v_existing_provider, v_new_provider;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Attach trigger to agents.model_bindings (INSERT and UPDATE)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_model_binding_provider_check ON agents.model_bindings;

CREATE TRIGGER trg_model_binding_provider_check
  BEFORE INSERT OR UPDATE OF model_id ON agents.model_bindings
  FOR EACH ROW
  EXECUTE FUNCTION agents.check_model_binding_single_provider();

-- ─────────────────────────────────────────────────────────────
-- Helper function: get the current effective provider for an agent
-- Used by the UI to show a notice when adding models
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_get_agent_effective_provider(p_ai_lenser_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = agents, ai, public
AS $$
  SELECT DISTINCT prov.key
  FROM agents.model_bindings mb
  JOIN ai.models m ON m.id = mb.model_id
  JOIN ai.providers prov ON prov.id = m.provider_id
  WHERE mb.ai_lenser_id = p_ai_lenser_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION agents.fn_get_agent_effective_provider IS
  'Returns the provider key for an agent''s existing model bindings, or NULL if none. Used to enforce single-provider mode in the UI.';
