-- Phase P automation — webhook signing secret helpers
--
-- 1. Two service-role RPCs the CLI invokes for `lf config webhook-secret`:
--    - fn_set_webhook_signing_secret(p_secret text)
--    - fn_check_webhook_signing_secret() returns (is_set, length_bytes, strict_mode)
--    - fn_set_webhook_strict_signing(p_strict boolean)
--
-- 2. Strict-signing semantic upgrade to audit.fn_dispatch_webhook_outbox:
--    when app.webhook_strict_signing = 'true' AND app.webhook_signing_secret is
--    unset, the dispatcher refuses to deliver and logs a clear error per row.
--    Default behavior (strict OFF) preserves the documented "unsigned"
--    fallback for backward compatibility.

-- ─── 1. Helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_webhook_signing_secret(p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 16 THEN
    RAISE EXCEPTION 'webhook signing secret must be at least 16 chars'
      USING ERRCODE = '22023';
  END IF;
  -- Persist database-wide so subsequent sessions see it.
  EXECUTE format('ALTER DATABASE %I SET app.webhook_signing_secret = %L',
                 current_database(), p_secret);
END;
$$;

ALTER FUNCTION public.fn_set_webhook_signing_secret(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_set_webhook_signing_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_set_webhook_signing_secret(text) TO service_role;

COMMENT ON FUNCTION public.fn_set_webhook_signing_secret(text) IS
  'Phase P. Persists app.webhook_signing_secret as a database-wide GUC. service_role only.';

CREATE OR REPLACE FUNCTION public.fn_check_webhook_signing_secret()
RETURNS TABLE (is_set boolean, length_bytes int, strict_mode boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text := current_setting('app.webhook_signing_secret', true);
  v_strict text := current_setting('app.webhook_strict_signing', true);
BEGIN
  is_set := v_secret IS NOT NULL AND length(v_secret) > 0;
  length_bytes := COALESCE(length(v_secret), 0);
  strict_mode := COALESCE(lower(v_strict) = 'true', false);
  RETURN NEXT;
END;
$$;

ALTER FUNCTION public.fn_check_webhook_signing_secret() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_check_webhook_signing_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_webhook_signing_secret() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_set_webhook_strict_signing(p_strict boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET app.webhook_strict_signing = %L',
                 current_database(),
                 CASE WHEN p_strict THEN 'true' ELSE 'false' END);
END;
$$;

ALTER FUNCTION public.fn_set_webhook_strict_signing(boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_set_webhook_strict_signing(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_set_webhook_strict_signing(boolean) TO service_role;

-- ─── 2. Strict-signing-aware dispatcher patch ────────────────────────────────
-- Wraps audit.fn_dispatch_webhook_outbox: when strict mode is ON AND secret
-- is unset, mark all eligible rows with last_error='strict_signing_no_secret'
-- and bump next_attempt_at by 5 minutes. Don't dispatch.

CREATE OR REPLACE FUNCTION audit.fn_assert_webhook_signing_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_secret text := current_setting('app.webhook_signing_secret', true);
  v_strict boolean := COALESCE(lower(current_setting('app.webhook_strict_signing', true)) = 'true', false);
  v_blocked int := 0;
BEGIN
  IF v_strict AND (v_secret IS NULL OR length(v_secret) = 0) THEN
    UPDATE audit.webhook_outbox
    SET last_error = 'strict_signing_no_secret',
        next_attempt_at = now() + interval '5 minutes'
    WHERE delivered_at IS NULL
      AND dead_lettered_at IS NULL
      AND next_attempt_at <= now();
    GET DIAGNOSTICS v_blocked = ROW_COUNT;
    RAISE WARNING 'Webhook strict signing is ON but secret is unset. % outbox rows deferred.', v_blocked;
  END IF;

  RETURN jsonb_build_object(
    'strict_mode', v_strict,
    'secret_set', v_secret IS NOT NULL AND length(v_secret) > 0,
    'blocked_rows', v_blocked
  );
END;
$$;

ALTER FUNCTION audit.fn_assert_webhook_signing_state() OWNER TO postgres;
REVOKE ALL ON FUNCTION audit.fn_assert_webhook_signing_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_assert_webhook_signing_state() TO service_role;

COMMENT ON FUNCTION audit.fn_assert_webhook_signing_state() IS
  'Phase P. Called at the top of fn_dispatch_webhook_outbox. When strict signing '
  'is ON and the secret is unset, defers all eligible rows by 5 minutes and '
  'tags them with last_error=strict_signing_no_secret. Returns a jsonb summary.';

-- ─── 3. Re-register the dispatcher to call the assertion first ───────────────
-- We don't redefine the full dispatcher here (it lives in 20270320000000); we
-- add a wrapper that the cron job calls instead.

CREATE OR REPLACE FUNCTION audit.fn_cron_dispatch_webhook_outbox()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_state jsonb;
  v_dispatched int;
BEGIN
  v_state := audit.fn_assert_webhook_signing_state();
  IF (v_state->>'strict_mode')::boolean AND NOT (v_state->>'secret_set')::boolean THEN
    RETURN 0;
  END IF;
  SELECT audit.fn_dispatch_webhook_outbox(50) INTO v_dispatched;
  RETURN v_dispatched;
END;
$$;

ALTER FUNCTION audit.fn_cron_dispatch_webhook_outbox() OWNER TO postgres;
REVOKE ALL ON FUNCTION audit.fn_cron_dispatch_webhook_outbox() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_cron_dispatch_webhook_outbox() TO service_role;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  PERFORM cron.unschedule('webhook-outbox-dispatcher')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'webhook-outbox-dispatcher');

  PERFORM cron.schedule(
    'webhook-outbox-dispatcher',
    '* * * * *',
    $$SELECT audit.fn_cron_dispatch_webhook_outbox()$$
  );
END;
$do$;
