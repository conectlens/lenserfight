-- Fix #184: expose missing public wrappers for devices schema RPCs.
--
-- PostgREST only exposes functions in the public schema.
-- fn_device_approve, fn_device_heartbeat, fn_device_post_challenge, and
-- fn_device_register_with_key already have public wrappers. The following
-- three do not, causing PGRST202 404s when the web or CLI calls them.
--
-- All wrappers are thin SECURITY DEFINER SQL functions with a pinned
-- search_path. Actual security enforcement (auth.uid() scoping) lives
-- inside the devices-schema implementation functions.

-- ---------------------------------------------------------------------------
-- 1. fn_device_list
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_device_list(
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT * FROM devices.fn_device_list(p_trust_level, p_limit, p_cursor);
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_list(TEXT, INT, UUID)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. fn_device_register
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_device_register(
  p_name         TEXT,
  p_device_type  TEXT  DEFAULT 'other',
  p_os           TEXT  DEFAULT NULL,
  p_arch         TEXT  DEFAULT NULL,
  p_cli_version  TEXT  DEFAULT NULL,
  p_capabilities JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT devices.fn_device_register(
    p_name, p_device_type, p_os, p_arch, p_cli_version, p_capabilities
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_register(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. fn_device_revoke
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_device_revoke(p_device_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT devices.fn_device_revoke(p_device_id);
$$;

GRANT EXECUTE ON FUNCTION public.fn_device_revoke(UUID)
  TO authenticated;
