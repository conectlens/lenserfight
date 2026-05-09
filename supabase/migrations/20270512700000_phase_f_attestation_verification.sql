-- =============================================================================
-- Phase F (RFC-0003) — fn_verify_attestation_signature + harden
--                       fn_compute_submission_trust
-- =============================================================================
-- This migration moves attestation trust from "self-asserted boolean flags" to
-- "cryptographically verified signature over a canonical envelope".
--
-- Change set:
--   1. New side table `execution.attestation_verifications` (append-only via
--      trigger; one row per attestation_id).
--   2. Add nullable signing-envelope columns on `execution.attestations`
--      (`envelope_kid`, `envelope_iat`, `envelope_nonce`,
--      `envelope_body_jcs_sha256`).
--   3. Helper `execution.fn_b64url_decode(text) → bytea`.
--   4. `execution.fn_verify_attestation_signature(p_kid, p_canonical_jcs,
--      p_signature)` performs Ed25519 verification via `pgsodium`
--      (`crypto_sign_verify_detached`). Falls back to a recorded `unverified`
--      result with `invalid_reason='pgsodium_unavailable'` if the extension is
--      missing — never returns "verified" silently.
--   5. `execution.fn_record_signed_attestation(p_run_id, p_envelope,
--      p_canonical_jcs_b64url, ...)` records an attestation AND its
--      verification result atomically.
--   6. `execution.fn_compute_submission_trust` is rewritten to require an
--      affirmative `execution.attestation_verifications.verified = true` row
--      before any tier ≥ `execution_verified` is granted, and to surface the
--      verification status in `factors.signature_verified`.
--   7. Backfill: every existing attestation gets a row in
--      attestation_verifications with `verified = false,
--      invalid_reason = 'unsigned_legacy_attestation'` so trust scores remain
--      conservative for pre-Phase-F runs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. attestation_verifications side table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution.attestation_verifications (
  attestation_id   UUID        PRIMARY KEY REFERENCES execution.attestations(id) ON DELETE CASCADE,
  verified         BOOLEAN     NOT NULL DEFAULT false,
  verified_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  invalid_reason   TEXT        CHECK (invalid_reason IS NULL OR char_length(invalid_reason) <= 256),
  device_id        UUID        REFERENCES devices.registered_devices(id) ON DELETE SET NULL,
  envelope_kid     UUID,
  envelope_iat     TIMESTAMPTZ,
  envelope_nonce   TEXT        CHECK (envelope_nonce IS NULL OR char_length(envelope_nonce) <= 64),
  envelope_hash    TEXT        CHECK (envelope_hash  IS NULL OR char_length(envelope_hash)  <= 128)
);

CREATE INDEX IF NOT EXISTS idx_att_verifications_verified
  ON execution.attestation_verifications (verified);

COMMENT ON TABLE execution.attestation_verifications IS
  'Per-attestation cryptographic verification result. Append-only. '
  'Trust evaluation refuses to award execution_verified or higher when no row '
  'exists or `verified = false`.';

ALTER TABLE execution.attestation_verifications ENABLE ROW LEVEL SECURITY;

-- Owner-only read via run ownership join.
CREATE POLICY "att_verifications_owner_select"
  ON execution.attestation_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM execution.attestations a
      JOIN execution.runs r       ON r.id = a.run_id
      JOIN execution.requests req ON req.id = r.request_id
      JOIN lensers.profiles p     ON p.id = req.requester_lenser_id
      WHERE a.id = execution.attestation_verifications.attestation_id
        AND p.user_id = auth.uid()
    )
  );

CREATE OR REPLACE TRIGGER no_update_att_verifications
  BEFORE UPDATE ON execution.attestation_verifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();

CREATE OR REPLACE TRIGGER no_delete_att_verifications
  BEFORE DELETE ON execution.attestation_verifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();

-- ---------------------------------------------------------------------------
-- 2. Optional envelope metadata columns on attestations
-- ---------------------------------------------------------------------------
ALTER TABLE execution.attestations
  ADD COLUMN IF NOT EXISTS envelope_kid            UUID,
  ADD COLUMN IF NOT EXISTS envelope_iat            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS envelope_nonce          TEXT,
  ADD COLUMN IF NOT EXISTS envelope_body_jcs_sha256 TEXT;

