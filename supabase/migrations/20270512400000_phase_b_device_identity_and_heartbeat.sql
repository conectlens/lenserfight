-- Phase B (Trust Gateway): per-device cryptographic identity + heartbeats.
--
-- Adds the columns RFC-0003 §2.3 specifies and the device_challenges /
-- registration / heartbeat surfaces required by docs/explanation/gateway/
-- requirements.md (DA-1..5, DH-1..5).
--
-- Strictly additive: no existing column is dropped or retyped, no existing
-- RPC signature is removed. fn_device_approve continues to work for legacy
-- (no-public-key) rows; fn_device_register_with_key + fn_device_post_challenge
-- introduce the two-step path for daemon-bound devices.

-- ─── 1. Add identity + telemetry columns ─────────────────────────────────────

ALTER TABLE devices.registered_devices
  ADD COLUMN IF NOT EXISTS public_key        TEXT
    CHECK (public_key IS NULL OR char_length(public_key) BETWEEN 32 AND 256),
  ADD COLUMN IF NOT EXISTS signing_algo      TEXT
    CHECK (signing_algo IS NULL OR signing_algo IN ('ed25519')),
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daemon_version    TEXT
    CHECK (daemon_version IS NULL OR char_length(daemon_version) <= 32);

COMMENT ON COLUMN devices.registered_devices.public_key IS
  'Base64-encoded raw Ed25519 public key (32 bytes). Recorded during the '
  'two-step approve flow (fn_device_register_with_key + fn_device_post_challenge).';

COMMENT ON COLUMN devices.registered_devices.signing_algo IS
  'Signature algorithm for envelopes; v1 is always ed25519.';

COMMENT ON COLUMN devices.registered_devices.last_heartbeat_at IS
  'Updated by fn_device_heartbeat; used to derive offline / unhealthy state.';

CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat
  ON devices.registered_devices (last_heartbeat_at DESC NULLS LAST);

-- ─── 2. devices.device_challenges (one-time approval challenges) ─────────────

