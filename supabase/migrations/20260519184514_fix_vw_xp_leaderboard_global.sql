-- =============================================================================
-- Fix vw_xp_leaderboard_global — drop and recreate without app_id column
-- The view aggregates XP across all apps (global ranking); app_id is not
-- exposed. Queries filtering by app_id were failing with 42703.
-- =============================================================================

DROP VIEW IF EXISTS public.vw_xp_leaderboard_global;

CREATE OR REPLACE VIEW public.vw_xp_leaderboard_global AS
WITH aggregated AS (
  SELECT t.lenser_id,
    SUM(t.total_xp) AS total_xp,
    MAX(t.current_level) AS current_level
  FROM xp.totals t
  GROUP BY t.lenser_id
),
ranked AS (
  SELECT a.lenser_id,
    a.total_xp,
    a.current_level,
    rank() OVER (ORDER BY a.total_xp DESC, a.lenser_id) AS rank
  FROM aggregated a
)
SELECT
  r.rank,
  r.lenser_id,
  r.total_xp,
  r.current_level,
  jsonb_build_object(
    'display_name', l.display_name,
    'handle',       l.handle,
    'avatar_url',   l.avatar_url
  ) AS "user"
FROM ranked r
JOIN lensers.profiles l ON l.id = r.lenser_id
WHERE r.rank <= 100;

ALTER VIEW public.vw_xp_leaderboard_global OWNER TO postgres;

GRANT ALL ON TABLE public.vw_xp_leaderboard_global TO anon;
GRANT ALL ON TABLE public.vw_xp_leaderboard_global TO authenticated;
GRANT ALL ON TABLE public.vw_xp_leaderboard_global TO service_role;
