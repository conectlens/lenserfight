-- Phase AA: BYOK key vault + agent model binding extensions
-- Enables agents to store encrypted BYOK keys and Ollama endpoints for
-- autonomous battle execution via fn_battle_dispatch_agent.
--
-- Security invariants:
--   - execution.byok_keys has NO RLS SELECT for authenticated role
--   - Raw keys are decrypted only in CLI process / gateway worker (never via PostgREST)
--   - fn_byok_key_hint returns last 4 chars only (safe for UI display)
--   - fn_battle_dispatch_agent validates ownership before reading key references

-- ─── Extend agents.model_bindings ───────────────────────────────────────────

ALTER TABLE agents.model_bindings
  ADD COLUMN IF NOT EXISTS byok_adapter TEXT
    CHECK (byok_adapter IN ('openai', 'anthropic', 'mistral', 'google', 'cohere', 'custom')),
  ADD COLUMN IF NOT EXISTS ollama_endpoint TEXT;

COMMENT ON COLUMN agents.model_bindings.byok_adapter IS
  'Provider key for BYOK execution — keys are stored in execution.byok_keys, not here.';
COMMENT ON COLUMN agents.model_bindings.ollama_endpoint IS
  'Local Ollama endpoint URL (e.g. http://localhost:11434). Never proxied to cloud.';

-- ─── execution.byok_keys — encrypted key vault ───────────────────────────────

CREATE TABLE IF NOT EXISTS execution.byok_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  provider      TEXT        NOT NULL CHECK (provider IN ('openai', 'anthropic', 'mistral', 'google', 'cohere', 'custom')),
  key_encrypted TEXT        NOT NULL,  -- AES-256-GCM, encrypted at application layer
  key_hint      TEXT,                  -- last 4 chars for display only
  label         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  UNIQUE (agent_id, provider)
);

CREATE INDEX idx_byok_keys_agent ON execution.byok_keys (agent_id) WHERE revoked_at IS NULL;

COMMENT ON TABLE execution.byok_keys IS
  'Encrypted BYOK API keys for agent-based battle execution. '
  'RLS denies all authenticated reads. Accessed only via service_role in trusted workers.';

-- RLS: deny ALL direct access — only service_role can read
ALTER TABLE execution.byok_keys ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON execution.byok_keys TO service_role;
-- No GRANT to authenticated role — PostgREST cannot read this table.

-- ─── fn_byok_key_register ────────────────────────────────────────────────────
-- Called from CLI (service-role context) to store an encrypted key.
-- The CLI encrypts the key before calling this RPC.

CREATE OR REPLACE FUNCTION public.fn_byok_key_register(
  p_agent_id      UUID,
  p_provider      TEXT,
  p_key_encrypted TEXT,
  p_key_hint      TEXT DEFAULT NULL,
  p_label         TEXT DEFAULT NULL,
  p_expires_at    TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, agents, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
  v_key_id    UUID;
BEGIN
  -- Verify caller owns the agent
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    WHERE  al.id = p_agent_id
    AND    al.profile_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'byok_key_register_forbidden: agent % not owned by caller', p_agent_id;
  END IF;

  INSERT INTO execution.byok_keys (agent_id, provider, key_encrypted, key_hint, label, expires_at)
  VALUES (p_agent_id, p_provider, p_key_encrypted, p_key_hint, p_label, p_expires_at)
  ON CONFLICT (agent_id, provider) DO UPDATE
    SET key_encrypted = EXCLUDED.key_encrypted,
        key_hint      = EXCLUDED.key_hint,
        label         = EXCLUDED.label,
        expires_at    = EXCLUDED.expires_at,
        revoked_at    = NULL,
        created_at    = now()
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_byok_key_register(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ─── fn_byok_key_hint ────────────────────────────────────────────────────────
-- Safe read: returns provider + hint only. Never exposes key_encrypted.

CREATE OR REPLACE FUNCTION public.fn_byok_key_hint(p_agent_id UUID)
RETURNS TABLE (
  provider TEXT,
  key_hint TEXT,
  label    TEXT,
  is_valid BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = execution, agents, lensers, public
AS $$
  SELECT
    bk.provider,
    bk.key_hint,
    bk.label,
    (bk.revoked_at IS NULL AND (bk.expires_at IS NULL OR bk.expires_at > now())) AS is_valid
  FROM execution.byok_keys bk
  JOIN agents.ai_lensers al ON al.id = bk.agent_id
  JOIN lensers.profiles   p  ON p.id  = al.profile_id
  WHERE bk.agent_id    = p_agent_id
  AND   p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.fn_byok_key_hint(UUID) TO authenticated;

-- ─── fn_byok_key_revoke ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_byok_key_revoke(p_agent_id UUID, p_provider TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, agents, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    WHERE  al.id = p_agent_id AND al.profile_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'byok_key_revoke_forbidden';
  END IF;

  UPDATE execution.byok_keys
  SET    revoked_at = now()
  WHERE  agent_id = p_agent_id AND provider = p_provider;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_byok_key_revoke(UUID, TEXT) TO authenticated;

-- ─── fn_battle_dispatch_agent ─────────────────────────────────────────────────
-- Records an agent-dispatched battle submission. The actual execution
-- happens in the CLI / gateway; this RPC records the intent and returns
-- a submission_id to attach the result to.
-- The CLI calls fn_battles_submit after execution completes.

CREATE OR REPLACE FUNCTION public.fn_battle_dispatch_agent(
  p_battle_id    UUID,
  p_agent_id     UUID,
  p_model_spec   TEXT,  -- e.g. 'ollama:llama3.2' or 'byok:openai'
  p_device_id    UUID   DEFAULT NULL,
  p_workflow_id  UUID   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, lensers, execution, public
AS $$
DECLARE
  v_lenser_id  UUID;
  v_battle     battles.battles%ROWTYPE;
  v_contender  battles.contenders%ROWTYPE;
BEGIN
  -- Resolve caller lenser
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  -- Verify agent ownership
  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    WHERE  al.id = p_agent_id AND al.profile_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'dispatch_agent_forbidden: agent not owned by caller';
  END IF;

  -- Verify battle is in a submittable state
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispatch_agent_battle_not_found: %', p_battle_id;
  END IF;
  IF v_battle.status NOT IN ('open', 'executing') THEN
    RAISE EXCEPTION 'dispatch_agent_battle_not_open: status=%', v_battle.status;
  END IF;

  -- Verify contender registration
  SELECT c.* INTO v_contender
  FROM   battles.contenders c
  JOIN   lensers.profiles p ON p.id = c.lenser_id
  WHERE  c.battle_id = p_battle_id
  AND    p.id = v_lenser_id
  LIMIT  1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispatch_agent_not_registered: join the battle first';
  END IF;

  -- Log dispatch intent
  INSERT INTO audit.events (event_type, actor_type, actor_id, payload)
  VALUES (
    'battle.agent_dispatch_queued',
    'lenser',
    v_lenser_id,
    jsonb_build_object(
      'battle_id',   p_battle_id,
      'agent_id',    p_agent_id,
      'model_spec',  p_model_spec,
      'device_id',   p_device_id,
      'workflow_id', p_workflow_id
    )
  );

  RETURN jsonb_build_object(
    'battle_id',    p_battle_id,
    'agent_id',     p_agent_id,
    'contender_id', v_contender.id,
    'model_spec',   p_model_spec,
    'status',       'queued'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battle_dispatch_agent(UUID, UUID, TEXT, UUID, UUID) TO authenticated;
