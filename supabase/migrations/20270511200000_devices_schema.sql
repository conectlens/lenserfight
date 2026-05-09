-- Phase 36: Devices schema — persistent device registry for trusted local execution
-- Separate from authz.device_approval_requests (RFC 8628 auth flow); this tracks
-- approved devices long-term with trust state, capabilities, and gateway health.

CREATE SCHEMA IF NOT EXISTS devices;

CREATE TABLE devices.registered_devices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id      UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  device_type    TEXT        NOT NULL DEFAULT 'other'
                   CHECK (device_type IN ('desktop','laptop','server','cloud','other')),
  os             TEXT        CHECK (char_length(os) <= 64),
  arch           TEXT        CHECK (char_length(arch) <= 32),
  cli_version    TEXT        CHECK (char_length(cli_version) <= 32),
  runner_version TEXT        CHECK (char_length(runner_version) <= 32),
  capabilities   JSONB       NOT NULL DEFAULT '{}',
  trust_level    TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (trust_level IN ('pending','approved','trusted','offline','revoked','blocked','unhealthy')),
  gateway_status TEXT        NOT NULL DEFAULT 'disconnected'
                   CHECK (char_length(gateway_status) <= 32),
  last_seen_at   TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT revoked_at_requires_revoked_state
    CHECK (revoked_at IS NULL OR trust_level IN ('revoked','blocked'))
);

CREATE INDEX idx_devices_lenser_id     ON devices.registered_devices (lenser_id);
CREATE INDEX idx_devices_trust_level   ON devices.registered_devices (trust_level) WHERE trust_level NOT IN ('revoked','blocked');
CREATE INDEX idx_devices_last_seen     ON devices.registered_devices (last_seen_at DESC NULLS LAST);

COMMENT ON TABLE devices.registered_devices IS
  'Persistent registry of developer-owned local machines approved for trusted execution. '
  'Created and mutated only via SECURITY DEFINER RPCs — no direct INSERT/UPDATE from clients.';

ALTER TABLE devices.registered_devices ENABLE ROW LEVEL SECURITY;

-- Owner can read their own devices; no direct write
CREATE POLICY "devices_owner_select" ON devices.registered_devices
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "devices_owner_delete" ON devices.registered_devices
  FOR DELETE
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ---------------------------------------------------------------------------
-- fn_device_register — create a pending device record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_device_register(
  p_name         TEXT,
  p_device_type  TEXT DEFAULT 'other',
  p_os           TEXT DEFAULT NULL,
  p_arch         TEXT DEFAULT NULL,
  p_cli_version  TEXT DEFAULT NULL,
  p_capabilities JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_device_id UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required';
  END IF;

  INSERT INTO devices.registered_devices (
    lenser_id, name, device_type, os, arch, cli_version, capabilities
  ) VALUES (
    v_lenser_id, p_name, p_device_type, p_os, p_arch, p_cli_version, p_capabilities
  )
  RETURNING id INTO v_device_id;

  RETURN v_device_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_device_approve — elevate trust_level from pending → approved
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_device_approve(p_device_id UUID)
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
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  UPDATE devices.registered_devices
  SET trust_level = 'approved'
  WHERE id = p_device_id
    AND lenser_id = v_lenser_id
    AND trust_level = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_found_or_not_pending';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_device_revoke — revoke a trusted device immediately
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_device_revoke(p_device_id UUID)
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
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  UPDATE devices.registered_devices
  SET trust_level = 'revoked', revoked_at = now()
  WHERE id = p_device_id
    AND lenser_id = v_lenser_id
    AND trust_level NOT IN ('revoked','blocked');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_found_or_already_revoked';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_device_list — list devices for the calling lenser
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_device_list(
  p_trust_level TEXT DEFAULT NULL,
  p_limit       INT  DEFAULT 50,
  p_cursor      UUID DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  device_type    TEXT,
  os             TEXT,
  arch           TEXT,
  cli_version    TEXT,
  runner_version TEXT,
  capabilities   JSONB,
  trust_level    TEXT,
  gateway_status TEXT,
  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ
)
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
    RAISE EXCEPTION 'auth_required';
  END IF;

  p_limit := LEAST(p_limit, 100);

  RETURN QUERY
  SELECT
    d.id, d.name, d.device_type, d.os, d.arch,
    d.cli_version, d.runner_version, d.capabilities,
    d.trust_level, d.gateway_status, d.last_seen_at, d.created_at
  FROM devices.registered_devices d
  WHERE d.lenser_id = v_lenser_id
    AND (p_trust_level IS NULL OR d.trust_level = p_trust_level)
    AND (p_cursor IS NULL OR d.id > p_cursor)
  ORDER BY d.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT USAGE ON SCHEMA devices TO authenticated;
GRANT EXECUTE ON FUNCTION devices.fn_device_register  TO authenticated;
GRANT EXECUTE ON FUNCTION devices.fn_device_approve   TO authenticated;
GRANT EXECUTE ON FUNCTION devices.fn_device_revoke    TO authenticated;
GRANT EXECUTE ON FUNCTION devices.fn_device_list      TO authenticated;
