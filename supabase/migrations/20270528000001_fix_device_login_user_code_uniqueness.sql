-- Fix device login "not found or expired" caused by:
-- 1. Global UNIQUE on user_code blocks new requests when an old expired/exchanged row
--    holds the same code, and fn_request_device_login has no ON CONFLICT retry.
-- 2. Replace the global unique constraint with a partial unique index that only
--    enforces uniqueness among active (non-terminal) requests.
-- 3. Add ON CONFLICT retry loop in fn_request_device_login so code collisions are
--    handled automatically instead of surfacing as a 500.

-- Step 1: Drop the global unique constraint
ALTER TABLE authz.device_approval_requests
  DROP CONSTRAINT IF EXISTS device_approval_requests_user_code_key;

-- Step 2: Partial unique index — only one active request per code at a time.
-- Expired and exchanged rows are terminal and no longer need to block new codes.
CREATE UNIQUE INDEX IF NOT EXISTS device_approval_requests_user_code_active_idx
  ON authz.device_approval_requests (user_code)
  WHERE status IN ('pending', 'approved');

DROP FUNCTION IF EXISTS "authz"."fn_request_device_login";
-- Step 3: Replace fn_request_device_login with a version that retries on collision.
CREATE OR REPLACE FUNCTION "authz"."fn_request_device_login"("p_request_ttl_minutes" integer DEFAULT 10)
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'authz', 'extensions', 'public'
AS $$
DECLARE
  v_request_id          uuid;
  v_request_secret      text;
  v_request_secret_hash text;
  v_user_code           text;
  v_ttl                 integer     := LEAST(GREATEST(COALESCE(p_request_ttl_minutes, 10), 1), 10);
  v_expires_at          timestamptz;
  v_attempts            integer     := 0;
BEGIN
  -- No auth.uid() check — this is the unauthenticated login initiation path.
  LOOP
    v_attempts       := v_attempts + 1;
    v_request_id     := gen_random_uuid();
    v_request_secret := encode(gen_random_bytes(32), 'hex');
    v_request_secret_hash := encode(digest(v_request_secret, 'sha256'), 'hex');
    v_user_code      := authz.fn_generate_user_code();
    v_expires_at     := now() + make_interval(mins => v_ttl);

    BEGIN
      INSERT INTO authz.device_approval_requests (
          id,
          user_code,
          request_secret_hash,
          label,
          requested_by_user_id,
          requested_by_lenser_id,
          requested_token_ttl_hours,
          expires_at
      ) VALUES (
          v_request_id,
          v_user_code,
          v_request_secret_hash,
          'CLI Login',
          NULL,
          NULL,
          0,
          v_expires_at
      );
      -- INSERT succeeded — exit the retry loop
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Partial index collision: an active request already holds this code.
      -- Retry with a fresh code, up to 10 attempts.
      IF v_attempts >= 10 THEN
        RAISE EXCEPTION 'Could not generate a unique device login code after % attempts', v_attempts;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'requestId',           v_request_id,
    'requestSecret',       v_request_secret,
    'userCode',            v_user_code,
    'verificationUri',     '/device-approval?code=' || v_user_code || '&mode=login',
    'pollIntervalSeconds', 5,
    'expiresAt',           v_expires_at,
    'status',              'pending'
  );
END;
$$;

ALTER FUNCTION "authz"."fn_request_device_login"("p_request_ttl_minutes" integer) OWNER TO "postgres";
