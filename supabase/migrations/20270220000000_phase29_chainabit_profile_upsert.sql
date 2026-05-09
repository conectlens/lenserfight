-- Phase L29-B: Profile upsert for Chainabit OAuth sign-in
-- Called from OAuthCallbackPage after a user authenticates via Chainabit.
-- Creates a profile stub on first sign-in; updates avatar/display_name on subsequent sign-ins.

CREATE OR REPLACE FUNCTION public.fn_upsert_profile_from_chainabit(
  p_user_id      UUID,
  p_email        TEXT,
  p_handle       TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url   TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_handle       TEXT;
  v_profile_id   UUID;
  v_attempt      INT := 0;
BEGIN
  -- Derive a handle from email prefix when Chainabit did not provide one
  v_handle := COALESCE(
    NULLIF(regexp_replace(lower(p_handle), '[^a-z0-9._]', '', 'g'), ''),
    NULLIF(regexp_replace(split_part(lower(p_email), '@', 1), '[^a-z0-9._]', '', 'g'), ''),
    'user'
  );
  -- Enforce min length
  IF length(v_handle) < 4 THEN v_handle := v_handle || '0000'; END IF;
  -- Truncate to 24 chars
  v_handle := left(v_handle, 24);

  -- Upsert existing user (by user_id) — update display_name and avatar on repeat sign-ins
  UPDATE lensers.profiles SET
    display_name  = COALESCE(NULLIF(p_display_name, ''), display_name),
    avatar_url    = COALESCE(NULLIF(p_avatar_url,   ''), avatar_url),
    last_login_at = now(),
    login_count   = login_count + 1
  WHERE user_id = p_user_id
  RETURNING id INTO v_profile_id;

  IF FOUND THEN
    RETURN v_profile_id;
  END IF;

  -- New user: try inserting with derived handle; append suffix on collision
  LOOP
    BEGIN
      INSERT INTO lensers.profiles (
        user_id, handle, display_name, avatar_url,
        type, onboarding_step, last_login_at, login_count
      ) VALUES (
        p_user_id,
        CASE WHEN v_attempt = 0 THEN v_handle
             ELSE left(v_handle, 20) || lpad(v_attempt::TEXT, 4, '0')
        END,
        COALESCE(NULLIF(p_display_name, ''), v_handle),
        NULLIF(p_avatar_url, ''),
        'human',
        1,      -- skip onboarding step 0; user came from Chainabit so account is pre-verified
        now(),
        1
      )
      RETURNING id INTO v_profile_id;
      RETURN v_profile_id;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 9999 THEN
        RAISE EXCEPTION 'fn_upsert_profile_from_chainabit: exhausted handle variants for %', v_handle;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_upsert_profile_from_chainabit(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_upsert_profile_from_chainabit(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