CREATE INDEX IF NOT EXISTS idx_exec_attestations_envelope_kid
  ON execution.attestations (envelope_kid)
  WHERE envelope_kid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. base64url decode helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_b64url_decode(p_in TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_padded TEXT;
  v_pad_len INT;
BEGIN
  IF p_in IS NULL OR length(p_in) = 0 THEN
    RETURN NULL;
  END IF;
  v_padded := translate(p_in, '-_', '+/');
  v_pad_len := (4 - (length(v_padded) % 4)) % 4;
  IF v_pad_len > 0 THEN
    v_padded := v_padded || repeat('=', v_pad_len);
  END IF;
  RETURN decode(v_padded, 'base64');
END;
$$;

COMMENT ON FUNCTION execution.fn_b64url_decode IS
  'Decode RFC 4648 base64url (no padding) to bytea. Used by signature '
  'verification helpers.';

REVOKE ALL ON FUNCTION execution.fn_b64url_decode(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execution.fn_b64url_decode(TEXT)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. fn_verify_attestation_signature — pure verifier
-- ---------------------------------------------------------------------------
-- Returns NULL when the device or pgsodium is missing (not the same as
-- "verified false" for known-bad signatures); the caller distinguishes the
-- two outcomes by inspecting `invalid_reason`.
CREATE OR REPLACE FUNCTION execution.fn_verify_attestation_signature(
  p_kid              UUID,
  p_canonical_jcs    BYTEA,
  p_signature        BYTEA
)
RETURNS TABLE (
  verified       BOOLEAN,
  invalid_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, extensions, public
AS $$
DECLARE
  v_pk_b64       TEXT;
  v_pk           BYTEA;
  v_pgsodium_ok  BOOLEAN;
  v_ok           BOOLEAN;
BEGIN
  IF p_kid IS NULL OR p_canonical_jcs IS NULL OR p_signature IS NULL THEN
    RETURN QUERY SELECT false, 'missing_input';
    RETURN;
  END IF;

  IF length(p_signature) <> 64 THEN
    RETURN QUERY SELECT false, 'bad_signature_length';
    RETURN;
  END IF;

  SELECT rd.public_key INTO v_pk_b64
  FROM devices.registered_devices rd
  WHERE rd.id = p_kid
    AND COALESCE(rd.signing_algo, 'ed25519') = 'ed25519';

  IF v_pk_b64 IS NULL THEN
    RETURN QUERY SELECT false, 'unknown_device_or_algo';
    RETURN;
  END IF;

  -- The keychain stores raw 32-byte Ed25519 public keys as base64url.
  v_pk := execution.fn_b64url_decode(v_pk_b64);
  IF v_pk IS NULL OR length(v_pk) <> 32 THEN
    -- Some clients may have submitted standard base64; try that as a fallback.
    BEGIN
      v_pk := decode(v_pk_b64, 'base64');
    EXCEPTION WHEN OTHERS THEN
      v_pk := NULL;
    END;
    IF v_pk IS NULL OR length(v_pk) <> 32 THEN
      RETURN QUERY SELECT false, 'malformed_public_key';
      RETURN;
    END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgsodium')
    INTO v_pgsodium_ok;
  IF NOT v_pgsodium_ok THEN
    RETURN QUERY SELECT false, 'pgsodium_unavailable';
    RETURN;
  END IF;

  BEGIN
    EXECUTE 'SELECT pgsodium.crypto_sign_verify_detached($1, $2, $3)'
      INTO v_ok
      USING p_signature, p_canonical_jcs, v_pk;
  EXCEPTION WHEN OTHERS THEN
    v_ok := NULL;
  END;

  IF v_ok IS TRUE THEN
    RETURN QUERY SELECT true, NULL::TEXT;
  ELSIF v_ok IS FALSE THEN
    RETURN QUERY SELECT false, 'signature_invalid';
  ELSE
    RETURN QUERY SELECT false, 'pgsodium_call_failed';
  END IF;
END;
$$;

COMMENT ON FUNCTION execution.fn_verify_attestation_signature IS
  'Ed25519 verification of an attestation envelope. Returns (verified, '
  'invalid_reason). Never grants verified=true silently if pgsodium is missing.';

REVOKE ALL ON FUNCTION execution.fn_verify_attestation_signature(UUID, BYTEA, BYTEA)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execution.fn_verify_attestation_signature(UUID, BYTEA, BYTEA)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. fn_record_signed_attestation — record + verify in one transaction
-- ---------------------------------------------------------------------------
-- Inputs are base64url-encoded so the daemon can reuse the same encoding it
-- already uses for the signed envelope on the wire. Verification result is
-- written to attestation_verifications regardless of outcome (audit trail).
CREATE OR REPLACE FUNCTION execution.fn_record_signed_attestation(
  p_run_id                  UUID,
  p_envelope_kid            UUID,
  p_envelope_iat            TIMESTAMPTZ,
  p_envelope_nonce          TEXT,
  p_canonical_jcs_b64url    TEXT,
  p_signature_b64url        TEXT,
  p_workflow_hash           TEXT DEFAULT NULL,
  p_lens_hash               TEXT DEFAULT NULL,
  p_agent_config_hash       TEXT DEFAULT NULL,
  p_runner_version          TEXT DEFAULT NULL,
  p_cli_version             TEXT DEFAULT NULL,
  p_policy_passed           BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, lensers, public, extensions
AS $$
DECLARE
  v_attestation_id   UUID;
  v_canonical_bytes  BYTEA;
  v_signature_bytes  BYTEA;
  v_envelope_hash    TEXT;
  v_verify_row       RECORD;
  v_device_trusted   BOOLEAN := false;
BEGIN
  IF p_run_id IS NULL OR p_envelope_kid IS NULL THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;

  v_canonical_bytes := execution.fn_b64url_decode(p_canonical_jcs_b64url);
  v_signature_bytes := execution.fn_b64url_decode(p_signature_b64url);
  IF v_canonical_bytes IS NULL OR v_signature_bytes IS NULL THEN
    RAISE EXCEPTION 'invalid_envelope' USING ERRCODE = '22023';
  END IF;

  v_envelope_hash := encode(extensions.digest(v_canonical_bytes, 'sha256'), 'hex');

  SELECT (rd.trust_level IN ('approved','trusted'))
    INTO v_device_trusted
  FROM devices.registered_devices rd
  WHERE rd.id = p_envelope_kid;
  v_device_trusted := COALESCE(v_device_trusted, false);

  -- Insert the attestation row (append-only)
  INSERT INTO execution.attestations (
    run_id, device_id, signed, signature,
    gateway_verified, device_trusted, policy_passed,
    workflow_hash, lens_hash, agent_config_hash,
    runner_version, cli_version,
    envelope_kid, envelope_iat, envelope_nonce, envelope_body_jcs_sha256
  ) VALUES (
    p_run_id, p_envelope_kid, true, p_signature_b64url,
    false,                  -- gateway_verified is now derived from the verification row
    v_device_trusted, p_policy_passed,
    p_workflow_hash, p_lens_hash, p_agent_config_hash,
    p_runner_version, p_cli_version,
    p_envelope_kid, p_envelope_iat, p_envelope_nonce, v_envelope_hash
  )
  RETURNING id INTO v_attestation_id;

  -- Verify and persist verification result
  SELECT * INTO v_verify_row
  FROM execution.fn_verify_attestation_signature(
    p_envelope_kid, v_canonical_bytes, v_signature_bytes
  );

  INSERT INTO execution.attestation_verifications (
    attestation_id, verified, verified_at, invalid_reason,
    device_id, envelope_kid, envelope_iat, envelope_nonce, envelope_hash
  ) VALUES (
    v_attestation_id, COALESCE(v_verify_row.verified, false),
    now(), v_verify_row.invalid_reason,
    p_envelope_kid, p_envelope_kid, p_envelope_iat, p_envelope_nonce, v_envelope_hash
  );

  RETURN v_attestation_id;
END;
$$;

COMMENT ON FUNCTION execution.fn_record_signed_attestation IS
  'Atomic record+verify path for signed execution attestations (RFC-0003 '
  'Phase F). Verification result is always persisted to '
  'execution.attestation_verifications.';

REVOKE ALL ON FUNCTION execution.fn_record_signed_attestation(
  UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execution.fn_record_signed_attestation(
  UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated, service_role;

-- Public wrapper so the CLI can call it without a schema-routing header.
CREATE OR REPLACE FUNCTION public.fn_record_signed_attestation(
  p_run_id                  UUID,
  p_envelope_kid            UUID,
  p_envelope_iat            TIMESTAMPTZ,
  p_envelope_nonce          TEXT,
  p_canonical_jcs_b64url    TEXT,
  p_signature_b64url        TEXT,
  p_workflow_hash           TEXT DEFAULT NULL,
  p_lens_hash               TEXT DEFAULT NULL,
  p_agent_config_hash       TEXT DEFAULT NULL,
  p_runner_version          TEXT DEFAULT NULL,
  p_cli_version             TEXT DEFAULT NULL,
  p_policy_passed           BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = execution, public
AS $$
  SELECT execution.fn_record_signed_attestation(
    p_run_id, p_envelope_kid, p_envelope_iat, p_envelope_nonce,
    p_canonical_jcs_b64url, p_signature_b64url,
    p_workflow_hash, p_lens_hash, p_agent_config_hash,
    p_runner_version, p_cli_version, p_policy_passed
  );
$$;

REVOKE ALL ON FUNCTION public.fn_record_signed_attestation(
  UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_record_signed_attestation(
  UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Hardened fn_compute_submission_trust
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_compute_submission_trust(p_submission_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, battles, lensers, public, extensions
AS $$
DECLARE
  v_run_id            UUID;
  v_attestation       execution.attestations%ROWTYPE;
  v_verification      execution.attestation_verifications%ROWTYPE;
  v_trust_level       TEXT := 'unverified';
  v_factors           JSONB := '{}';
  v_account_ok        BOOLEAN := false;
  v_agent_ok          BOOLEAN := false;
  v_signature_verified BOOLEAN := false;
BEGIN
  -- Account / run ownership
  SELECT er.id INTO v_run_id
  FROM battles.submissions s
  JOIN execution.runs er ON er.id = s.execution_run_id
  WHERE s.id = p_submission_id
  LIMIT 1;

  v_account_ok := (v_run_id IS NOT NULL);
  v_factors := v_factors || jsonb_build_object('account_authenticated', v_account_ok);

  IF NOT v_account_ok THEN
    INSERT INTO execution.trust_evaluations (submission_id, trust_level, factors, evaluated_at)
    VALUES (p_submission_id, 'unverified', v_factors, now())
    ON CONFLICT (submission_id) DO UPDATE
      SET trust_level = EXCLUDED.trust_level,
          factors = EXCLUDED.factors,
          evaluated_at = EXCLUDED.evaluated_at;
    RETURN 'unverified';
  END IF;

  v_trust_level := 'account_verified';

  SELECT EXISTS (
    SELECT 1 FROM battles.contenders bc
    WHERE bc.battle_id = (SELECT battle_id FROM battles.submissions WHERE id = p_submission_id)
      AND bc.contender_type IN ('ai_agent','ai_runner')
  ) INTO v_agent_ok;
  v_factors := v_factors || jsonb_build_object('agent_owner_verified', v_agent_ok);
  IF v_agent_ok THEN v_trust_level := 'agent_verified'; END IF;

  -- Latest attestation for this run
  SELECT * INTO v_attestation
  FROM execution.attestations
  WHERE run_id = v_run_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_attestation.id IS NOT NULL THEN
    SELECT * INTO v_verification
    FROM execution.attestation_verifications
    WHERE attestation_id = v_attestation.id;

    v_signature_verified := COALESCE(v_verification.verified, false);

    v_factors := v_factors || jsonb_build_object(
      'device_trusted',         v_attestation.device_trusted,
      'runner_connected',       v_attestation.device_id IS NOT NULL,
      'execution_signed',       v_attestation.signed,
      'signature_verified',     v_signature_verified,
      'signature_invalid_reason', v_verification.invalid_reason,
      'policy_passed',          v_attestation.policy_passed,
      'workflow_hash_recorded', v_attestation.workflow_hash IS NOT NULL,
      'lens_hash_recorded',     v_attestation.lens_hash IS NOT NULL,
      'envelope_recorded',      v_attestation.envelope_kid IS NOT NULL
    );

    IF v_attestation.device_trusted THEN
      v_trust_level := 'device_verified';
    END IF;
    IF v_attestation.device_id IS NOT NULL AND v_attestation.device_trusted THEN
      v_trust_level := 'runner_verified';
    END IF;

    -- Phase F: execution_verified now requires a positive signature verification.
    -- The legacy `gateway_verified` flag is no longer accepted.
    IF v_attestation.signed AND v_signature_verified THEN
      v_trust_level := 'execution_verified';
    END IF;

    IF v_attestation.signed
       AND v_signature_verified
       AND v_attestation.device_trusted
       AND v_attestation.policy_passed
       AND v_attestation.workflow_hash IS NOT NULL
       AND v_attestation.lens_hash IS NOT NULL
       AND v_attestation.envelope_kid IS NOT NULL
    THEN
      v_trust_level := 'fully_trusted';
    END IF;
  END IF;

  INSERT INTO execution.trust_evaluations (
    submission_id, attestation_id, trust_level, factors, evaluated_at
  ) VALUES (
    p_submission_id,
    v_attestation.id,
    v_trust_level,
    v_factors,
    now()
  )
  ON CONFLICT (submission_id) DO UPDATE
    SET attestation_id = EXCLUDED.attestation_id,
        trust_level    = EXCLUDED.trust_level,
        factors        = EXCLUDED.factors,
        evaluated_at   = EXCLUDED.evaluated_at;

  RETURN v_trust_level;
END;
$$;

-- Function exists previously; re-grant for safety.
REVOKE ALL ON FUNCTION execution.fn_compute_submission_trust(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execution.fn_compute_submission_trust(UUID)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Backfill: pre-Phase-F attestations are conservatively unverified
-- ---------------------------------------------------------------------------
INSERT INTO execution.attestation_verifications (
  attestation_id, verified, verified_at, invalid_reason, device_id
)
SELECT
  a.id,
  false,
  COALESCE(a.created_at, now()),
  'unsigned_legacy_attestation',
  a.device_id
FROM execution.attestations a
LEFT JOIN execution.attestation_verifications v
  ON v.attestation_id = a.id
WHERE v.attestation_id IS NULL;
