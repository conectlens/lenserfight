-- =============================================================================
-- pgTAP/security contract repairs
-- =============================================================================
-- 1. Remove the obsolete 6-arg fn_insert_notification overload. The 7-arg
--    version keeps p_actor_id DEFAULT NULL, so legacy 6-arg callers continue to
--    work without ambiguous function resolution.
-- 2. Default privileges in public granted EXECUTE directly to anon/authenticated
--    on older function creations. Revoke explicit BYOK grants from client roles.
-- 3. Gateway device/command owner SELECT policies require table-level SELECT
--    for authenticated before RLS can filter rows.
-- =============================================================================

DROP FUNCTION IF EXISTS public.fn_insert_notification(uuid, text, text, text, text, jsonb);

REVOKE ALL ON FUNCTION public.fn_byok_key_resolve(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_resolve(uuid, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.fn_expire_byok_keys()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_expire_byok_keys()
  TO service_role;

GRANT SELECT ON agents.gateway_devices TO authenticated;
GRANT SELECT ON agents.gateway_commands TO authenticated;

REVOKE ALL ON FUNCTION public.fn_append_workflow_run_media(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_append_workflow_run_media(uuid, uuid, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.fn_transfer_media_ownership(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transfer_media_ownership(uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.fn_media_proxy_log(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_media_proxy_log(uuid)
  TO service_role;
