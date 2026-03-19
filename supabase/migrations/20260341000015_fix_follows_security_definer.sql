-- Migration: Fix fn_lensers_get_follows permission error (code 42501)
-- The function queries lensers.relationships directly without SECURITY DEFINER,
-- so the RLS policy on relationships (only source/target can see their own rows)
-- blocks public/authenticated callers who are not party to any relationship.
-- Fix: add SECURITY DEFINER so the function runs as its owner (postgres) and
-- bypasses RLS, returning only the safe projected columns.

CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_follows"(
  "p_lenser_id" uuid,
  "p_type"      text    DEFAULT 'following',
  "p_limit"     integer DEFAULT 20,
  "p_offset"    integer DEFAULT 0
)
RETURNS TABLE (
  "lenser_id"    uuid,
  "handle"       text,
  "display_name" text,
  "avatar_url"   text,
  "is_following" boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
  SELECT
    lp.id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    EXISTS (
      SELECT 1 FROM lensers.relationships r2
      JOIN lensers.profiles me ON me.user_id = auth.uid()
      WHERE r2.source_profile_id = me.id
        AND r2.target_profile_id = lp.id
        AND r2.status = 'accepted'
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

ALTER FUNCTION "public"."fn_lensers_get_follows"(uuid, text, integer, integer) OWNER TO postgres;

REVOKE ALL ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, integer, integer) TO service_role;
