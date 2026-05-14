-- Fix fn_gateway_claim_commands_v2 after adding OUT column `device_id`.
-- In plpgsql, OUT columns are variables, so unqualified `device_id` is
-- ambiguous inside SQL statements.

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
    SELECT 1
    FROM agents.gateway_devices d
    WHERE d.device_id = p_device_id
      AND d.owner_id = v_uid
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
