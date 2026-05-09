-- Phase AC — Platform system flags read/write RPCs
--
-- Adds:
--   platform.fn_get_platform_system_flags() → jsonb   (service_role only)
--   platform.fn_set_platform_flag(key text, enabled boolean) → void  (service_role only)
--
-- Rollback:
--   DROP FUNCTION IF EXISTS platform.fn_get_platform_system_flags();
--   DROP FUNCTION IF EXISTS platform.fn_set_platform_flag(text, boolean);

-- ── 1. Read all known platform flags ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_get_platform_system_flags()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform, public
AS $$
  SELECT jsonb_object_agg(key, (value::boolean))
  FROM   platform.system_flags
  WHERE  key IN (
    'autonomy_dispatch_enabled',
    'public_battles_enabled',
    'webhook_outbox_enabled'
  )
$$;

ALTER FUNCTION platform.fn_get_platform_system_flags() OWNER TO postgres;
REVOKE ALL  ON FUNCTION platform.fn_get_platform_system_flags() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_get_platform_system_flags() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION platform.fn_get_platform_system_flags() TO service_role;

COMMENT ON FUNCTION platform.fn_get_platform_system_flags() IS
  'Return a jsonb map of the three core platform.system_flags as booleans. service_role only.';

-- ── 2. Generic flag toggle ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_set_platform_flag(p_key text, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, public
AS $$
BEGIN
  IF p_key NOT IN ('autonomy_dispatch_enabled', 'public_battles_enabled', 'webhook_outbox_enabled') THEN
    RAISE EXCEPTION 'Unknown platform flag: %', p_key USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO platform.system_flags (key, value, updated_at)
  VALUES (p_key, p_enabled::text, now())
  ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = now();
END;
$$;

ALTER FUNCTION platform.fn_set_platform_flag(text, boolean) OWNER TO postgres;
REVOKE ALL  ON FUNCTION platform.fn_set_platform_flag(text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_set_platform_flag(text, boolean) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION platform.fn_set_platform_flag(text, boolean) TO service_role;

COMMENT ON FUNCTION platform.fn_set_platform_flag(text, boolean) IS
  'Toggle one of the three core platform.system_flags. service_role only. '
  'Allowed keys: autonomy_dispatch_enabled, public_battles_enabled, webhook_outbox_enabled.';
