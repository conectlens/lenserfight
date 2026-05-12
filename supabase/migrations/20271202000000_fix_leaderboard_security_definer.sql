-- Fix fn_lensers_get_leaderboard: add SECURITY DEFINER so it executes as
-- postgres (owner) rather than the calling anon role.
--
-- Root cause: migrations 20271122 + 20271123 revoked anon SELECT from all
-- non-public schemas (lensers, xp, content, lenses). The function was not
-- SECURITY DEFINER, so anon callers hit "permission denied for table profiles".
--
-- Same pattern applied to public views in 20271201000000.
--
-- Hardening:
--   - SECURITY DEFINER with explicit search_path prevents search_path injection.
--   - p_limit is clamped to [1, 100] — negative / zero inputs become 1.
--   - anon cannot INSERT/UPDATE/DELETE any table this function reads.

DROP FUNCTION IF EXISTS "public"."fn_lensers_get_leaderboard"("text","integer");
CREATE OR REPLACE FUNCTION public.fn_lensers_get_leaderboard(
  p_period text    DEFAULT 'all_time',
  p_limit  integer DEFAULT 20
)
RETURNS TABLE (
  lenser_id    uuid,
  handle       text,
  display_name text,
  avatar_url   text,
  total_xp     bigint,
  current_level integer,
  lenser_score double precision,
  rank         bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lensers, xp, lenses, content
AS $$
WITH ranked AS (
  SELECT
    lp.id            AS lenser_id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    COALESCE(xt.total_xp,      0)::bigint AS total_xp,
    COALESCE(xt.current_level, 1)          AS current_level,
    ROW_NUMBER() OVER (ORDER BY COALESCE(xt.total_xp, 0) DESC) AS rank
  FROM lensers.profiles lp
  LEFT JOIN (
    SELECT t.lenser_id,
           SUM(t.total_xp)       AS total_xp,
           MAX(t.current_level)  AS current_level
    FROM xp.totals t
    GROUP BY t.lenser_id
  ) xt ON xt.lenser_id = lp.id
  WHERE lp.status              = 'active'
    AND lp.visibility          = 'public'
    AND lp.deletion_requested_at IS NULL
    AND CASE p_period
          WHEN 'weekly'  THEN lp.last_active_at > now() - interval '7 days'
          WHEN 'monthly' THEN lp.last_active_at > now() - interval '30 days'
          ELSE true
        END
  ORDER BY COALESCE(xt.total_xp, 0) DESC
  -- clamp: at least 1, at most 100; negative or zero inputs become 1
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
)
SELECT
  r.lenser_id,
  r.handle,
  r.display_name,
  r.avatar_url,
  r.total_xp,
  r.current_level,
  (
    0.7 * log(GREATEST(1.0, r.total_xp::double precision))
    + 0.3 * log(GREATEST(1.0, COALESCE(re7.cnt, 0)::double precision))
  ) AS lenser_score,
  r.rank
FROM ranked r
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt
  FROM (
    SELECT 1
    FROM content.reactions tr
    JOIN content.threads t ON t.id = tr.entity_id AND t.lenser_id = r.lenser_id
    WHERE tr.entity_type = 'thread'
      AND tr.created_at > now() - interval '7 days'
    UNION ALL
    SELECT 1
    FROM content.reactions pr
    JOIN lenses.lenses pt ON pt.id = pr.entity_id AND pt.lenser_id = r.lenser_id
    WHERE pr.entity_type = 'lens'
      AND pr.created_at > now() - interval '7 days'
  ) x
) re7 ON true
ORDER BY r.rank;
$$;

ALTER FUNCTION public.fn_lensers_get_leaderboard(text, integer) OWNER TO postgres;

-- Explicit grants — anon and authenticated may call; service_role already has all.
GRANT EXECUTE ON FUNCTION public.fn_lensers_get_leaderboard(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_lensers_get_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_lensers_get_leaderboard(text, integer) TO service_role;
