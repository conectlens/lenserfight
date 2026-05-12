-- Phase AV — Gateway sync: outbox/command stream from cloud → daemon.
--
-- The cloud queues commands by INSERTing rows into agents.gateway_commands.
-- The daemon claims a batch via fn_gateway_claim_commands, dispatches them,
-- then calls fn_gateway_ack_commands with the IDs it processed.
--
-- Authorization model:
--   - Devices are uniquely owned (agents.gateway_devices.owner_id).
--   - claim / ack are SECURITY DEFINER and verify the caller owns the device.
--   - INSERT into gateway_commands is reserved for service_role (only the
--     cloud's privileged worker / operator tools may enqueue commands).
--
-- Idempotency: claimed_at = now() marks a row as claimed; subsequent claims
-- skip it. ack sets acked_at = now() once and is a no-op on re-ack.

-- ── 1. agents.gateway_commands ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.gateway_commands (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     UUID        NOT NULL REFERENCES agents.gateway_devices(device_id) ON DELETE CASCADE,
  command_type  TEXT        NOT NULL
                  CHECK (char_length(command_type) BETWEEN 1 AND 64),
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at    TIMESTAMPTZ,
  acked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gateway_commands_pending
  ON agents.gateway_commands (device_id, created_at)
  WHERE claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gateway_commands_unacked
  ON agents.gateway_commands (device_id)
  WHERE acked_at IS NULL;

COMMENT ON TABLE agents.gateway_commands IS
  'Phase AV: outbox of commands queued by the cloud for a specific gateway '
  'device. Daemons pull via fn_gateway_claim_commands and confirm via '
  'fn_gateway_ack_commands.';

-- ── 2. RLS — owner-only SELECT, INSERT reserved for service_role ────────────
ALTER TABLE agents.gateway_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gateway_commands_owner_select ON agents.gateway_commands;
CREATE POLICY gateway_commands_owner_select ON agents.gateway_commands
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents.gateway_devices d
      WHERE d.device_id = agents.gateway_commands.device_id
        AND d.owner_id = auth.uid()
    )
  );

-- ── 3. fn_gateway_claim_commands ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_claim_commands(
  p_device_id UUID,
  p_limit     INT DEFAULT 10
)
RETURNS SETOF agents.gateway_commands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_capped  INT  := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM agents.gateway_devices
     WHERE device_id = p_device_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'device_not_owned' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT id
      FROM agents.gateway_commands
     WHERE device_id  = p_device_id
       AND claimed_at IS NULL
     ORDER BY created_at ASC
     LIMIT v_capped
     FOR UPDATE SKIP LOCKED
  )
  UPDATE agents.gateway_commands gc
     SET claimed_at = now()
    FROM claimable
   WHERE gc.id = claimable.id
   RETURNING gc.*;
END $$;

-- agents schema is not in exposed_schemas; public wrapper below is the sole PostgREST entry point.

CREATE OR REPLACE FUNCTION public.fn_gateway_claim_commands(
  p_device_id UUID,
  p_limit     INT DEFAULT 10
)
RETURNS SETOF agents.gateway_commands
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT * FROM agents.fn_gateway_claim_commands(p_device_id, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_claim_commands(UUID, INT)
  TO authenticated, service_role;

-- ── 4. fn_gateway_ack_commands ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_ack_commands(
  p_command_ids UUID[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_count  INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_command_ids IS NULL OR cardinality(p_command_ids) = 0 THEN
    RETURN 0;
  END IF;
  IF cardinality(p_command_ids) > 100 THEN
    RAISE EXCEPTION 'too_many_ids' USING ERRCODE = '22023';
  END IF;

  WITH owned AS (
    SELECT gc.id
      FROM agents.gateway_commands gc
      JOIN agents.gateway_devices d ON d.device_id = gc.device_id
     WHERE d.owner_id = v_uid
       AND gc.id = ANY(p_command_ids)
       AND gc.acked_at IS NULL
  )
  UPDATE agents.gateway_commands gc
     SET acked_at = now()
    FROM owned
   WHERE gc.id = owned.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- agents schema is not in exposed_schemas; public wrapper below is the sole PostgREST entry point.

CREATE OR REPLACE FUNCTION public.fn_gateway_ack_commands(
  p_command_ids UUID[]
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT agents.fn_gateway_ack_commands(p_command_ids);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_ack_commands(UUID[])
  TO authenticated, service_role;