CREATE TABLE IF NOT EXISTS devices.device_challenges (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  lenser_id    UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  nonce        TEXT        NOT NULL UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','answered','approved','rejected','expired')),
  signature    TEXT        CHECK (signature IS NULL OR char_length(signature) <= 256),
  signed_iat   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_device_challenges_device  ON devices.device_challenges (device_id);
CREATE INDEX IF NOT EXISTS idx_device_challenges_status  ON devices.device_challenges (status);

COMMENT ON TABLE devices.device_challenges IS
  'One-time challenge nonces issued during fn_device_register_with_key. '
  'The pending device signs the nonce with its private key and posts the '
  'envelope via fn_device_post_challenge before the owner can approve.';

ALTER TABLE devices.device_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_challenges_owner_select" ON devices.device_challenges
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ─── 3. devices.nonce_cache (replay protection, used in Phase C and beyond) ─

CREATE TABLE IF NOT EXISTS devices.nonce_cache (
  nonce      TEXT        PRIMARY KEY,
  device_id  UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_nonce_cache_expires_at ON devices.nonce_cache (expires_at);

COMMENT ON TABLE devices.nonce_cache IS
  'Replay-protection cache for SignedEnvelope nonces. Retention 10 minutes; '
  'matches the iat ±300s window with overlap.';

ALTER TABLE devices.nonce_cache ENABLE ROW LEVEL SECURITY;
-- No SELECT policy — only DEFINER RPCs read/write this.

-- ─── 4. fn_device_register_with_key ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION devices.fn_device_register_with_key(
  p_name         TEXT,
  p_public_key   TEXT,
  p_device_type  TEXT  DEFAULT 'other',
  p_os           TEXT  DEFAULT NULL,
  p_arch         TEXT  DEFAULT NULL,
  p_cli_version  TEXT  DEFAULT NULL,
  p_daemon_version TEXT DEFAULT NULL,
  p_capabilities JSONB DEFAULT '{}'
)
RETURNS TABLE (
  device_id  UUID,
  challenge_id UUID,
  challenge_nonce TEXT,
  challenge_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_device_id UUID;
  v_challenge_id UUID;
  v_nonce TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  IF p_public_key IS NULL OR char_length(p_public_key) < 32 THEN
    RAISE EXCEPTION 'public_key_required' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO devices.registered_devices (
    lenser_id, name, device_type, os, arch, cli_version,
    capabilities, public_key, signing_algo, daemon_version
  ) VALUES (
    v_lenser_id, p_name, p_device_type, p_os, p_arch, p_cli_version,
    p_capabilities, p_public_key, 'ed25519', p_daemon_version
  )
  RETURNING id INTO v_device_id;

  v_nonce   := encode(extensions.gen_random_bytes(16), 'base64');
  v_expires := now() + interval '24 hours';

  INSERT INTO devices.device_challenges (device_id, lenser_id, nonce, expires_at)
  VALUES (v_device_id, v_lenser_id, v_nonce, v_expires)
  RETURNING id INTO v_challenge_id;

  RETURN QUERY SELECT v_device_id, v_challenge_id, v_nonce, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_device_register_with_key(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- ─── 5. fn_device_post_challenge ─────────────────────────────────────────────
-- The pending device proves possession of the private key by posting a
-- signature over the challenge nonce + its device_id + its public_key.
-- The signature itself is verified later in Phase F (fn_verify_attestation_signature).
-- Here we record the answer; the owner's fn_device_approve step transitions the
-- challenge from 'answered' to 'approved' and the device from pending to approved.

CREATE OR REPLACE FUNCTION devices.fn_device_post_challenge(
  p_device_id UUID,
  p_signature TEXT,
  p_signed_iat TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_challenge devices.device_challenges%ROWTYPE;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_challenge
  FROM devices.device_challenges
  WHERE device_id = p_device_id
    AND lenser_id = v_lenser_id
    AND status    = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'no_pending_challenge' USING ERRCODE = 'P0002';
  END IF;

  UPDATE devices.device_challenges
     SET status     = 'answered',
         signature  = p_signature,
         signed_iat = p_signed_iat
   WHERE id = v_challenge.id;

  RETURN v_challenge.id;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_device_post_challenge(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- ─── 6. fn_device_heartbeat ──────────────────────────────────────────────────
-- Updates last_heartbeat_at and daemon_version. Future Phase F adds envelope
-- verification here; for now we accept a non-empty signature as a stub so the
-- daemon can begin reporting and we can wire alerts.

CREATE OR REPLACE FUNCTION devices.fn_device_heartbeat(
  p_device_id      UUID,
  p_daemon_version TEXT DEFAULT NULL,
  p_envelope_sig   TEXT DEFAULT NULL,
  p_gateway_status TEXT DEFAULT 'connected'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  UPDATE devices.registered_devices
     SET last_heartbeat_at = now(),
         last_seen_at      = now(),
         daemon_version    = COALESCE(p_daemon_version, daemon_version),
         gateway_status    = COALESCE(p_gateway_status, gateway_status)
   WHERE id = p_device_id
     AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_device_heartbeat(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ─── 7. Public wrappers (CLI calls fn_device_* in the public schema) ─────────

CREATE OR REPLACE FUNCTION public.fn_device_register_with_key(
  p_name         TEXT,
  p_public_key   TEXT,
  p_device_type  TEXT  DEFAULT 'other',
  p_os           TEXT  DEFAULT NULL,
  p_arch         TEXT  DEFAULT NULL,
  p_cli_version  TEXT  DEFAULT NULL,
  p_daemon_version TEXT DEFAULT NULL,
  p_capabilities JSONB DEFAULT '{}'
)
RETURNS TABLE (
  device_id  UUID,
  challenge_id UUID,
  challenge_nonce TEXT,
  challenge_expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT * FROM devices.fn_device_register_with_key(
    p_name, p_public_key, p_device_type, p_os, p_arch,
    p_cli_version, p_daemon_version, p_capabilities
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_register_with_key(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_device_post_challenge(
  p_device_id UUID,
  p_signature TEXT,
  p_signed_iat TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT devices.fn_device_post_challenge(p_device_id, p_signature, p_signed_iat);
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_post_challenge(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_device_heartbeat(
  p_device_id      UUID,
  p_daemon_version TEXT DEFAULT NULL,
  p_envelope_sig   TEXT DEFAULT NULL,
  p_gateway_status TEXT DEFAULT 'connected'
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT devices.fn_device_heartbeat(
    p_device_id, p_daemon_version, p_envelope_sig, p_gateway_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_heartbeat(UUID, TEXT, TEXT, TEXT) TO authenticated;
