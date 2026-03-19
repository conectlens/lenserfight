-- Migration 008: Social Graph Functions
-- Core helpers, access resolution, follow RPCs, counter trigger

-- ─── 2.1 fn_relationship_state ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lensers.fn_relationship_state(
  p_viewer_id uuid,
  p_subject_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = lensers, public
AS $$
DECLARE
  v_viewer_to_subject lensers.relationship_status;
  v_subject_to_viewer lensers.relationship_status;
  v_is_mutual boolean := false;
  v_is_blocked boolean := false;
  v_is_close_circle boolean := false;
BEGIN
  IF p_viewer_id IS NULL OR p_subject_id IS NULL OR p_viewer_id = p_subject_id THEN
    RETURN jsonb_build_object(
      'viewer_to_subject', null,
      'subject_to_viewer', null,
      'is_mutual', false,
      'is_blocked', false,
      'is_close_circle', false
    );
  END IF;

  SELECT r.status, r.is_close_circle INTO v_viewer_to_subject, v_is_close_circle
  FROM lensers.relationships r
  WHERE r.source_profile_id = p_viewer_id AND r.target_profile_id = p_subject_id
    AND r.status IN ('pending', 'accepted', 'blocked');

  SELECT r.status INTO v_subject_to_viewer
  FROM lensers.relationships r
  WHERE r.source_profile_id = p_subject_id AND r.target_profile_id = p_viewer_id
    AND r.status IN ('pending', 'accepted', 'blocked');

  v_is_blocked := (v_viewer_to_subject = 'blocked') OR (v_subject_to_viewer = 'blocked');
  v_is_mutual := (v_viewer_to_subject = 'accepted') AND (v_subject_to_viewer = 'accepted');

  RETURN jsonb_build_object(
    'viewer_to_subject', v_viewer_to_subject,
    'subject_to_viewer', v_subject_to_viewer,
    'is_mutual', v_is_mutual,
    'is_blocked', v_is_blocked,
    'is_close_circle', v_is_close_circle
  );
END;
$$;

-- ─── 2.2 fn_can_view_profile ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lensers.fn_can_view_profile(
  p_viewer_auth_uid uuid,
  p_subject_profile_id uuid
)
RETURNS lensers.profile_access_level
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = lensers, public, auth
AS $$
DECLARE
  v_subject RECORD;
  v_viewer_profile_id uuid;
  v_is_owner boolean := false;
  v_rel_state jsonb;
  v_is_blocked boolean;
  v_viewer_to_subject text;
BEGIN
  -- Fetch subject profile
  SELECT p.id, p.user_id, p.status, p.visibility, p.deletion_requested_at
  INTO v_subject
  FROM lensers.profiles p
  WHERE p.id = p_subject_profile_id;

  IF NOT FOUND THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Deleted accounts → always unavailable
  IF v_subject.status = 'deleted' THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Check ownership
  IF p_viewer_auth_uid IS NOT NULL AND v_subject.user_id = p_viewer_auth_uid THEN
    v_is_owner := true;
  END IF;

  -- Deactivated / pending_deletion
  IF v_subject.status IN ('deactivated', 'pending_deletion') THEN
    IF v_is_owner THEN
      RETURN 'OWNER_RECOVERY_PROFILE'::lensers.profile_access_level;
    ELSE
      RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
    END IF;
  END IF;

  -- Suspended
  IF v_subject.status = 'suspended' THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Get viewer profile id
  IF p_viewer_auth_uid IS NOT NULL AND NOT v_is_owner THEN
    SELECT p.id INTO v_viewer_profile_id
    FROM lensers.profiles p
    WHERE p.user_id = p_viewer_auth_uid;
  END IF;

  -- Check block status
  IF v_viewer_profile_id IS NOT NULL THEN
    v_rel_state := lensers.fn_relationship_state(v_viewer_profile_id, v_subject.id);
    v_is_blocked := (v_rel_state->>'is_blocked')::boolean;

    IF v_is_blocked THEN
      RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
    END IF;
  END IF;

  -- Public / community → full access
  IF v_subject.visibility IN ('public', 'community') THEN
    RETURN 'FULL_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Private profile logic
  IF v_subject.visibility = 'private' THEN
    IF v_is_owner THEN
      RETURN 'FULL_PROFILE'::lensers.profile_access_level;
    END IF;

    -- Check accepted follow relationship
    IF v_viewer_profile_id IS NOT NULL THEN
      v_viewer_to_subject := v_rel_state->>'viewer_to_subject';
      IF v_viewer_to_subject = 'accepted' THEN
        RETURN 'FULL_PROFILE'::lensers.profile_access_level;
      END IF;
    END IF;

    RETURN 'RESTRICTED_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Fallback
  RETURN 'FULL_PROFILE'::lensers.profile_access_level;
END;
$$;

-- ─── 2.3 fn_lensers_get_profile (replaces fn_lensers_get_public_profile) ────

CREATE OR REPLACE FUNCTION public.fn_lensers_get_profile(p_handle text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth, analytics, xp
AS $$
DECLARE
  v_viewer_uid uuid;
  v_subject RECORD;
  v_access lensers.profile_access_level;
  v_viewer_profile_id uuid;
  v_rel_state jsonb;
  v_result jsonb;
  v_xp RECORD;
  v_min_xp bigint;
  v_max_xp bigint;
  v_stats RECORD;
  v_join RECORD;
BEGIN
  v_viewer_uid := auth.uid();

  -- Fetch subject profile (without visibility filter)
  SELECT p.id, p.handle, p.display_name, p.avatar_url, p.banner_url,
         p.bio, p.headline, p.status, p.visibility, p.created_at,
         p.user_id, p.preferences, p.deletion_requested_at, p.deletion_deadline_at
  INTO v_subject
  FROM lensers.profiles p
  WHERE p.handle = p_handle;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'route_state', 'UNAVAILABLE_PROFILE',
      'access_reason', 'not_found',
      'relationship_state', null,
      'profile', null
    );
  END IF;

  -- Resolve access level
  v_access := lensers.fn_can_view_profile(v_viewer_uid, v_subject.id);

  -- Get viewer profile id for relationship state
  IF v_viewer_uid IS NOT NULL THEN
    SELECT p.id INTO v_viewer_profile_id
    FROM lensers.profiles p
    WHERE p.user_id = v_viewer_uid;
  END IF;

  -- Build relationship state
  IF v_viewer_profile_id IS NOT NULL AND v_viewer_profile_id <> v_subject.id THEN
    v_rel_state := lensers.fn_relationship_state(v_viewer_profile_id, v_subject.id);
  ELSE
    v_rel_state := null;
  END IF;

  -- UNAVAILABLE → minimal response
  IF v_access = 'UNAVAILABLE_PROFILE' THEN
    RETURN jsonb_build_object(
      'route_state', 'UNAVAILABLE_PROFILE',
      'access_reason', 'unavailable',
      'relationship_state', v_rel_state,
      'profile', null
    );
  END IF;

  -- Fetch XP, stats, join info for full/restricted/recovery
  SELECT t.total_xp, t.current_level, t.app_id INTO v_xp
  FROM xp.totals t WHERE t.lenser_id = v_subject.id;

  IF v_xp.app_id IS NOT NULL AND v_xp.current_level IS NOT NULL THEN
    SELECT lv.min_total_xp, lv.max_total_xp INTO v_min_xp, v_max_xp
    FROM xp.levels lv
    WHERE lv.app_id = v_xp.app_id AND lv.level = v_xp.current_level;
  END IF;

  SELECT s.thread_count, s.prompt_count, s.follower_count, s.following_count, s.mutuals_count
  INTO v_stats
  FROM analytics.lenser_stats s WHERE s.lenser_id = v_subject.id;

  SELECT jl.join_order, jl.joined_at INTO v_join
  FROM analytics.lenser_join_log jl WHERE jl.lenser_id = v_subject.id;

  -- RESTRICTED → limited fields
  IF v_access = 'RESTRICTED_PROFILE' THEN
    RETURN jsonb_build_object(
      'route_state', 'RESTRICTED_PROFILE',
      'access_reason', 'private_not_following',
      'relationship_state', v_rel_state,
      'profile', jsonb_build_object(
        'id', v_subject.id,
        'handle', v_subject.handle,
        'display_name', v_subject.display_name,
        'avatar_url', v_subject.avatar_url,
        'visibility', v_subject.visibility,
        'total_xp', v_xp.total_xp,
        'current_level', v_xp.current_level,
        'follower_count', COALESCE(v_stats.follower_count, 0),
        'following_count', COALESCE(v_stats.following_count, 0),
        'join_order', v_join.join_order,
        'created_at', v_subject.created_at
      )
    );
  END IF;

  -- Determine access reason
  DECLARE
    v_reason text;
  BEGIN
    IF v_access = 'OWNER_RECOVERY_PROFILE' THEN
      v_reason := 'owner_recovery';
    ELSIF v_subject.visibility = 'private' THEN
      v_reason := 'private_following';
    ELSE
      v_reason := 'public';
    END IF;

    -- FULL / OWNER_RECOVERY → all fields
    v_result := jsonb_build_object(
      'route_state', v_access::text,
      'access_reason', v_reason,
      'relationship_state', v_rel_state,
      'profile', jsonb_build_object(
        'id', v_subject.id,
        'handle', v_subject.handle,
        'display_name', v_subject.display_name,
        'avatar_url', v_subject.avatar_url,
        'banner_url', v_subject.banner_url,
        'bio', v_subject.bio,
        'headline', v_subject.headline,
        'status', v_subject.status,
        'visibility', v_subject.visibility,
        'created_at', v_subject.created_at,
        'total_xp', v_xp.total_xp,
        'current_level', v_xp.current_level,
        'min_xp', v_min_xp,
        'max_xp', v_max_xp,
        'app_id', v_xp.app_id,
        'thread_count', COALESCE(v_stats.thread_count, 0),
        'prompt_count', COALESCE(v_stats.prompt_count, 0),
        'follower_count', COALESCE(v_stats.follower_count, 0),
        'following_count', COALESCE(v_stats.following_count, 0),
        'join_order', v_join.join_order,
        'joined_at', v_join.joined_at,
        'preferences', v_subject.preferences,
        'deletion_deadline_at', v_subject.deletion_deadline_at
      )
    );

    RETURN v_result;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_lensers_get_profile(text) TO anon, authenticated;

-- Keep old function working during transition (delegates to new one)
CREATE OR REPLACE FUNCTION public.fn_lensers_get_public_profile(p_handle text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_result jsonb;
  v_route_state text;
BEGIN
  v_result := public.fn_lensers_get_profile(p_handle);
  v_route_state := v_result->>'route_state';

  -- Old function only returns data for full profiles
  IF v_route_state = 'FULL_PROFILE' THEN
    RETURN v_result->'profile';
  ELSE
    RETURN null;
  END IF;
END;
$$;

-- ─── 2.4 Follow RPCs ────────────────────────────────────────────────────────

-- fn_request_follow: Public → auto-accept; Private → pending; Blocked/inactive → reject
CREATE OR REPLACE FUNCTION public.fn_request_follow(p_target_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_source_id uuid;
  v_target RECORD;
  v_existing lensers.relationship_status;
  v_new_status lensers.relationship_status;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  IF v_source_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Check target exists and is active
  SELECT p.id, p.status, p.visibility INTO v_target
  FROM lensers.profiles p WHERE p.id = p_target_profile_id;

  IF NOT FOUND OR v_target.status NOT IN ('active') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'target_unavailable');
  END IF;

  -- Check if blocked in either direction
  IF EXISTS (
    SELECT 1 FROM lensers.relationships
    WHERE status = 'blocked'
      AND (
        (source_profile_id = v_source_id AND target_profile_id = p_target_profile_id)
        OR (source_profile_id = p_target_profile_id AND target_profile_id = v_source_id)
      )
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'blocked');
  END IF;

  -- Check existing relationship
  SELECT r.status INTO v_existing
  FROM lensers.relationships r
  WHERE r.source_profile_id = v_source_id AND r.target_profile_id = p_target_profile_id;

  IF v_existing = 'accepted' THEN
    RETURN jsonb_build_object('status', 'accepted', 'reason', 'already_following');
  END IF;

  IF v_existing = 'pending' THEN
    RETURN jsonb_build_object('status', 'pending', 'reason', 'already_pending');
  END IF;

  -- Determine status based on target visibility
  IF v_target.visibility IN ('public', 'community') THEN
    v_new_status := 'accepted';
  ELSE
    v_new_status := 'pending';
  END IF;

  INSERT INTO lensers.relationships (source_profile_id, target_profile_id, status, accepted_at)
  VALUES (
    v_source_id,
    p_target_profile_id,
    v_new_status,
    CASE WHEN v_new_status = 'accepted' THEN now() ELSE null END
  )
  ON CONFLICT (source_profile_id, target_profile_id)
  DO UPDATE SET
    status = v_new_status,
    requested_at = now(),
    responded_at = null,
    accepted_at = CASE WHEN v_new_status = 'accepted' THEN now() ELSE null END,
    removed_at = null;

  -- Also write to old follows table for dual-read period
  IF v_new_status = 'accepted' THEN
    INSERT INTO lensers.follows (follower_id, following_id)
    VALUES (v_source_id, p_target_profile_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('status', v_new_status::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_request_follow(uuid) TO authenticated;

-- fn_accept_follow_request
CREATE OR REPLACE FUNCTION public.fn_accept_follow_request(p_source_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_target_id uuid;
BEGIN
  SELECT id INTO v_target_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'accepted',
      responded_at = now(),
      accepted_at = now()
  WHERE source_profile_id = p_source_profile_id
    AND target_profile_id = v_target_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_request');
  END IF;

  -- Sync to old follows table
  INSERT INTO lensers.follows (follower_id, following_id)
  VALUES (p_source_profile_id, v_target_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_accept_follow_request(uuid) TO authenticated;

-- fn_reject_follow_request
CREATE OR REPLACE FUNCTION public.fn_reject_follow_request(p_source_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_target_id uuid;
BEGIN
  SELECT id INTO v_target_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'rejected',
      responded_at = now()
  WHERE source_profile_id = p_source_profile_id
    AND target_profile_id = v_target_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_request');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_reject_follow_request(uuid) TO authenticated;

-- fn_remove_follow (soft-remove)
CREATE OR REPLACE FUNCTION public.fn_remove_follow(p_target_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'removed',
      removed_at = now()
  WHERE source_profile_id = v_source_id
    AND target_profile_id = p_target_profile_id
    AND status IN ('accepted', 'pending');

  -- Also remove from old follows table for dual-read
  DELETE FROM lensers.follows
  WHERE follower_id = v_source_id AND following_id = p_target_profile_id;

  RETURN jsonb_build_object('following', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_remove_follow(uuid) TO authenticated;

-- fn_block_profile
CREATE OR REPLACE FUNCTION public.fn_block_profile(p_target_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_source_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Upsert block
  INSERT INTO lensers.relationships (source_profile_id, target_profile_id, status)
  VALUES (v_source_id, p_target_profile_id, 'blocked')
  ON CONFLICT (source_profile_id, target_profile_id)
  DO UPDATE SET status = 'blocked', removed_at = now();

  -- Remove their follow of us if it exists
  UPDATE lensers.relationships
  SET status = 'removed', removed_at = now()
  WHERE source_profile_id = p_target_profile_id
    AND target_profile_id = v_source_id
    AND status = 'accepted';

  -- Sync old follows table
  DELETE FROM lensers.follows
  WHERE (follower_id = v_source_id AND following_id = p_target_profile_id)
     OR (follower_id = p_target_profile_id AND following_id = v_source_id);

  RETURN jsonb_build_object('blocked', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_block_profile(uuid) TO authenticated;

-- fn_unblock_profile
CREATE OR REPLACE FUNCTION public.fn_unblock_profile(p_target_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM lensers.relationships
  WHERE source_profile_id = v_source_id
    AND target_profile_id = p_target_profile_id
    AND status = 'blocked';

  RETURN jsonb_build_object('blocked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_unblock_profile(uuid) TO authenticated;

-- fn_get_pending_requests: list incoming pending follow requests
CREATE OR REPLACE FUNCTION public.fn_get_pending_requests(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  source_profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  requested_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
  SELECT
    r.id,
    r.source_profile_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    r.requested_at
  FROM lensers.relationships r
  JOIN lensers.profiles p ON p.id = r.source_profile_id
  JOIN lensers.profiles me ON me.user_id = auth.uid() AND me.id = r.target_profile_id
  WHERE r.status = 'pending'
    AND p.status = 'active'
  ORDER BY r.requested_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_pending_requests(int, int) TO authenticated;

-- ─── 2.5 Update existing follow RPCs to delegate ────────────────────────────

-- fn_lensers_follow → delegates to fn_request_follow
CREATE OR REPLACE FUNCTION public.fn_lensers_follow(p_following_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fn_request_follow(p_following_id);
  -- Return old format for backward compat
  RETURN jsonb_build_object('following', true);
END;
$$;

-- fn_lensers_unfollow → delegates to fn_remove_follow
CREATE OR REPLACE FUNCTION public.fn_lensers_unfollow(p_following_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fn_remove_follow(p_following_id);
  RETURN jsonb_build_object('following', false);
END;
$$;

-- fn_lensers_is_following → reads from relationships
CREATE OR REPLACE FUNCTION public.fn_lensers_is_following(p_target_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, lensers, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lensers.relationships r
    JOIN lensers.profiles p ON p.id = r.source_profile_id AND p.user_id = auth.uid()
    WHERE r.target_profile_id = p_target_id
      AND r.status = 'accepted'
  );
$$;

-- fn_lensers_get_follows → reads from relationships
CREATE OR REPLACE FUNCTION public.fn_lensers_get_follows(
  p_lenser_id uuid,
  p_type text DEFAULT 'following',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE(lenser_id uuid, handle text, display_name text, avatar_url text, is_following boolean)
LANGUAGE sql STABLE
SET search_path = public, lensers, auth
AS $$
  SELECT
    lp.id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    EXISTS (
      SELECT 1 FROM lensers.relationships r2
      JOIN lensers.profiles me ON me.user_id = auth.uid()
      WHERE r2.source_profile_id = me.id AND r2.target_profile_id = lp.id AND r2.status = 'accepted'
    ) AS is_following
  FROM lensers.relationships r
  JOIN lensers.profiles lp ON lp.id = CASE
    WHEN p_type = 'followers' THEN r.source_profile_id
    ELSE r.target_profile_id
  END
  WHERE CASE
    WHEN p_type = 'followers' THEN r.target_profile_id = p_lenser_id
    ELSE r.source_profile_id = p_lenser_id
  END
    AND r.status = 'accepted'
    AND lp.status = 'active'::lensers.lenser_status
    AND lp.deletion_requested_at IS NULL
  ORDER BY r.accepted_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;

-- ─── 2.6 Counter trigger on relationships ───────────────────────────────────

CREATE OR REPLACE FUNCTION lensers.fn_sync_relationship_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = lensers, analytics
AS $$
DECLARE
  v_is_mutual boolean;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    INSERT INTO analytics.lenser_stats (lenser_id, follower_count)
      VALUES (NEW.target_profile_id, 1)
      ON CONFLICT (lenser_id) DO UPDATE
        SET follower_count = analytics.lenser_stats.follower_count + 1, updated_at = now();

    INSERT INTO analytics.lenser_stats (lenser_id, following_count)
      VALUES (NEW.source_profile_id, 1)
      ON CONFLICT (lenser_id) DO UPDATE
        SET following_count = analytics.lenser_stats.following_count + 1, updated_at = now();

    -- Check mutual
    SELECT EXISTS (
      SELECT 1 FROM lensers.relationships
      WHERE source_profile_id = NEW.target_profile_id
        AND target_profile_id = NEW.source_profile_id
        AND status = 'accepted'
    ) INTO v_is_mutual;

    IF v_is_mutual THEN
      UPDATE analytics.lenser_stats
        SET mutuals_count = mutuals_count + 1, updated_at = now()
        WHERE lenser_id IN (NEW.source_profile_id, NEW.target_profile_id);
    END IF;

  -- Handle UPDATE (status change)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Became accepted
    IF OLD.status <> 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE analytics.lenser_stats
        SET follower_count = follower_count + 1, updated_at = now()
        WHERE lenser_id = NEW.target_profile_id;
      UPDATE analytics.lenser_stats
        SET following_count = following_count + 1, updated_at = now()
        WHERE lenser_id = NEW.source_profile_id;

      SELECT EXISTS (
        SELECT 1 FROM lensers.relationships
        WHERE source_profile_id = NEW.target_profile_id
          AND target_profile_id = NEW.source_profile_id
          AND status = 'accepted'
      ) INTO v_is_mutual;

      IF v_is_mutual THEN
        UPDATE analytics.lenser_stats
          SET mutuals_count = mutuals_count + 1, updated_at = now()
          WHERE lenser_id IN (NEW.source_profile_id, NEW.target_profile_id);
      END IF;
    END IF;

    -- Was accepted, now not
    IF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      UPDATE analytics.lenser_stats
        SET follower_count = GREATEST(0, follower_count - 1), updated_at = now()
        WHERE lenser_id = NEW.target_profile_id;
      UPDATE analytics.lenser_stats
        SET following_count = GREATEST(0, following_count - 1), updated_at = now()
        WHERE lenser_id = NEW.source_profile_id;

      -- Check if was mutual
      SELECT EXISTS (
        SELECT 1 FROM lensers.relationships
        WHERE source_profile_id = NEW.target_profile_id
          AND target_profile_id = NEW.source_profile_id
          AND status = 'accepted'
      ) INTO v_is_mutual;

      IF v_is_mutual THEN
        UPDATE analytics.lenser_stats
          SET mutuals_count = GREATEST(0, mutuals_count - 1), updated_at = now()
          WHERE lenser_id IN (NEW.source_profile_id, NEW.target_profile_id);
      END IF;
    END IF;

  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE analytics.lenser_stats
      SET follower_count = GREATEST(0, follower_count - 1), updated_at = now()
      WHERE lenser_id = OLD.target_profile_id;
    UPDATE analytics.lenser_stats
      SET following_count = GREATEST(0, following_count - 1), updated_at = now()
      WHERE lenser_id = OLD.source_profile_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_relationships_sync_counts
  AFTER INSERT OR UPDATE OR DELETE ON lensers.relationships
  FOR EACH ROW
  EXECUTE FUNCTION lensers.fn_sync_relationship_counts();
