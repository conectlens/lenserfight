-- Fix fn_lensers_update_profile to include location and website_url fields.
-- These columns exist in lensers.profiles but were omitted from the UPDATE SET clause,
-- causing profile saves to silently discard location and website inputs.

CREATE OR REPLACE FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_row lensers.profiles;
  v_language text;
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
    location                = CASE WHEN p_data ? 'location'                THEN (p_data->>'location')                             ELSE location                END,
    website_url             = CASE WHEN p_data ? 'website_url'             THEN (p_data->>'website_url')                          ELSE website_url             END,
    onboarding_step         = CASE WHEN p_data ? 'onboarding_step'         THEN (p_data->>'onboarding_step')::smallint            ELSE onboarding_step         END,
    onboarding_completed_at = CASE WHEN p_data ? 'onboarding_completed_at' THEN (p_data->>'onboarding_completed_at')::timestamptz ELSE onboarding_completed_at END,
    visibility              = CASE WHEN p_data ? 'visibility'              THEN (p_data->>'visibility')::lensers.lenser_visibility ELSE visibility              END,
    updated_at              = now()
  WHERE id = (
    SELECT id FROM lensers.profiles
    WHERE user_id = v_uid
    ORDER BY created_at ASC
    LIMIT 1
  )
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_data ? 'preferred_language' THEN
    v_language := COALESCE(NULLIF(btrim(p_data->>'preferred_language'), ''), 'en');
    INSERT INTO lensers.preferences (lenser_id, language)
    VALUES (v_row.id, v_language)
    ON CONFLICT (lenser_id) DO UPDATE
    SET language = EXCLUDED.language,
        updated_at = now();
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;
