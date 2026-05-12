-- Phase BB — Gateway device management RPCs.
--
-- Lets a device owner approve, revoke, and list their agents.gateway_devices
-- rows from the CLI or web. Phase AU created the table + heartbeat but left
-- explicit approve/revoke out of scope.
--
-- All RPCs are SECURITY DEFINER, scoped to auth.uid(), and raise 42501 on
-- ownership violation so callers can surface a clean "not your device"
-- error.

-- ── 1. fn_gateway_approve_device ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_approve_device(
  p_device_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  UPDATE agents.gateway_devices
     SET approved_at = now(),
         revoked_at  = NULL,
         kill_switch = false
   WHERE device_id = p_device_id
     AND owner_id  = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_owned' USING ERRCODE = '42501';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION agents.fn_gateway_approve_device(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_gateway_approve_device(p_device_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT agents.fn_gateway_approve_device(p_device_id);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_approve_device(UUID)
  TO authenticated, service_role;

-- ── 2. fn_gateway_revoke_device ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_gateway_revoke_device(
  p_device_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  UPDATE agents.gateway_devices
     SET revoked_at  = now(),
         kill_switch = true
   WHERE device_id = p_device_id
     AND owner_id  = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_owned' USING ERRCODE = '42501';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION agents.fn_gateway_revoke_device(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_gateway_revoke_device(p_device_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT agents.fn_gateway_revoke_device(p_device_id);
$$;

GRANT EXECUTE ON FUNCTION public.fn_gateway_revoke_device(UUID)
  TO authenticated, service_role;

-- ── 3. fn_list_gateway_devices ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_list_gateway_devices(
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  device_id      UUID,
  hostname       TEXT,
  daemon_version TEXT,
  last_seen_at   TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  kill_switch    BOOLEAN,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = agents, public, extensions
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_capped INT  := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT d.device_id, d.hostname, d.daemon_version, d.last_seen_at,
           d.approved_at, d.revoked_at, d.kill_switch, d.created_at
      FROM agents.gateway_devices d
     WHERE d.owner_id = v_uid
     ORDER BY d.last_seen_at DESC NULLS LAST,
              d.created_at DESC
     LIMIT v_capped;
END $$;

GRANT EXECUTE ON FUNCTION agents.fn_list_gateway_devices(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_list_gateway_devices(p_limit INT DEFAULT 50)
RETURNS TABLE (
  device_id      UUID,
  hostname       TEXT,
  daemon_version TEXT,
  last_seen_at   TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  kill_switch    BOOLEAN,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
  SELECT * FROM agents.fn_list_gateway_devices(p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.fn_list_gateway_devices(INT)
  TO authenticated, service_role;
