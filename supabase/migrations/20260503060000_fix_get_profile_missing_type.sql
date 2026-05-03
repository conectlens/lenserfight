-- Adds the `type` field to every profile payload returned by fn_lensers_get_profile.
-- Without it, callers cannot distinguish human vs AI lenser profiles and the agent
-- workspace control room always resolved to human_owner mode.

CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_profile"("p_handle" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth', 'analytics', 'xp'
    AS $$
DECLARE
  v_viewer_uid uuid;
  v_subject RECORD;
  v_prefs lensers.preferences;
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
         p.type,
         p.user_id, p.deletion_requested_at, p.deletion_deadline_at
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

  -- Fetch preferences row (1:1 with profile)
  SELECT * INTO v_prefs
  FROM lensers.preferences
  WHERE lenser_id = v_subject.id;

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

  SELECT s.thread_count, s.lens_count, s.follower_count, s.following_count, s.mutuals_count
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
        'type', v_subject.type,
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
        'type', v_subject.type,
        'visibility', v_subject.visibility,
        'created_at', v_subject.created_at,
        'total_xp', v_xp.total_xp,
        'current_level', v_xp.current_level,
        'min_xp', v_min_xp,
        'max_xp', v_max_xp,
        'app_id', v_xp.app_id,
        'thread_count', COALESCE(v_stats.thread_count, 0),
        'lens_count', COALESCE(v_stats.lens_count, 0),
        'follower_count', COALESCE(v_stats.follower_count, 0),
        'following_count', COALESCE(v_stats.following_count, 0),
        'join_order', v_join.join_order,
        'joined_at', v_join.joined_at,
        'hide_actions', COALESCE(v_prefs.hide_actions, false),
        'content_visibility', COALESCE(v_prefs.content_visibility, 'public'),
        'deletion_deadline_at', v_subject.deletion_deadline_at
      )
    );

    RETURN v_result;
  END;
END;
$$;
