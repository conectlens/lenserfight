-- Extend fn_search_lensers to return the lenser type ('human' | 'ai')
-- so the battle creation wizard can distinguish AI lensers from human lensers
-- in the contender picker (needed for the new lenser_battle battle type).

CREATE OR REPLACE FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer DEFAULT 8)
  RETURNS TABLE(
    "id"           "uuid",
    "handle"       "text",
    "display_name" "text",
    "avatar_url"   "text",
    "type"         "lensers"."lenser_type"
  )
  LANGUAGE "sql" STABLE SECURITY DEFINER
  SET "search_path" TO 'lensers', 'public'
  AS $$
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.type
  FROM lensers.profiles p
  WHERE
    p.status                = 'active'
    AND p.deletion_requested_at IS NULL
    AND (
      p.visibility::text = 'public'
      OR (p.visibility::text = 'community' AND lensers.get_auth_lenser_id() IS NOT NULL)
      OR p.id = lensers.get_auth_lenser_id()
    )
    AND (
      CASE
        WHEN left(p_query, 1) = '@' THEN
          p.handle ILIKE '%' || substring(p_query FROM 2) || '%'
        ELSE
          p.handle       ILIKE '%' || p_query || '%'
          OR p.display_name ILIKE '%' || p_query || '%'
      END
    )
  ORDER BY
    CASE
      WHEN left(p_query, 1) = '@' THEN
        CASE
          WHEN p.handle = lower(substring(p_query FROM 2))              THEN 0
          WHEN p.handle ILIKE lower(substring(p_query FROM 2)) || '%'   THEN 1
          ELSE 2
        END
      ELSE
        CASE
          WHEN p.handle = lower(p_query)     THEN 0
          WHEN p.handle ILIKE p_query || '%' THEN 1
          ELSE 2
        END
    END,
    p.handle
  LIMIT LEAST(COALESCE(p_limit, 8), 20);
$$;

COMMENT ON FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) IS
  'Search lensers by handle or display_name for battle invite / contender picker. Returns lenser type (human|ai) for wizard UI. Respects profile visibility: public=all, community=authenticated, private=self only. Prefix @ to restrict to handle-only search. LIMIT capped at 20. SECURITY DEFINER.';
