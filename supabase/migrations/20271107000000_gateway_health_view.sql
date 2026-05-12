-- Phase BE — Gateway health view.
--
-- Joins agents.gateway_devices with the per-device count of pending (unclaimed
-- or unacked) commands. Owners read the snapshot via fn_get_gateway_device_health;
-- the view itself is internal (RLS on the base tables is what keeps owner
-- scoping correct).

CREATE OR REPLACE VIEW agents.v_gateway_device_health AS
SELECT
  d.device_id,
  d.owner_id,
  d.hostname,
  d.daemon_version,
  d.last_seen_at,
  d.approved_at,
  d.revoked_at,
  d.kill_switch,
  d.created_at,
  COALESCE(c.pending_commands, 0) AS pending_commands,
  COALESCE(c.unacked_commands, 0) AS unacked_commands
FROM agents.gateway_devices d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE gc.claimed_at IS NULL)        AS pending_commands,
    COUNT(*) FILTER (WHERE gc.acked_at   IS NULL)        AS unacked_commands
  FROM agents.gateway_commands gc
  WHERE gc.device_id = d.device_id
) c ON true;

COMMENT ON VIEW agents.v_gateway_device_health IS
  'Phase BE: per-device daemon health snapshot (heartbeat + outbox depth).';

CREATE OR REPLACE FUNCTION public.fn_get_gateway_device_health()
RETURNS TABLE (
  device_id        UUID,
  hostname         TEXT,
  daemon_version   TEXT,
  last_seen_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  kill_switch      BOOLEAN,
  created_at       TIMESTAMPTZ,
  pending_commands BIGINT,
  unacked_commands BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, agents, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT v.device_id, v.hostname, v.daemon_version, v.last_seen_at,
           v.approved_at, v.revoked_at, v.kill_switch, v.created_at,
           v.pending_commands, v.unacked_commands
      FROM agents.v_gateway_device_health v
     WHERE v.owner_id = v_uid
     ORDER BY v.last_seen_at DESC NULLS LAST,
              v.created_at DESC;
END $$;

ALTER FUNCTION public.fn_get_gateway_device_health() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_gateway_device_health()
  TO authenticated, service_role;
