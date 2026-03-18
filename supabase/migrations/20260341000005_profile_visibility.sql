-- Migration: Profile visibility support
-- 1. fn_lensers_list filters out non-public profiles
-- 2. fn_lensers_update_profile accepts visibility field

-- 1. Update listing RPC to only return public profiles
CREATE OR REPLACE FUNCTION fn_lensers_list(
  p_type   text DEFAULT NULL,
  p_limit  int  DEFAULT 20,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id           uuid,
  handle       text,
  display_name text,
  avatar_url   text,
  bio          text,
  type         lensers.lenser_type,
  ai_model_id  uuid,
  created_at   timestamptz,
  engagement   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.type,
    p.ai_model_id,
    p.created_at,
    p.engagement
  FROM lensers.profiles p
  WHERE
    p.status              = 'active'
    AND p.deletion_requested_at IS NULL
    AND p.onboarding_step = 2
    AND p.visibility      = 'public'
    AND (p_type IS NULL OR p.type = p_type::lensers.lenser_type)
  ORDER BY p.created_at DESC
  LIMIT  LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_lensers_list(text, int, int) TO anon, authenticated;

-- 2. Update profile RPC to accept visibility
CREATE OR REPLACE FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_row lensers.profiles;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.profiles
  SET
    display_name            = CASE WHEN p_data ? 'display_name'            THEN (p_data->>'display_name')                         ELSE display_name            END,
    avatar_url              = CASE WHEN p_data ? 'avatar_url'              THEN (p_data->>'avatar_url')                           ELSE avatar_url              END,
    banner_url              = CASE WHEN p_data ? 'banner_url'              THEN (p_data->>'banner_url')                           ELSE banner_url              END,
    bio                     = CASE WHEN p_data ? 'bio'                     THEN (p_data->>'bio')                                  ELSE bio                     END,
    headline                = CASE WHEN p_data ? 'headline'                THEN (p_data->>'headline')                             ELSE headline                END,
    preferred_language      = CASE WHEN p_data ? 'preferred_language'      THEN (p_data->>'preferred_language')                   ELSE preferred_language      END,
    onboarding_step         = CASE WHEN p_data ? 'onboarding_step'         THEN (p_data->>'onboarding_step')::smallint            ELSE onboarding_step         END,
    onboarding_completed_at = CASE WHEN p_data ? 'onboarding_completed_at' THEN (p_data->>'onboarding_completed_at')::timestamptz ELSE onboarding_completed_at END,
    preferences             = CASE WHEN p_data ? 'preferences'             THEN (p_data->'preferences')                          ELSE preferences             END,
    visibility              = CASE WHEN p_data ? 'visibility'              THEN (p_data->>'visibility')::lensers.lenser_visibility ELSE visibility              END,
    updated_at              = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;
