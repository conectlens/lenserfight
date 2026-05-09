-- Phase B (Trust Gateway): two-step approve enforcement.
--
-- Replaces the existing devices.fn_device_approve so that:
--   * Devices with a recorded public_key require an "answered" challenge
--     before transitioning pending → approved.
--   * Legacy devices (no public_key) keep working with the original
--     single-step approve, for one release window.
--
-- On approval the matching challenge row is also moved to status='approved'.

CREATE OR REPLACE FUNCTION devices.fn_device_approve(p_device_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_device    devices.registered_devices%ROWTYPE;
  v_challenge devices.device_challenges%ROWTYPE;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_device
  FROM devices.registered_devices
  WHERE id = p_device_id
    AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_device.trust_level <> 'pending' THEN
    RAISE EXCEPTION 'device_not_pending' USING ERRCODE = 'P0001';
  END IF;

  -- Two-step path: device has a public_key, require an answered challenge.
  IF v_device.public_key IS NOT NULL THEN
    SELECT * INTO v_challenge
    FROM devices.device_challenges
    WHERE device_id = p_device_id
      AND lenser_id = v_lenser_id
      AND status    = 'answered'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_challenge.id IS NULL THEN
      RAISE EXCEPTION 'awaiting_device_challenge' USING ERRCODE = 'P0001';
    END IF;

    UPDATE devices.device_challenges
       SET status = 'approved'
     WHERE id = v_challenge.id;
  END IF;

  UPDATE devices.registered_devices
     SET trust_level = 'approved'
   WHERE id = p_device_id;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_device_approve(UUID) TO authenticated;

COMMENT ON FUNCTION devices.fn_device_approve(UUID) IS
  'Two-step approve: devices with a recorded public_key require an answered '
  'challenge from devices.device_challenges. Legacy devices (no public_key) '
  'continue to work with single-step approve for one release window.';

-- Public wrapper, since the CLI calls fn_device_approve in the public namespace
-- (the existing implementation lives in devices schema; expose a thin wrapper).

CREATE OR REPLACE FUNCTION public.fn_device_approve(p_device_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT devices.fn_device_approve(p_device_id);
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_approve(UUID) TO authenticated;
