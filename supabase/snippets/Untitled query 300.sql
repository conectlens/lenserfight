-- Description: Fix foreign key violation in page view logging due to stale/invalid user sessions (GRASP: Information Expert)
-- The function now gracefully falls back to anonymous logging if the authenticated user_id is not found in auth.users.
-- Created at: 2026-03-07 17:16:00

CREATE OR REPLACE FUNCTION "public"."fn_log_page_view"(
    "p_target_type" "public"."page_view_target_enum",
    "p_target_id" "text",
    "p_path" "text",
    "p_referrer" "text",
    "p_user_agent" "text",
    "p_client_ip" "inet"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'analytics', 'lensers'
    AS $$
DECLARE
  v_user_id   uuid;
  v_lenser_id uuid;
BEGIN
  -- 1. Validation Logic
  IF p_target_type IS NULL THEN
    RAISE EXCEPTION 'target_type is required';
  END IF;

  IF p_path IS NULL THEN
    RAISE EXCEPTION 'path is required';
  END IF;

  -- 2. Identity Resolution
  v_user_id := auth.uid();

  -- Resilience: Verify user exists in auth.users to prevent FK violations from stale JWTs
  -- If user does not exist (e.g., deleted or stale session), fallback to anonymous logging
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
      v_user_id := NULL;
    END IF;
  END IF;

  -- Resolve lenser profile if user is valid
  IF v_user_id IS NOT NULL THEN
    SELECT id
    INTO v_lenser_id
    FROM lensers.profiles
    WHERE user_id = v_user_id;
  END IF;

  -- 3. Debouncing (Avoid duplicate logs within 5 seconds for same user/path)
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM analytics.page_views
      WHERE user_id = v_user_id
        AND path = p_path
        AND created_at > NOW() - INTERVAL '5 seconds'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- 4. Audit Log Execution
  INSERT INTO analytics.page_views (
    lenser_id,
    user_id,
    target_type,
    target_id,
    path,
    referrer,
    user_agent,
    client_ip
  )
  VALUES (
    v_lenser_id,
    v_user_id,
    p_target_type,
    p_target_id,
    p_path,
    p_referrer,
    p_user_agent,
    p_client_ip
  );
END;
$$;

-- Ensure permissions are correctly set
ALTER FUNCTION "public"."fn_log_page_view" OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."fn_log_page_view" TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_page_view" TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_page_view" TO "service_role";
