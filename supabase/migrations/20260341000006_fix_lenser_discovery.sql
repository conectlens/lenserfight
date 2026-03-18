-- Migration: Fix Lenser discovery returning 0 rows
--
-- Root causes:
-- 1. fn_lensers_list (added in _004) requires onboarding_step = 2, but profiles
--    created before this requirement — or users who skipped the language-preference
--    step — are stuck at onboarding_step = 1 and are invisible to discovery.
-- 2. fn_lensers_get_suggested returns 0 when the requesting lenser follows no tags,
--    because the tag-overlap CTE yields nothing and the join collapses to empty.
--
-- Fixes:
-- 1. Backfill: advance active step-1 profiles to step-2 (treat them as complete).
-- 2. Replace fn_lensers_get_suggested with a version that falls back to
--    active public lensers ranked by XP when the tag-overlap pool is empty.

-- ── 1. Backfill onboarding_step ─────────────────────────────────────────────
UPDATE lensers.profiles
SET
  onboarding_step         = 2,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  updated_at              = now()
WHERE
  onboarding_step       = 1
  AND status            = 'active'
  AND deletion_requested_at IS NULL;

-- ── 2. Replace fn_lensers_get_suggested with tag-overlap + XP fallback ──────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_suggested"(
  "p_lenser_id" "uuid",
  "p_limit"     integer DEFAULT 10
)
RETURNS TABLE(
  "lenser_id"        "uuid",
  "handle"           "text",
  "display_name"     "text",
  "avatar_url"       "text",
  "total_xp"         bigint,
  "current_level"    integer,
  "lenser_score"     double precision,
  "tag_overlap_score" double precision
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'lensers', 'content', 'xp'
AS $$
WITH
  interest_tags AS (
    SELECT tag_id FROM lensers.tag_follows WHERE lenser_id = p_lenser_id
  ),
  already_following AS (
    SELECT following_id FROM lensers.follows WHERE follower_id = p_lenser_id
  ),
  thread_author_tags AS (
    SELECT
      t.lenser_id,
      COUNT(DISTINCT it.tag_id)::float
        / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_score
    FROM content.threads    t
    JOIN content.tag_map    tm ON tm.entity_id = t.id AND tm.entity_type = 'thread'
    JOIN interest_tags      it ON it.tag_id = tm.tag_id
    WHERE t.visibility = 'public'::content.visibility_enum
    GROUP BY t.lenser_id
  ),
  prompt_author_tags AS (
    SELECT
      pt.lenser_id,
      COUNT(DISTINCT it.tag_id)::float
        / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_score
    FROM content.prompt_templates pt
    JOIN content.tag_map           tm ON tm.entity_id = pt.id AND tm.entity_type = 'prompt_template'
    JOIN interest_tags             it ON it.tag_id = tm.tag_id
    WHERE pt.visibility = 'public'::content.visibility_enum
    GROUP BY pt.lenser_id
  ),
  author_tag_agg AS (
    SELECT lenser_id, AVG(tag_score) AS tag_overlap_score
    FROM (
      SELECT lenser_id, tag_score FROM thread_author_tags
      UNION ALL
      SELECT lenser_id, tag_score FROM prompt_author_tags
    ) combined
    GROUP BY lenser_id
  ),
  -- Pool A: tag-overlap candidates (used when the lenser follows ≥1 tag)
  tag_pool AS (
    SELECT
      lp.id          AS lenser_id,
      lp.handle,
      lp.display_name,
      lp.avatar_url,
      COALESCE(xt.total_xp, 0)::bigint   AS total_xp,
      COALESCE(xt.current_level, 1)       AS current_level,
      COALESCE(agg.tag_overlap_score, 0.0) AS tag_overlap_score
    FROM author_tag_agg agg
    JOIN lensers.profiles lp ON lp.id = agg.lenser_id
    LEFT JOIN (
      SELECT t.lenser_id, SUM(t.total_xp) AS total_xp, MAX(t.current_level) AS current_level
      FROM xp.totals t GROUP BY t.lenser_id
    ) xt ON xt.lenser_id = lp.id
    WHERE lp.status                = 'active'
      AND lp.visibility            = 'public'
      AND lp.onboarding_step       = 2
      AND lp.deletion_requested_at IS NULL
      AND lp.id <> p_lenser_id
      AND lp.id NOT IN (SELECT following_id FROM already_following)
  ),
  -- Pool B: XP-ranked fallback — active public lensers, no tag requirement
  xp_pool AS (
    SELECT
      lp.id          AS lenser_id,
      lp.handle,
      lp.display_name,
      lp.avatar_url,
      COALESCE(xt.total_xp, 0)::bigint AS total_xp,
      COALESCE(xt.current_level, 1)     AS current_level,
      0.0::double precision             AS tag_overlap_score
    FROM lensers.profiles lp
    LEFT JOIN (
      SELECT t.lenser_id, SUM(t.total_xp) AS total_xp, MAX(t.current_level) AS current_level
      FROM xp.totals t GROUP BY t.lenser_id
    ) xt ON xt.lenser_id = lp.id
    WHERE lp.status                = 'active'
      AND lp.visibility            = 'public'
      AND lp.onboarding_step       = 2
      AND lp.deletion_requested_at IS NULL
      AND lp.id <> p_lenser_id
      AND lp.id NOT IN (SELECT following_id FROM already_following)
  ),
  -- Choose pool: if tag_pool has rows use it, otherwise fall back to xp_pool
  chosen AS (
    SELECT * FROM tag_pool
    WHERE (SELECT COUNT(*) FROM tag_pool) > 0
    UNION ALL
    SELECT * FROM xp_pool
    WHERE (SELECT COUNT(*) FROM tag_pool) = 0
  ),
  top_candidates AS (
    SELECT * FROM chosen
    ORDER BY tag_overlap_score DESC, total_xp DESC
    LIMIT LEAST(p_limit, 50) * 2
  )
SELECT
  tc.lenser_id,
  tc.handle,
  tc.display_name,
  tc.avatar_url,
  tc.total_xp,
  tc.current_level,
  (
    0.7 * log(GREATEST(1.0, tc.total_xp::double precision))
    + 0.3 * log(GREATEST(1.0, COALESCE(re7.cnt, 0)::double precision))
  ) AS lenser_score,
  tc.tag_overlap_score
FROM top_candidates tc
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM (
    SELECT 1
    FROM content.thread_reactions tr
    JOIN content.threads t ON t.id = tr.thread_id AND t.lenser_id = tc.lenser_id
    WHERE tr.created_at > now() - interval '7 days'
    UNION ALL
    SELECT 1
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates pt ON pt.id = pr.prompt_id AND pt.lenser_id = tc.lenser_id
    WHERE pr.created_at > now() - interval '7 days'
  ) x
) re7 ON true
ORDER BY (
  0.60 * tc.tag_overlap_score
  + 0.40 * LEAST(
    (0.7 * log(GREATEST(1.0, tc.total_xp::double precision))
     + 0.3 * log(GREATEST(1.0, COALESCE(re7.cnt, 0)::double precision)))
    / 5.0, 1.0)
) DESC
LIMIT LEAST(p_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_suggested"("uuid", integer) TO anon, authenticated, service_role;
