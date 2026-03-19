-- Account lifecycle audit trail + restore-safe auth flow support.
-- Records delete/freeze/restore/final-delete transitions in a dedicated table.

CREATE TABLE IF NOT EXISTS lensers.account_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (
    event_type IN (
      'deletion_scheduled',
      'account_deactivated',
      'restored_from_pending_deletion',
      'restored_from_deactivated',
      'deletion_completed'
    )
  ),
  from_status lensers.lenser_status,
  to_status lensers.lenser_status,
  actor_source text NOT NULL CHECK (
    actor_source IN ('user_action', 'signin_restore', 'system_job')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lensers.account_lifecycle_audit OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_account_lifecycle_audit_profile_created_at
  ON lensers.account_lifecycle_audit (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_lifecycle_audit_user_created_at
  ON lensers.account_lifecycle_audit (user_id, created_at DESC);

REVOKE ALL ON TABLE lensers.account_lifecycle_audit FROM PUBLIC;
REVOKE ALL ON TABLE lensers.account_lifecycle_audit FROM anon;
REVOKE ALL ON TABLE lensers.account_lifecycle_audit FROM authenticated;
REVOKE ALL ON TABLE lensers.account_lifecycle_audit FROM service_role;
GRANT SELECT ON TABLE lensers.account_lifecycle_audit TO service_role;

CREATE OR REPLACE FUNCTION lensers.log_account_lifecycle_event(
  p_profile_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_from_status lensers.lenser_status,
  p_to_status lensers.lenser_status,
  p_actor_source text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
BEGIN
  INSERT INTO lensers.account_lifecycle_audit (
    profile_id,
    user_id,
    event_type,
    from_status,
    to_status,
    actor_source,
    metadata
  )
  VALUES (
    p_profile_id,
    p_user_id,
    p_event_type,
    p_from_status,
    p_to_status,
    p_actor_source,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

ALTER FUNCTION lensers.log_account_lifecycle_event(
  uuid,
  uuid,
  text,
  lensers.lenser_status,
  lensers.lenser_status,
  text,
  jsonb
) OWNER TO postgres;

REVOKE ALL ON FUNCTION lensers.log_account_lifecycle_event(
  uuid,
  uuid,
  text,
  lensers.lenser_status,
  lensers.lenser_status,
  text,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION lensers.log_account_lifecycle_event(
  uuid,
  uuid,
  text,
  lensers.lenser_status,
  lensers.lenser_status,
  text,
  jsonb
) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_deactivate_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_uid uuid;
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

  IF NOT FOUND OR v_profile.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_active');
  END IF;

  UPDATE lensers.profiles
  SET status = 'deactivated',
      updated_at = now()
  WHERE id = v_profile.id;

  PERFORM lensers.log_account_lifecycle_event(
    v_profile.id,
    v_profile.user_id,
    'account_deactivated',
    v_profile.status,
    'deactivated'::lensers.lenser_status,
    'user_action',
    jsonb_build_object('reason', 'user_requested_deactivation')
  );

  RETURN jsonb_build_object('success', true, 'status', 'deactivated');
END;
$$;

ALTER FUNCTION public.fn_deactivate_account() OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_deactivate_account() TO anon;
GRANT ALL ON FUNCTION public.fn_deactivate_account() TO authenticated;
GRANT ALL ON FUNCTION public.fn_deactivate_account() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_cancel_account_deletion_on_login()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_uid uuid;
  v_profile RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, user_id, status, deletion_deadline_at
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

  IF v_profile.status = 'deactivated' THEN
    UPDATE lensers.profiles
    SET status = 'active',
        updated_at = now()
    WHERE id = v_profile.id;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      'restored_from_deactivated',
      v_profile.status,
      'active'::lensers.lenser_status,
      'signin_restore',
      jsonb_build_object('restored_before_deadline', true)
    );

    RETURN jsonb_build_object('restored', true, 'from_status', 'deactivated');
  END IF;

  RETURN jsonb_build_object('restored', false, 'reason', 'no_action_needed');
END;
$$;

ALTER FUNCTION public.fn_cancel_account_deletion_on_login() OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO anon;
GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO authenticated;
GRANT ALL ON FUNCTION public.fn_cancel_account_deletion_on_login() TO service_role;

CREATE OR REPLACE FUNCTION public.fn_purge_due_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'analytics'
AS $$
DECLARE
  v_count int := 0;
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT id, user_id, deletion_deadline_at
    FROM lensers.profiles
    WHERE status = 'pending_deletion'
      AND deletion_deadline_at <= now() - interval '1 hour'
  LOOP
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

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      'deletion_completed',
      'pending_deletion'::lensers.lenser_status,
      'deleted'::lensers.lenser_status,
      'system_job',
      jsonb_build_object(
        'deletion_deadline_at', v_profile.deletion_deadline_at,
        'purged_after_grace_period', true
      )
    );

    DELETE FROM lensers.relationships
    WHERE source_profile_id = v_profile.id OR target_profile_id = v_profile.id;

    DELETE FROM lensers.follows
    WHERE follower_id = v_profile.id OR following_id = v_profile.id;

    DELETE FROM lensers.social_links WHERE lenser_id = v_profile.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

ALTER FUNCTION public.fn_purge_due_accounts() OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_purge_due_accounts() TO anon;
GRANT ALL ON FUNCTION public.fn_purge_due_accounts() TO authenticated;
GRANT ALL ON FUNCTION public.fn_purge_due_accounts() TO service_role;

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

  UPDATE lensers.profiles
  SET status = 'pending_deletion',
      deletion_requested_at = now(),
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
