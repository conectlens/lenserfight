-- Phase BG — Gateway sync v2: signed command envelopes.
--
-- Adds optional envelope_sig (Ed25519 over JCS-canonical payload) and an
-- envelope_nonce (random 128-bit, prevents replay) columns to
-- agents.gateway_commands. Introduces fn_gateway_claim_commands_v2 which
-- mirrors v1 but returns the two new columns.
--
-- v1 (fn_gateway_claim_commands) is kept for backward compatibility; its
-- comment is updated to mark it deprecated.

-- ── 1. new columns ──────────────────────────────────────────────────────────
ALTER TABLE agents.gateway_commands
  ADD COLUMN IF NOT EXISTS envelope_sig   TEXT
    CHECK (envelope_sig IS NULL OR char_length(envelope_sig) BETWEEN 16 AND 512),
  ADD COLUMN IF NOT EXISTS envelope_nonce TEXT
    CHECK (envelope_nonce IS NULL OR char_length(envelope_nonce) BETWEEN 16 AND 128);

COMMENT ON COLUMN agents.gateway_commands.envelope_sig IS
  'Phase BG: base64url Ed25519 signature over the canonical JCS encoding of '
  '{id, device_id, command_type, payload, created_at, envelope_nonce}. The '
  'daemon refuses commands whose signature does not verify against the cloud '
  'signing key.';
COMMENT ON COLUMN agents.gateway_commands.envelope_nonce IS
  'Phase BG: random 128-bit nonce included in the signed envelope so '
  'attempted replays of an old (still-valid signature) command can be '
  'detected by the daemon.';

-- ── 2. fn_gateway_claim_commands_v2 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_claim_commands_v2(
  p_device_id UUID,
  p_limit     INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  device_id       UUID,
  command_type    TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ,
  claimed_at      TIMESTAMPTZ,
  acked_at        TIMESTAMPTZ,
  envelope_sig    TEXT,
  envelope_nonce  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_capped INT  := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM agents.gateway_devices d
     WHERE d.device_id = p_device_id AND d.owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'device_not_owned' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT gc.id
      FROM agents.gateway_commands gc
     WHERE gc.device_id  = p_device_id
       AND gc.claimed_at IS NULL
     ORDER BY gc.created_at ASC
     LIMIT v_capped
     FOR UPDATE SKIP LOCKED
  )
  UPDATE agents.gateway_commands gc
     SET claimed_at = now()
    FROM claimable
   WHERE gc.id = claimable.id
   RETURNING gc.id, gc.device_id, gc.command_type, gc.payload, gc.created_at,
             gc.claimed_at, gc.acked_at, gc.envelope_sig, gc.envelope_nonce;
END $$;

CREATE OR REPLACE FUNCTION public.fn_gateway_claim_commands_v2(
  p_device_id UUID,
  p_limit     INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  device_id       UUID,
  command_type    TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ,
  claimed_at      TIMESTAMPTZ,
  acked_at        TIMESTAMPTZ,
  envelope_sig    TEXT,
  envelope_nonce  TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT * FROM agents.fn_gateway_claim_commands_v2(p_device_id, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_claim_commands_v2(UUID, INT)
  TO authenticated, service_role;

-- ── 3. mark v1 deprecated ───────────────────────────────────────────────────
COMMENT ON FUNCTION agents.fn_gateway_claim_commands(UUID, INT) IS
  'Deprecated since Phase BG. Use fn_gateway_claim_commands_v2 instead — it '
  'returns the envelope_sig + envelope_nonce columns the daemon needs to '
  'verify a command before dispatching it.';
COMMENT ON FUNCTION public.fn_gateway_claim_commands(UUID, INT) IS
  'Deprecated since Phase BG. Use public.fn_gateway_claim_commands_v2.';
