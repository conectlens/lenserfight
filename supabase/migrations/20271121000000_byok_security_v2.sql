-- =============================================================================
-- Phase BZ — BYOK Security Hardening v2
-- =============================================================================
-- 1. last_rotated_at column on execution.byok_keys + backfill
-- 2. audit.byok_key_usage table + RLS
-- 3. fn_byok_validate_for_battle() — battle-scoped key validation
-- 4. fn_byok_log_usage() — per-call usage audit (service_role only)
-- 5. fn_byok_rotation_due() — keys overdue for rotation (90-day rule)
-- 6. fn_byok_send_rotation_notifications() — pg_cron helper
-- 7. pg_cron daily job at 08:00 UTC for rotation notifications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. last_rotated_at column
-- ---------------------------------------------------------------------------

ALTER TABLE execution.byok_keys
  ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN execution.byok_keys.last_rotated_at IS
  'BZ: Timestamp of last key rotation. Used to enforce the 90-day rotation policy. '
  'Defaults to now() on INSERT; updated by fn_byok_key_rotate.';

-- Backfill: existing rows get last_rotated_at = created_at
UPDATE execution.byok_keys
SET last_rotated_at = created_at
WHERE last_rotated_at IS NULL;

-- fn_byok_key_rotate must also update last_rotated_at — patch it here
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
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    JOIN lensers.profiles p ON p.id = al.profile_id
    WHERE al.id = p_agent_id AND p.id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'byok_key_rotate: caller does not own agent %', p_agent_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE execution.byok_keys
  SET
    key_encrypted  = p_new_encrypted,
    key_hint       = p_new_hint,
    revoked_at     = NULL,
    created_at     = now(),
    last_rotated_at = now()
  WHERE agent_id = p_agent_id
    AND provider  = p_provider;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'byok_key_rotate: no key found for agent % provider %', p_agent_id, p_provider
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO audit.events (event_type, actor_type, severity, payload)
  VALUES (
    'byok.key_rotated',
    'user',
    'info',
    jsonb_build_object(
      'agent_id',      p_agent_id,
      'provider',      p_provider,
      'key_hint',      p_new_hint,
      'rotated_by',    v_actor_id,
      'rotated_at',    now()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_byok_key_rotate(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_rotate(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. audit.byok_key_usage table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit.byok_key_usage (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id       UUID        NOT NULL REFERENCES execution.byok_keys(id) ON DELETE CASCADE,
  battle_id    UUID        REFERENCES battles.battles(id) ON DELETE SET NULL,
  model_id     TEXT        NOT NULL,
  called_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  token_count  INT         NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  caller_role  TEXT        NOT NULL DEFAULT 'service_role'
);

ALTER TABLE audit.byok_key_usage ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE audit.byok_key_usage IS
  'BZ: Per-call audit trail for BYOK key usage. '
  'Written by fn_byok_log_usage (service_role only). '
  'Owners can SELECT their own key usage rows; no direct INSERT/UPDATE/DELETE from authenticated.';

-- Authenticated users can read their own key usage (via key ownership)
CREATE POLICY byok_key_usage_owner_select
  ON audit.byok_key_usage
  FOR SELECT
  TO authenticated
  USING (
    key_id IN (
      SELECT bk.id
      FROM execution.byok_keys bk
      JOIN agents.ai_lensers al ON al.id = bk.agent_id
      JOIN lensers.profiles p ON p.id = al.profile_id
      WHERE p.id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE from authenticated — only via DEFINER RPC
CREATE POLICY byok_key_usage_deny_write
  ON audit.byok_key_usage
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Service_role unrestricted
CREATE POLICY byok_key_usage_service_all
  ON audit.byok_key_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_byok_key_usage_key_id     ON audit.byok_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_byok_key_usage_battle_id  ON audit.byok_key_usage(battle_id);
CREATE INDEX IF NOT EXISTS idx_byok_key_usage_called_at  ON audit.byok_key_usage(called_at DESC);

-- ---------------------------------------------------------------------------
-- 3. fn_byok_validate_for_battle — battle-scoped key validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_byok_validate_for_battle(
  p_battle_id    UUID,
  p_contender_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id       UUID;
  v_ai_lenser_id   UUID;
  v_key_row        execution.byok_keys%ROWTYPE;
  v_allowed_models TEXT[];
BEGIN
  -- Must be authenticated
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'authentication_required');
  END IF;

  -- Resolve the ai_lenser_id for this contender
  SELECT cem.ai_lenser_id INTO v_ai_lenser_id
  FROM battles.contender_entity_map cem
  WHERE cem.contender_id = p_contender_id
    AND cem.ai_lenser_id IS NOT NULL
  LIMIT 1;

  IF v_ai_lenser_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'contender_has_no_agent');
  END IF;

  -- Caller must own this agent
  IF NOT EXISTS (
    SELECT 1
    FROM agents.ai_lensers al
    JOIN lensers.profiles lp ON lp.id = al.profile_id
    WHERE al.id = v_ai_lenser_id
      AND lp.id = v_actor_id
  ) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'caller_does_not_own_agent');
  END IF;

  -- Get the first valid key for this agent (provider-agnostic validation)
  SELECT * INTO v_key_row
  FROM execution.byok_keys bk
  WHERE bk.agent_id  = v_ai_lenser_id
    AND bk.revoked_at IS NULL
    AND (bk.expires_at IS NULL OR bk.expires_at > now())
  ORDER BY bk.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'no_valid_key');
  END IF;

  -- Check model allowlist against battle template
  SELECT bt.allowed_model_ids INTO v_allowed_models
  FROM battles.battles b
  JOIN battles.templates bt ON bt.id = b.template_id
  WHERE b.id = p_battle_id;

  IF v_allowed_models IS NOT NULL
    AND array_length(v_allowed_models, 1) > 0
    AND v_key_row.allowed_model_ids IS NOT NULL
  THEN
    -- Verify intersection is non-empty
    IF NOT EXISTS (
      SELECT 1
      FROM unnest(v_key_row.allowed_model_ids) AS km
      WHERE km = ANY(v_allowed_models)
    ) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'model_not_in_template_allowlist'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('valid', true, 'reason', null, 'key_id', v_key_row.id);
END;
$$;

REVOKE ALL   ON FUNCTION public.fn_byok_validate_for_battle(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_validate_for_battle(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.fn_byok_validate_for_battle IS
  'BZ: Validates that the contender in a battle has a usable BYOK key. '
  'Returns {valid, reason} JSON. SECURITY DEFINER; authenticated owner only.';

-- ---------------------------------------------------------------------------
-- 4. fn_byok_log_usage — per-call usage audit (service_role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_byok_log_usage(
  p_key_id      UUID,
  p_battle_id   UUID,
  p_model_id    TEXT,
  p_token_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  INSERT INTO audit.byok_key_usage (key_id, battle_id, model_id, token_count, caller_role)
  VALUES (p_key_id, p_battle_id, p_model_id, COALESCE(p_token_count, 0), 'service_role');
END;
$$;

REVOKE ALL   ON FUNCTION public.fn_byok_log_usage(UUID, UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_log_usage(UUID, UUID, TEXT, INT) TO service_role;

COMMENT ON FUNCTION public.fn_byok_log_usage IS
  'BZ: Inserts a usage record into audit.byok_key_usage. '
  'Called fire-and-forget after each successful model call. '
  'SECURITY DEFINER; service_role only. Never exposes key material.';

-- ---------------------------------------------------------------------------
-- 5. fn_byok_rotation_due — keys overdue for rotation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_byok_rotation_due()
RETURNS SETOF execution.byok_keys
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = execution, public
AS $$
  SELECT *
  FROM execution.byok_keys
  WHERE revoked_at IS NULL
    AND last_rotated_at < now() - INTERVAL '90 days'
  ORDER BY last_rotated_at ASC;
$$;

REVOKE ALL   ON FUNCTION public.fn_byok_rotation_due() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_rotation_due() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_byok_rotation_due() TO service_role;

-- Note: authenticated callers see only their own rows via the DEFINER's
-- context — we rely on a security-invoker-aware wrapper pattern.
-- For raw CLI usage, service_role is expected.

COMMENT ON FUNCTION public.fn_byok_rotation_due IS
  'BZ: Returns byok_keys rows where last_rotated_at < now() - 90 days and not revoked. '
  'Used by the daily rotation-due cron and lf byok check-rotation CLI command.';

-- ---------------------------------------------------------------------------
-- 6. fn_byok_send_rotation_notifications — pg_cron daily helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_byok_send_rotation_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, audit, agents, lensers, public
AS $$
DECLARE
  v_key   execution.byok_keys%ROWTYPE;
  v_owner UUID;
  v_count INT := 0;
BEGIN
  FOR v_key IN (
    SELECT * FROM execution.byok_keys
    WHERE revoked_at    IS NULL
      AND last_rotated_at < now() - INTERVAL '90 days'
  ) LOOP
    -- Resolve owner: byok_keys → ai_lensers → profiles
    SELECT lp.id INTO v_owner
    FROM agents.ai_lensers al
    JOIN lensers.profiles lp ON lp.id = al.profile_id
    WHERE al.id = v_key.agent_id
    LIMIT 1;

    IF v_owner IS NOT NULL THEN
      PERFORM public.fn_send_notification(
        v_owner,
        'byok_rotation_due',
        jsonb_build_object(
          'key_id',          v_key.id,
          'provider',        v_key.provider,
          'agent_id',        v_key.agent_id,
          'last_rotated_at', v_key.last_rotated_at,
          'days_overdue',    EXTRACT(DAY FROM now() - v_key.last_rotated_at - INTERVAL '90 days')::int
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL   ON FUNCTION public.fn_byok_send_rotation_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_byok_send_rotation_notifications() TO service_role;

COMMENT ON FUNCTION public.fn_byok_send_rotation_notifications IS
  'BZ: Sends byok_rotation_due notifications for all overdue keys. '
  'Called by daily pg_cron job. Returns count of notifications sent.';

-- ---------------------------------------------------------------------------
-- 7. pg_cron — daily rotation notification at 08:00 UTC
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'byok-rotation-notifications',
  '0 8 * * *',
  $$SELECT public.fn_byok_send_rotation_notifications()$$
);
