-- Migration: Add public RPC wrappers for lensers.profiles and core.languages
-- PostgREST only exposes the `public` schema; direct table access via
-- supabase.schema('lensers') / supabase.schema('core') returns PGRST106.
-- These SECURITY DEFINER functions bridge the gap via the existing pattern.

-- ── Create profile ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_create_profile"(
  "p_handle"       text,
  "p_display_name" text,
  "p_bio"          text DEFAULT ''
)
RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
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

  INSERT INTO lensers.profiles (user_id, handle, display_name, bio, headline, onboarding_step)
  VALUES (v_uid, p_handle, p_display_name, COALESCE(p_bio, ''), NULL, 1)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

ALTER FUNCTION "public"."fn_lensers_create_profile"("p_handle" text, "p_display_name" text, "p_bio" text) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" text, "p_display_name" text, "p_bio" text) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" text, "p_display_name" text, "p_bio" text) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" text, "p_display_name" text, "p_bio" text) TO "service_role";


-- ── Update profile ──────────────────────────────────────────────────────────
-- p_data is a partial jsonb; only keys present in the object are updated.
CREATE OR REPLACE FUNCTION "public"."fn_lensers_update_profile"(
  "p_data" jsonb
)
RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
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
    updated_at              = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

ALTER FUNCTION "public"."fn_lensers_update_profile"("p_data" jsonb) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" jsonb) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" jsonb) TO "service_role";


-- ── Languages list ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_core_languages_list"()
RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  SET "search_path" TO 'public', 'core'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'code',        l.code,
      'name',        l.name,
      'native_name', l.native_name,
      'direction',   l.direction
    )
    ORDER BY l.name
  )
  INTO v_result
  FROM core.languages l
  WHERE l.is_active = true;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

ALTER FUNCTION "public"."fn_core_languages_list"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_core_languages_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "service_role";
