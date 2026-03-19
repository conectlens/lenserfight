-- Fix fn_lensers_list: lower onboarding gate from step = 2 to step >= 1
-- Profiles at step 1 already have a valid handle, display_name, status=active,
-- and visibility=public. The language-preference step (step 2) was best-effort
-- on the frontend, meaning many valid profiles were silently excluded.

CREATE OR REPLACE FUNCTION "public"."fn_lensers_list"(
  "p_type"   "text"    DEFAULT NULL,
  "p_limit"  integer   DEFAULT 20,
  "p_offset" integer   DEFAULT 0
) RETURNS TABLE(
  "id"          "uuid",
  "handle"      "text",
  "display_name" "text",
  "avatar_url"  "text",
  "bio"         "text",
  "type"        "lensers"."lenser_type",
  "ai_model_id" "uuid",
  "created_at"  timestamp with time zone,
  "engagement"  "jsonb"
)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'lensers', 'public'
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
    AND p.onboarding_step >= 1
    AND p.visibility      = 'public'
    AND (p_type IS NULL OR p.type = p_type::lensers.lenser_type)
  ORDER BY p.created_at DESC
  LIMIT  LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- Backfill: promote profiles that are fully active/public but stuck at step 1
-- (created more than 1 hour ago — they clearly completed onboarding but the
-- step-2 update failed silently on the frontend)
UPDATE lensers.profiles
SET
  onboarding_step         = 2,
  onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE
  onboarding_step = 1
  AND status = 'active'
  AND visibility = 'public'
  AND deletion_requested_at IS NULL
  AND created_at < now() - INTERVAL '1 hour';
