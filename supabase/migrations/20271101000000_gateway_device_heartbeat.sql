-- Phase AU — Gateway device heartbeat & registration.
--
-- Provides a lightweight, daemon-friendly heartbeat path under the `agents`
-- schema separate from the richer `devices.*` flow used by the CLI. This is
-- the table the long-running `lf-gatewayd` daemon writes to on its periodic
-- heartbeat loop. Owner is the auth.users row associated with the device.
--
-- The returned JSON shape is small on purpose so daemons can act on a single
-- payload: { approved: bool, kill_switch: bool }.

-- ── 1. agents.gateway_devices ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.gateway_devices (
  device_id       UUID        PRIMARY KEY,
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname        TEXT        CHECK (hostname IS NULL OR char_length(hostname) <= 253),
  public_key      TEXT        NOT NULL
                    CHECK (char_length(public_key) BETWEEN 32 AND 256),
  daemon_version  TEXT
                    CHECK (daemon_version IS NULL OR char_length(daemon_version) <= 64),
  last_seen_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  kill_switch     BOOLEAN     NOT NULL DEFAULT false,
  key_rotated_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_devices_owner
  ON agents.gateway_devices (owner_id);
CREATE INDEX IF NOT EXISTS idx_gateway_devices_last_seen
  ON agents.gateway_devices (last_seen_at DESC NULLS LAST);

COMMENT ON TABLE agents.gateway_devices IS
  'Phase AU: long-running gateway daemon registrations. The daemon upserts '
  'its row on every heartbeat and reacts to the {approved, kill_switch} flags '
  'returned by fn_gateway_heartbeat.';

-- ── 2. RLS — owner-only SELECT; writes via SECURITY DEFINER RPC ─────────────
ALTER TABLE agents.gateway_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gateway_devices_owner_select ON agents.gateway_devices;
CREATE POLICY gateway_devices_owner_select ON agents.gateway_devices
  FOR SELECT
  USING (owner_id = auth.uid());

-- INSERT/UPDATE/DELETE are intentionally not exposed; only service_role and
-- the SECURITY DEFINER fn_gateway_heartbeat below may write.

-- ── 3. agents.fn_gateway_heartbeat ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_heartbeat(
  p_device_id      UUID,
  p_public_key     TEXT,
  p_hostname       TEXT  DEFAULT NULL,
  p_daemon_version TEXT  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_row          agents.gateway_devices%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_public_key IS NULL OR char_length(p_public_key) < 32 THEN
    RAISE EXCEPTION 'public_key_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.gateway_devices (
    device_id, owner_id, hostname, public_key, daemon_version, last_seen_at
  ) VALUES (
    p_device_id, v_uid, p_hostname, p_public_key, p_daemon_version, now()
  )
  ON CONFLICT (device_id) DO UPDATE
    SET hostname       = COALESCE(EXCLUDED.hostname,       agents.gateway_devices.hostname),
        daemon_version = COALESCE(EXCLUDED.daemon_version, agents.gateway_devices.daemon_version),
        last_seen_at   = now()
    -- public_key is NOT updated on heartbeat; use fn_gateway_rotate_key for explicit rotation.
    WHERE agents.gateway_devices.owner_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.device_id IS NULL THEN
    -- ON CONFLICT collided with a row owned by someone else.
    RAISE EXCEPTION 'device_not_owned' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'approved',    v_row.approved_at IS NOT NULL AND v_row.revoked_at IS NULL,
    'kill_switch', COALESCE(v_row.kill_switch, false)
  );
END $$;

-- agents schema is not in exposed_schemas; no direct grant needed for authenticated.
-- The public wrapper below is the sole PostgREST entry point.

-- Public wrapper so PostgREST exposes it on /rpc/fn_gateway_heartbeat.
CREATE OR REPLACE FUNCTION public.fn_gateway_heartbeat(
  p_device_id      UUID,
  p_public_key     TEXT,
  p_hostname       TEXT  DEFAULT NULL,
  p_daemon_version TEXT  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT agents.fn_gateway_heartbeat(p_device_id, p_public_key, p_hostname, p_daemon_version);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_heartbeat(UUID, TEXT, TEXT, TEXT)
  TO authenticated, service_role;
