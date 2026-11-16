-- Device login: tighten how a browser session is stored for a CLI login request.
--
--  1. Only login-type requests (created by fn_request_device_login, which sets
--     requested_token_ttl_hours = 0) may receive a stored session, so a code from
--     a regular developer-token approval cannot be used to deposit one.
--  2. A request accepts a stored session once; a later approval cannot overwrite it.
--  3. Stored tokens are cleared as soon as the request expires, instead of
--     remaining in plaintext until the row is removed.

CREATE OR REPLACE FUNCTION "authz"."fn_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'auth', 'public'
    AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_normalized     text := upper(replace(trim(COALESCE(p_user_code, '')), '-', ''));
  v_request        authz.device_approval_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_request
  FROM authz.device_approval_requests
  WHERE replace(user_code, '-', '') = v_normalized
    AND status IN ('pending', 'approved')
    AND expires_at > now()
    AND requested_token_ttl_hours = 0
    AND login_access_token IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device login request not found or expired';
  END IF;

  UPDATE authz.device_approval_requests
  SET status               = 'approved',
      approved_at          = COALESCE(approved_at, now()),
      approved_by_user_id  = COALESCE(approved_by_user_id, v_user_id),
      login_access_token   = p_access_token,
      login_refresh_token  = p_refresh_token
  WHERE id = v_request.id;

  RETURN jsonb_build_object('status', 'stored');
END;
$$;

ALTER FUNCTION "authz"."fn_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "authz"."fn_purge_expired_device_login_tokens"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz'
    AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE authz.device_approval_requests
  SET login_access_token  = NULL,
      login_refresh_token = NULL
  WHERE (login_access_token IS NOT NULL OR login_refresh_token IS NOT NULL)
    AND expires_at < now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

ALTER FUNCTION "authz"."fn_purge_expired_device_login_tokens"() OWNER TO "postgres";
REVOKE ALL ON FUNCTION "authz"."fn_purge_expired_device_login_tokens"() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "authz"."fn_purge_expired_device_login_tokens"() TO service_role;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron not installed — skipping device-login-purge-expired-tokens schedule';
    RETURN;
  END IF;

  PERFORM cron.unschedule('device-login-purge-expired-tokens')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'device-login-purge-expired-tokens');

  PERFORM cron.schedule(
    'device-login-purge-expired-tokens',
    '*/5 * * * *',
    'SELECT authz.fn_purge_expired_device_login_tokens()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'could not schedule device-login-purge-expired-tokens: %', SQLERRM;
END
$$;
