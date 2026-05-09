-- Phase 37: Runner–device bindings — link workspace runners to physical registered devices.
-- Runners (created via fn_runner_register) are workspace-scoped.
-- This table adds a device dimension so a runner can be tied to a specific trusted machine.

CREATE TABLE IF NOT EXISTS execution.runner_device_bindings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id  UUID        NOT NULL,
  device_id  UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  bound_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','paused','revoked')),

  UNIQUE (runner_id, device_id)
);

CREATE INDEX idx_rdb_runner_id ON execution.runner_device_bindings (runner_id);
CREATE INDEX idx_rdb_device_id ON execution.runner_device_bindings (device_id);

COMMENT ON TABLE execution.runner_device_bindings IS
  'Links a registered runner to a physical trusted device. '
  'A runner may be bound to at most one active device at a time. '
  'Written only via fn_runner_bind_device.';

ALTER TABLE execution.runner_device_bindings ENABLE ROW LEVEL SECURITY;
-- CLI reads bindings through the RPC below; no direct client access

-- ---------------------------------------------------------------------------
-- fn_runner_bind_device — bind a runner to a device (owner must own both)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_runner_bind_device(
  p_runner_id UUID,
  p_device_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_binding_id UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required';
  END IF;

  -- Verify the device belongs to the caller
  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices
    WHERE id = p_device_id
      AND lenser_id = v_lenser_id
      AND trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'device_not_found_or_not_trusted';
  END IF;

  INSERT INTO execution.runner_device_bindings (runner_id, device_id, status)
  VALUES (p_runner_id, p_device_id, 'active')
  ON CONFLICT (runner_id, device_id) DO UPDATE
    SET status = 'active', bound_at = now()
  RETURNING id INTO v_binding_id;

  RETURN v_binding_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_runner_list_with_devices — returns runners with their bound device info
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_runner_list_with_devices(
  p_limit  INT  DEFAULT 50,
  p_cursor UUID DEFAULT NULL
)
RETURNS TABLE (
  runner_id    UUID,
  device_id    UUID,
  device_name  TEXT,
  trust_level  TEXT,
  binding_status TEXT,
  bound_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, lensers, public, extensions
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
    b.runner_id,
    b.device_id,
    d.name  AS device_name,
    d.trust_level,
    b.status AS binding_status,
    b.bound_at
  FROM execution.runner_device_bindings b
  JOIN devices.registered_devices d ON d.id = b.device_id
  WHERE d.lenser_id = v_lenser_id
    AND (p_cursor IS NULL OR b.id > p_cursor)
  ORDER BY b.bound_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_runner_bind_device        TO authenticated;
GRANT EXECUTE ON FUNCTION execution.fn_runner_list_with_devices  TO authenticated;
