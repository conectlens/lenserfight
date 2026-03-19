-- Migration 009: Account Lifecycle
-- Deactivation, scheduled deletion with 30-day grace, cancellation-on-login, pg_cron purge

-- ─── 3.1 fn_deactivate_account ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_deactivate_account()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.profiles
  SET status = 'deactivated',
      updated_at = now()
  WHERE user_id = v_uid
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_active');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'deactivated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_deactivate_account() TO authenticated;

-- ─── 3.2 fn_schedule_account_deletion ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_schedule_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_uid uuid;
  v_deadline timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_deadline := now() + interval '30 days';

  UPDATE lensers.profiles
  SET status = 'pending_deletion',
      deletion_requested_at = now(),
      deletion_deadline_at = v_deadline,
      updated_at = now()
  WHERE user_id = v_uid
    AND status IN ('active', 'deactivated');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_eligible');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'pending_deletion', 'deadline', v_deadline);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_schedule_account_deletion() TO authenticated;

-- ─── 3.3 fn_cancel_account_deletion_on_login ────────────────────────────────
-- Called from frontend on SIGNED_IN event

CREATE OR REPLACE FUNCTION public.fn_cancel_account_deletion_on_login()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_uid uuid;
  v_profile RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, status, deletion_deadline_at INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'no_profile');
  END IF;

  -- Restore from pending_deletion (within grace period)
  IF v_profile.status = 'pending_deletion' AND (v_profile.deletion_deadline_at IS NULL OR v_profile.deletion_deadline_at > now()) THEN
    UPDATE lensers.profiles
    SET status = 'active',
        deletion_requested_at = null,
        deletion_deadline_at = null,
        updated_at = now()
    WHERE id = v_profile.id;

    RETURN jsonb_build_object('restored', true, 'from_status', 'pending_deletion');
  END IF;

  -- Restore from deactivated
  IF v_profile.status = 'deactivated' THEN
    UPDATE lensers.profiles
    SET status = 'active',
        updated_at = now()
    WHERE id = v_profile.id;

    RETURN jsonb_build_object('restored', true, 'from_status', 'deactivated');
  END IF;

  RETURN jsonb_build_object('restored', false, 'reason', 'no_action_needed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_account_deletion_on_login() TO authenticated;

-- ─── 3.4 fn_purge_due_accounts (pg_cron) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_purge_due_accounts()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, analytics
AS $$
DECLARE
  v_count int := 0;
  v_profile RECORD;
BEGIN
  -- Safety buffer: 1 hour past deadline
  FOR v_profile IN
    SELECT id, user_id
    FROM lensers.profiles
    WHERE status = 'pending_deletion'
      AND deletion_deadline_at <= now() - interval '1 hour'
  LOOP
    -- Anonymize PII
    UPDATE lensers.profiles
    SET display_name = 'Deleted User',
        handle = 'deleted_' || v_profile.id::text,
        bio = null,
        headline = null,
        avatar_url = null,
        banner_url = null,
        website_url = null,
        preferences = null,
        status = 'deleted',
        updated_at = now()
    WHERE id = v_profile.id;

    -- Remove all relationships
    DELETE FROM lensers.relationships
    WHERE source_profile_id = v_profile.id OR target_profile_id = v_profile.id;

    -- Remove from old follows table
    DELETE FROM lensers.follows
    WHERE follower_id = v_profile.id OR following_id = v_profile.id;

    -- Remove social links
    DELETE FROM lensers.social_links WHERE lenser_id = v_profile.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── 3.5 pg_cron schedule ────────────────────────────────────────────────────
-- Runs daily at 3 AM UTC
-- NOTE: pg_cron must be enabled in your Supabase project settings
-- Uncomment the following line when pg_cron is available:
-- SELECT cron.schedule('purge-due-accounts', '0 3 * * *', $$SELECT public.fn_purge_due_accounts()$$);
