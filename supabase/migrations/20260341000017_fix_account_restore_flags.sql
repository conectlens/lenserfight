-- Fix account lifecycle edge cases where deletion scheduling/restoration could
-- leave profiles in deactivated or active-with-deletion-flags limbo.

CREATE OR REPLACE FUNCTION public.fn_cancel_account_deletion_on_login()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_uid uuid;
  v_profile RECORD;
  v_event_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, user_id, status, deletion_deadline_at, deletion_requested_at
  INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'no_profile');
  END IF;

  IF v_profile.status = 'pending_deletion'
     AND (v_profile.deletion_deadline_at IS NULL OR v_profile.deletion_deadline_at > now()) THEN
    UPDATE lensers.profiles
    SET status = 'active',
        deletion_requested_at = null,
        deletion_deadline_at = null,
        updated_at = now()
    WHERE id = v_profile.id;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      'restored_from_pending_deletion',
      v_profile.status,
      'active'::lensers.lenser_status,
      'signin_restore',
      jsonb_build_object(
        'restored_before_deadline', true,
        'deletion_deadline_at', v_profile.deletion_deadline_at
      )
    );

    RETURN jsonb_build_object('restored', true, 'from_status', 'pending_deletion');
  END IF;

  IF (
    v_profile.status = 'deactivated' OR
    (v_profile.status = 'active' AND v_profile.deletion_requested_at IS NOT NULL)
  ) AND (
    v_profile.deletion_deadline_at IS NULL OR v_profile.deletion_deadline_at > now()
  ) THEN
    UPDATE lensers.profiles
    SET status = 'active',
        deletion_requested_at = null,
        deletion_deadline_at = null,
        updated_at = now()
    WHERE id = v_profile.id;

    v_event_type := CASE
      WHEN v_profile.status = 'active' THEN 'restored_from_pending_deletion'
      ELSE 'restored_from_deactivated'
    END;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      v_event_type,
      v_profile.status,
      'active'::lensers.lenser_status,
      'signin_restore',
      jsonb_build_object(
        'restored_before_deadline', true,
        'deletion_deadline_at', v_profile.deletion_deadline_at,
        'cleared_stale_deletion_flags', v_profile.status = 'active'
      )
    );

    RETURN jsonb_build_object('restored', true, 'from_status', v_profile.status);
  END IF;

  RETURN jsonb_build_object('restored', false, 'reason', 'no_action_needed');
END;
$$;

ALTER FUNCTION public.fn_cancel_account_deletion_on_login() OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO anon;
GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO authenticated;
GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_schedule_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_uid uuid;
  v_deadline timestamptz;
  v_profile RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, user_id, status
  INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND OR v_profile.status NOT IN ('active', 'deactivated') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_eligible');
  END IF;

  v_deadline := now() + interval '30 days';

  -- Step 1: set the deletion timestamps. Existing trigger may temporarily move
  -- active profiles to `deactivated`, so we normalize status in step 2.
  UPDATE lensers.profiles
  SET deletion_requested_at = COALESCE(deletion_requested_at, now()),
      deletion_deadline_at = v_deadline,
      updated_at = now()
  WHERE id = v_profile.id;

  -- Step 2: persist the intended grace-period state used by purge + auth flow.
  UPDATE lensers.profiles
  SET status = 'pending_deletion',
      deletion_deadline_at = v_deadline,
      updated_at = now()
  WHERE id = v_profile.id;

  PERFORM lensers.log_account_lifecycle_event(
    v_profile.id,
    v_profile.user_id,
    'deletion_scheduled',
    v_profile.status,
    'pending_deletion'::lensers.lenser_status,
    'user_action',
    jsonb_build_object('deletion_deadline_at', v_deadline)
  );

  RETURN jsonb_build_object('success', true, 'status', 'pending_deletion', 'deadline', v_deadline);
END;
$$;

ALTER FUNCTION public.fn_schedule_account_deletion() OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_schedule_account_deletion() TO anon;
GRANT ALL ON FUNCTION public.fn_schedule_account_deletion() TO authenticated;
GRANT ALL ON FUNCTION public.fn_schedule_account_deletion() TO service_role;
