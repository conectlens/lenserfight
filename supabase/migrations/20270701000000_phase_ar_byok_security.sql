-- =============================================================================
-- Phase AR — BYOK Security Hardening
-- =============================================================================
-- 1. allowed_model_ids column — optional allowlist for which model IDs a key can be used with
-- 2. fn_byok_key_rotate — atomic key rotation with audit trail
-- 3. fn_byok_key_resolve — service_role-only key resolution with model allowlist check
-- 4. fn_expire_byok_keys — soft-revokes expired keys; called by pg_cron
-- 5. pg_cron schedule: byok-key-expiry (hourly)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. allowed_model_ids column
-- ---------------------------------------------------------------------------
ALTER TABLE execution.byok_keys
  ADD COLUMN IF NOT EXISTS allowed_model_ids TEXT[] DEFAULT NULL;

COMMENT ON COLUMN execution.byok_keys.allowed_model_ids IS
  'AR: Optional allowlist of ai.models.key values this key is permitted to use. '
  'NULL means unrestricted. Checked by fn_byok_key_resolve.';

-- ---------------------------------------------------------------------------
-- 2. fn_byok_key_rotate — authenticated, owner-only atomic key rotation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_byok_key_rotate(
  p_agent_id        UUID,
  p_provider        TEXT,
  p_new_encrypted   TEXT,
  p_new_hint        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, audit, public
AS $$
DECLARE
  v_actor_id UUID;
  v_rows_updated INT;
BEGIN
  -- Caller must be authenticated
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Verify caller owns the agent
  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    JOIN lensers.profiles p ON p.id = al.profile_id
    WHERE al.id = p_agent_id AND p.id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'byok_key_rotate: caller does not own agent %', p_agent_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Atomic update: rotate key, clear revoked_at (re-activates if previously expired)
  UPDATE execution.byok_keys
  SET
    key_encrypted = p_new_encrypted,
    key_hint      = p_new_hint,
    revoked_at    = NULL,
    created_at    = now()
  WHERE agent_id = p_agent_id
    AND provider  = p_provider;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'byok_key_rotate: no key found for agent % provider %', p_agent_id, p_provider
      USING ERRCODE = 'P0001';
  END IF;

  -- Audit trail
  INSERT INTO audit.events (event_type, actor_type, severity, payload)
  VALUES (
    'byok.key_rotated',
    'user',
    'info',
    jsonb_build_object(
      'agent_id',  p_agent_id,
      'provider',  p_provider,
      'key_hint',  p_new_hint,
      'rotated_by', v_actor_id,
      'rotated_at', now()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_byok_key_rotate(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_rotate(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_byok_key_rotate IS
  'AR: Rotates an existing BYOK key. Requires the caller to be the agent owner. '
  'Atomic UPDATE + audit.events INSERT. SECURITY DEFINER; authenticated role allowed.';

-- ---------------------------------------------------------------------------
-- 3. fn_byok_key_resolve — service_role only, with model allowlist check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_byok_key_resolve(
  p_agent_id   UUID,
  p_provider   TEXT,
  p_model_id   TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, public
AS $$
DECLARE
  v_row execution.byok_keys%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM execution.byok_keys
  WHERE agent_id  = p_agent_id
    AND provider  = p_provider
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Model allowlist check
  IF p_model_id IS NOT NULL
    AND v_row.allowed_model_ids IS NOT NULL
    AND NOT (p_model_id = ANY(v_row.allowed_model_ids))
  THEN
    RAISE EXCEPTION 'byok_key_resolve: model % is not in allowed_model_ids for provider %', p_model_id, p_provider
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_row.key_encrypted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_byok_key_resolve(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_resolve(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.fn_byok_key_resolve IS
  'AR: Returns key_encrypted when key is valid and not revoked/expired. '
  'Returns NULL when not found. Raises when model not in allowed_model_ids. '
  'SECURITY DEFINER; service_role only. Never exposed to authenticated clients.';

-- ---------------------------------------------------------------------------
-- 4. fn_expire_byok_keys — soft-revoke all expired keys
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_expire_byok_keys()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, audit, public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE execution.byok_keys
  SET revoked_at = now()
  WHERE expires_at < now()
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    INSERT INTO audit.events (event_type, actor_type, severity, payload)
    VALUES (
      'byok.keys_expired',
      'system',
      'info',
      jsonb_build_object('expired_count', v_count, 'expired_at', now())
    );
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_expire_byok_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_expire_byok_keys() TO service_role;

COMMENT ON FUNCTION public.fn_expire_byok_keys IS
  'AR: Soft-revokes all BYOK keys where expires_at < now(). '
  'Called by pg_cron every hour. Returns number of keys revoked. '
  'SECURITY DEFINER; service_role only.';

-- ---------------------------------------------------------------------------
-- 5. pg_cron schedule
-- ---------------------------------------------------------------------------
SELECT cron.schedule(
  'byok-key-expiry',
  '0 * * * *',
  $$SELECT public.fn_expire_byok_keys()$$
);
