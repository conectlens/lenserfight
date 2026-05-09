-- =============================================================================
-- Pre-OSS LTG hardening: chain verification authz + leader lease renewal
-- =============================================================================
-- This migration is intentionally additive/replacing only SECURITY DEFINER
-- functions. It does not rewrite existing gateway data.
--
-- Changes:
--   1. audit.fn_chain_verify(p_lenser_id, p_chain_kind) now permits:
--      - service_role, or
--      - the authenticated user whose lensers.profiles.user_id = auth.uid().
--      Other callers receive SQLSTATE 42501.
--   2. devices.fn_acquire_leader_lease renews a lease when the same trusted
--      device currently holds it. Previously renewal before expiry returned
--      holder_acquired=true but left expires_at unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION audit.fn_chain_verify(
  p_lenser_id UUID,
  p_chain_kind TEXT DEFAULT 'gateway'
)
RETURNS TABLE (
  ok                BOOLEAN,
  total_rows        BIGINT,
  first_break_id    UUID,
  first_break_seq   BIGINT,
  reason            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, lensers, public, extensions
AS $$
DECLARE
  v_row             audit.hash_chains%ROWTYPE;
  v_event           audit.events%ROWTYPE;
  v_prev_hash       TEXT;
  v_canonical       TEXT;
  v_expected_hash   TEXT;
  v_total           BIGINT := 0;
  v_break_id        UUID;
  v_break_seq       BIGINT;
  v_break_reason    TEXT;
  v_caller_role     TEXT := COALESCE(auth.role(), current_user);
  v_caller_owns     BOOLEAN := false;
BEGIN
  IF p_chain_kind NOT IN ('gateway') THEN
    RAISE EXCEPTION 'unsupported_chain_kind';
  END IF;

  IF p_lenser_id IS NULL THEN
    RAISE EXCEPTION 'lenser_required' USING ERRCODE = '22023';
  END IF;

  IF v_caller_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1
      FROM lensers.profiles lp
      WHERE lp.id = p_lenser_id
        AND lp.user_id = auth.uid()
    ) INTO v_caller_owns;

    IF NOT COALESCE(v_caller_owns, false) THEN
      RAISE EXCEPTION 'chain_verify_owner_required' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_prev_hash := NULL;
  FOR v_row IN
    SELECT *
    FROM audit.hash_chains
    WHERE chain_kind = p_chain_kind
      AND subject_lenser_id = p_lenser_id
    ORDER BY sub_sequence_no ASC
  LOOP
    v_total := v_total + 1;
    SELECT * INTO v_event FROM audit.events WHERE id = v_row.event_id;
    IF v_event.id IS NULL THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'event_missing';
      EXIT;
    END IF;

    v_canonical := jsonb_strip_nulls(jsonb_build_object(
      'event_id',   v_event.id,
      'event_type', v_event.event_type,
      'lenser_id',  v_row.subject_lenser_id,
      'device_id',  v_row.subject_device_id,
      'payload',    v_event.payload,
      'sub_seq',    v_row.sub_sequence_no
    ))::text;

    v_expected_hash := encode(
      extensions.digest(COALESCE(v_prev_hash, '') || v_canonical, 'sha256'),
      'hex'
    );

    IF v_expected_hash IS DISTINCT FROM v_row.payload_hash THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'payload_hash_mismatch';
      EXIT;
    END IF;
    IF COALESCE(v_row.prev_hash, '') IS DISTINCT FROM COALESCE(v_prev_hash, '') THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'prev_hash_mismatch';
      EXIT;
    END IF;

    v_prev_hash := v_row.payload_hash;
  END LOOP;

  IF v_break_id IS NULL THEN
    RETURN QUERY SELECT true, v_total, NULL::UUID, NULL::BIGINT, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, v_total, v_break_id, v_break_seq, v_break_reason;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION audit.fn_chain_verify(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_chain_verify(UUID, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION audit.fn_chain_verify(UUID, TEXT) IS
  'Walk a caller-owned gateway hash chain and verify every link. service_role '
  'may verify any chain; authenticated users may verify only their own Lenser chain.';

CREATE OR REPLACE FUNCTION devices.fn_acquire_leader_lease(
  p_lease_kind     TEXT,
  p_device_id      UUID,
  p_lease_seconds  INT DEFAULT 30
)
RETURNS TABLE (
  holder_device_id UUID,
  holder_acquired  BOOLEAN,
  expires_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_now       TIMESTAMPTZ := now();
  v_holder    UUID;
  v_expires   TIMESTAMPTZ;
  v_acquired  BOOLEAN := false;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices
    WHERE id = p_device_id
      AND lenser_id = v_lenser_id
      AND trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'device_not_trusted' USING ERRCODE = '42501';
  END IF;

  p_lease_seconds := GREATEST(LEAST(COALESCE(p_lease_seconds, 30), 600), 5);
  v_expires := v_now + make_interval(secs => p_lease_seconds);

  INSERT INTO devices.peer_leases (lease_kind, lenser_id, device_id, acquired_at, expires_at)
  VALUES (p_lease_kind, v_lenser_id, p_device_id, v_now, v_expires)
  ON CONFLICT (lease_kind, lenser_id) DO UPDATE
    SET device_id   = CASE
                        WHEN devices.peer_leases.expires_at < v_now
                          OR devices.peer_leases.device_id = EXCLUDED.device_id
                        THEN EXCLUDED.device_id
                        ELSE devices.peer_leases.device_id
                      END,
        acquired_at = CASE
                        WHEN devices.peer_leases.expires_at < v_now
                          OR devices.peer_leases.device_id = EXCLUDED.device_id
                        THEN v_now
                        ELSE devices.peer_leases.acquired_at
                      END,
        expires_at  = CASE
                        WHEN devices.peer_leases.expires_at < v_now
                          OR devices.peer_leases.device_id = EXCLUDED.device_id
                        THEN v_expires
                        ELSE devices.peer_leases.expires_at
                      END
  RETURNING device_id, expires_at INTO v_holder, v_expires;

  v_acquired := (v_holder = p_device_id);

  RETURN QUERY SELECT v_holder, v_acquired, v_expires;
END;
$$;

REVOKE ALL ON FUNCTION devices.fn_acquire_leader_lease(TEXT, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION devices.fn_acquire_leader_lease(TEXT, UUID, INT) TO authenticated;

COMMENT ON FUNCTION devices.fn_acquire_leader_lease(TEXT, UUID, INT) IS
  'Acquire or renew a per-Lenser gateway leader lease for a trusted device. '
  'The current holder may renew before expiry; other devices may acquire only after expiry.';
