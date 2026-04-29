-- =============================================================================
-- 20260501010000_agent_provider_configs.sql
-- -----------------------------------------------------------------------------
-- Per-agent BYOK provider configuration table.
--
-- Design:
--   - Raw API keys are stored in vault.secrets by fn_store_api_key (already
--     deployed in 20260329120000_platform_private_schema.sql).
--   - This table stores only the ai_key_id reference (ai.keys.id), status from
--     the last health check, and optional base_url override.
--   - The vault extension is already enabled (20260329120000, line 214).
--   - test-provider Edge Function reads the decrypted key via vault.decrypted_secrets
--     using the ai.keys.encrypted_key_id pointer stored in ai.keys.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.provider_configs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id    uuid        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  provider_key    text        NOT NULL,
  ai_key_id       uuid        NULL REFERENCES ai.keys(id) ON DELETE SET NULL,
  base_url        text        NULL,
  status          text        NOT NULL DEFAULT 'unconfigured'
                               CHECK (status IN ('healthy', 'error', 'unconfigured')),
  last_checked_at timestamptz NULL,
  configured_at   timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ai_lenser_id, provider_key)
);

CREATE INDEX IF NOT EXISTS idx_provider_configs_ai_lenser
  ON agents.provider_configs (ai_lenser_id);

ALTER TABLE agents.provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_configs_owner_all ON agents.provider_configs;
CREATE POLICY provider_configs_owner_all ON agents.provider_configs
  FOR ALL
  USING     (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.provider_configs
  TO authenticated, service_role;

COMMENT ON TABLE agents.provider_configs IS
  'Per-agent BYOK provider configuration. Stores ai_key_id reference to ai.keys '
  '(not the key itself), status from the last health check, and optional base_url '
  'override for self-hosted providers. Raw API keys live in vault.secrets.';

COMMENT ON COLUMN agents.provider_configs.ai_key_id IS
  'References ai.keys(id). NULL until the agent owner stores a key via fn_store_api_key. '
  'ON DELETE SET NULL — revoking a key marks the config as unconfigured without deleting it.';

-- ─── RPC: list provider configs for an agent (authenticated read path) ────────

DROP FUNCTION IF EXISTS public.fn_get_provider_configs(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_provider_configs(
  p_ai_lenser_id uuid
)
RETURNS SETOF agents.provider_configs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, agents
AS $$
  SELECT *
  FROM   agents.provider_configs
  WHERE  ai_lenser_id = p_ai_lenser_id
    AND  agents.can_manage_ai_lenser(p_ai_lenser_id)
  ORDER BY provider_key;
$$;

ALTER FUNCTION public.fn_get_provider_configs(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_get_provider_configs(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_provider_configs(uuid) IS
  'Returns provider configs for a given AI lenser. '
  'Authorization via can_manage_ai_lenser — returns empty set if caller is not the owner. '
  'Also used by the test-provider Edge Function for ownership validation + base_url lookup.';

-- ─── RPC: upsert provider config ─────────────────────────────────────────────
-- Called by the repository (after fn_store_api_key) and by the test-provider
-- Edge Function (service_role JWT) to persist health check status updates.

DROP FUNCTION IF EXISTS public.fn_upsert_provider_config(uuid, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.fn_upsert_provider_config(
  p_ai_lenser_id  uuid,
  p_provider_key  text,
  p_base_url      text  DEFAULT NULL,
  p_status        text  DEFAULT 'unconfigured',
  p_ai_key_id     uuid  DEFAULT NULL
)
RETURNS agents.provider_configs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_row agents.provider_configs;
BEGIN
  IF p_status NOT IN ('healthy', 'error', 'unconfigured') THEN
    RAISE EXCEPTION 'invalid status value: %', p_status USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.provider_configs (
    ai_lenser_id,
    provider_key,
    ai_key_id,
    base_url,
    status,
    configured_at,
    last_checked_at,
    updated_at
  )
  VALUES (
    p_ai_lenser_id,
    p_provider_key,
    p_ai_key_id,
    p_base_url,
    p_status,
    -- configured_at: set on first key association; preserved on subsequent updates
    CASE WHEN p_ai_key_id IS NOT NULL THEN now() ELSE NULL END,
    -- last_checked_at: set whenever a health check result (healthy/error) is recorded
    CASE WHEN p_status IN ('healthy', 'error') THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (ai_lenser_id, provider_key) DO UPDATE
    SET ai_key_id       = COALESCE(EXCLUDED.ai_key_id,   provider_configs.ai_key_id),
        base_url        = COALESCE(EXCLUDED.base_url,    provider_configs.base_url),
        status          = EXCLUDED.status,
        configured_at   = CASE
                            WHEN EXCLUDED.ai_key_id IS NOT NULL
                              AND provider_configs.configured_at IS NULL
                            THEN now()
                            ELSE provider_configs.configured_at
                          END,
        last_checked_at = CASE
                            WHEN EXCLUDED.status IN ('healthy', 'error')
                            THEN now()
                            ELSE provider_configs.last_checked_at
                          END,
        updated_at      = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

ALTER FUNCTION public.fn_upsert_provider_config(uuid, text, text, text, uuid)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_upsert_provider_config(uuid, text, text, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_upsert_provider_config(uuid, text, text, text, uuid) IS
  'Upserts a provider config row. '
  'ai_key_id: COALESCE-preserves existing key reference if not passed (health-check updates). '
  'base_url: COALESCE-preserves existing value if not passed. '
  'configured_at: set only on first key association (not overwritten on re-health-check). '
  'last_checked_at: updated whenever status is healthy or error. '
  'Called by authenticated users (after fn_store_api_key) and by test-provider Edge Function (service_role).';
