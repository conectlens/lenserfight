-- Phase L33: Chainabit onboarding completion RPC
-- Called when a Chainabit-authed user confirms their handle/display name.
-- Sets onboarding_step = 2 (complete) for the calling user's profile.

CREATE OR REPLACE FUNCTION public.fn_complete_onboarding(
  p_handle       TEXT,
  p_display_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_existing_profile_id UUID;
BEGIN
  -- Confirm the caller owns a profile
  SELECT id INTO v_existing_profile_id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_existing_profile_id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  -- Guard handle uniqueness (raise on conflict so UI can show a clear error)
  IF EXISTS (
    SELECT 1 FROM lensers.profiles
    WHERE handle = lower(p_handle)
      AND id <> v_existing_profile_id
  ) THEN
    RAISE EXCEPTION 'HANDLE_TAKEN';
  END IF;

  UPDATE lensers.profiles
  SET
    handle              = lower(p_handle),
    display_name        = p_display_name,
    onboarding_step     = 2,
    onboarding_completed_at = now(),
    updated_at          = now()
  WHERE id = v_existing_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_complete_onboarding(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_complete_onboarding(TEXT, TEXT) TO authenticated;
