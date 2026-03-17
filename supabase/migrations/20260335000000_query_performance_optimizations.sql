-- =============================================================================
-- Migration: Query Performance Optimizations
-- Based on pg_stat_statements CSV analysis (2026-03-17)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TIER 1: Indexes
-- ---------------------------------------------------------------------------

-- 1B. Composite index on lensers.profiles(user_id, status)
-- Fixes RLS hot-path: 261 calls, 3.7% cache hit, ~10 ms mean
-- Pattern: WHERE user_id = auth.uid() AND status = 'active'
DROP INDEX IF EXISTS lensers.idx_profiles_user_id;
CREATE INDEX idx_profiles_user_id_status
  ON lensers.profiles (user_id, status)
  WHERE deletion_requested_at IS NULL;

-- 1C. Missing index on content.tags(slug)
-- Used by fn_content_get_prompts_by_tag and fn_content_get_threads_by_tag
CREATE INDEX IF NOT EXISTS idx_tags_slug ON content.tags (slug);


-- ---------------------------------------------------------------------------
-- TIER 2A: Rewrite fn_content_get_personal_prompts — two-phase scoring
-- Avoids joining vw_lensers_score against 5000 candidates.
-- Phase 1: score without lenser_score (cheap), take top 2×limit.
-- Phase 2: enrich only those ~100 rows with lenser_score, re-sort.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_content_get_personal_prompts(
  p_limit  integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id              uuid,
  personal_score  double precision,
  hot_score       double precision,
  primary_language text,
  author_profile  jsonb,
  tags            jsonb,
  reaction_totals jsonb,
  title           text,
  description     text,
  created_at      timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers', 'auth'
AS $$
WITH
  current_lenser AS (
    SELECT p.id, p.preferred_language, p.user_id
    FROM lensers.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  interest_tags AS (
    SELECT tf.tag_id
    FROM lensers.tag_follows tf
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT xcl.equivalent_tag_id
    FROM lensers.tag_follows tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates  pt2 ON pt2.id = pr.prompt_id
    JOIN content.tag_map           tm  ON tm.entity_id = pt2.id AND tm.entity_type = 'prompt_template'
    WHERE pr.user_id    = (SELECT user_id FROM current_lenser)
      AND pr.created_at > now() - interval '30 days'
  ),
  candidates AS (
    SELECT pt.id, pt.created_at, pt.lenser_id
    FROM content.prompt_templates pt
    WHERE pt.visibility = 'public'
      AND pt.status     = 'published'
      AND (SELECT id FROM current_lenser) IS NOT NULL
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT pr.prompt_id,
      count(*) FILTER (WHERE pr.reaction = 'copy' ::content.reaction_enum) AS copy_count,
      count(*) FILTER (WHERE pr.reaction = 'like' ::content.reaction_enum) AS like_count,
      count(*) FILTER (WHERE pr.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.prompt_reactions pr
    WHERE pr.prompt_id IN (SELECT id FROM candidates)
    GROUP BY pr.prompt_id
  ),
  -- Phase 1: Score without lenser_score (0.85 of total weight)
  preliminary_scores AS (
    SELECT
      c.id,
      c.lenser_id,
      ptt.language_code AS primary_language,
      log(greatest(1,
        4.0 * coalesce(r.copy_count,  0)
      + 2.0 * coalesce(r.like_count,  0)
      + 1.0 * coalesce(r.saved_count, 0)
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5) AS hot_score,
      (
        0.30 * COALESCE((
          SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1)
          FROM content.tag_map tm
          JOIN interest_tags it ON it.tag_id = tm.tag_id
          WHERE tm.entity_type = 'prompt_template' AND tm.entity_id = c.id
        ), 0.0)
        + 0.25 * CASE
            WHEN ptt.language_code = (SELECT preferred_language FROM current_lenser) THEN 1.0
            ELSE 0.0
          END
        + 0.20 * LEAST(
            log(greatest(1,
              4.0 * coalesce(r.copy_count,  0)
            + 2.0 * coalesce(r.like_count,  0)
            + 1.0 * coalesce(r.saved_count, 0)
            )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
            / 2.0, 1.0)
        + 0.10 * CASE WHEN fa.following_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS preliminary_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.prompt_translations ptt ON ptt.prompt_id = c.id AND ptt.is_original = true
    LEFT JOIN lensers.follows fa
           ON fa.follower_id  = (SELECT id FROM current_lenser)
          AND fa.following_id = c.lenser_id
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'prompt_template'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
    ORDER BY preliminary_score DESC
    LIMIT LEAST(p_limit, 50) * 2
  ),
  -- Phase 2: Enrich top candidates with lenser_score (only ~100 rows)
  candidate_scores AS (
    SELECT
      ps.id,
      ps.primary_language,
      ps.hot_score,
      (
        ps.preliminary_score
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
      ) AS personal_score
    FROM preliminary_scores ps
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = ps.lenser_id
    ORDER BY personal_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, c.personal_score, c.hot_score, c.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.description, v.created_at
FROM candidate_scores c
JOIN public.vw_prompt_templates_public v ON v.id = c.id
ORDER BY c.personal_score DESC;
$$;


-- ---------------------------------------------------------------------------
-- TIER 2A: Rewrite fn_content_get_personal_threads — same two-phase pattern
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_content_get_personal_threads(
  p_limit  integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id              uuid,
  personal_score  double precision,
  hot_score       double precision,
  primary_language text,
  author_profile  jsonb,
  tags            jsonb,
  reaction_totals jsonb,
  title           text,
  reply_count     integer,
  created_at      timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers', 'auth'
AS $$
WITH
  current_lenser AS (
    SELECT p.id, p.preferred_language, p.user_id
    FROM lensers.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  interest_tags AS (
    SELECT tf.tag_id
    FROM lensers.tag_follows tf
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT xcl.equivalent_tag_id
    FROM lensers.tag_follows tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.thread_reactions tr
    JOIN content.threads t2 ON t2.id = tr.thread_id
    JOIN content.tag_map  tm ON tm.entity_id = t2.id AND tm.entity_type = 'thread'
    WHERE tr.user_id    = (SELECT user_id FROM current_lenser)
      AND tr.created_at > now() - interval '30 days'
  ),
  candidates AS (
    SELECT t.id, t.created_at, t.lenser_id, t.reply_count, t.view_count
    FROM content.threads t
    WHERE t.visibility = 'public'
      AND t.status     = 'published'
      AND (SELECT id FROM current_lenser) IS NOT NULL
    ORDER BY t.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT tr.thread_id,
      count(*) FILTER (WHERE tr.reaction = 'like'::content.reaction_enum) AS like_count
    FROM content.thread_reactions tr
    WHERE tr.thread_id IN (SELECT id FROM candidates)
    GROUP BY tr.thread_id
  ),
  -- Phase 1: Score without lenser_score
  preliminary_scores AS (
    SELECT
      c.id,
      c.lenser_id,
      c.reply_count,
      ttt.language_code AS primary_language,
      log(greatest(1,
        2.0 * coalesce(r.like_count, 0)
      + 3.0 * c.reply_count
      + 0.5 * c.view_count
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5) AS hot_score,
      (
        0.30 * COALESCE((
          SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1)
          FROM content.tag_map tm
          JOIN interest_tags it ON it.tag_id = tm.tag_id
          WHERE tm.entity_type = 'thread' AND tm.entity_id = c.id
        ), 0.0)
        + 0.25 * CASE
            WHEN ttt.language_code = (SELECT preferred_language FROM current_lenser) THEN 1.0
            ELSE 0.0
          END
        + 0.20 * LEAST(
            log(greatest(1,
              2.0 * coalesce(r.like_count, 0)
            + 3.0 * c.reply_count
            + 0.5 * c.view_count
            )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
            / 2.0, 1.0)
        + 0.10 * CASE WHEN fa.following_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS preliminary_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.thread_id = c.id
    LEFT JOIN content.thread_translations ttt ON ttt.thread_id = c.id AND ttt.is_original = true
    LEFT JOIN lensers.follows fa
           ON fa.follower_id  = (SELECT id FROM current_lenser)
          AND fa.following_id = c.lenser_id
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'thread'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
    ORDER BY preliminary_score DESC
    LIMIT LEAST(p_limit, 50) * 2
  ),
  -- Phase 2: Enrich with lenser_score
  candidate_scores AS (
    SELECT
      ps.id,
      ps.reply_count,
      ps.primary_language,
      ps.hot_score,
      (
        ps.preliminary_score
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
      ) AS personal_score
    FROM preliminary_scores ps
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = ps.lenser_id
    ORDER BY personal_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, c.personal_score, c.hot_score, c.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, c.reply_count, v.created_at
FROM candidate_scores c
JOIN public.vw_content_threads_public v ON v.id = c.id
ORDER BY c.personal_score DESC;
$$;


-- ---------------------------------------------------------------------------
-- TIER 2B: Rewrite fn_lensers_get_leaderboard
-- Avoids full vw_lensers_score scan. Ranks by total_xp directly from
-- profiles + xp.totals, then computes lenser_score inline for top N only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_lensers_get_leaderboard(
  p_period text    DEFAULT 'all_time',
  p_limit  integer DEFAULT 20
)
RETURNS TABLE(
  lenser_id    uuid,
  handle       text,
  display_name text,
  avatar_url   text,
  total_xp     bigint,
  current_level integer,
  lenser_score double precision,
  rank         bigint
)
LANGUAGE sql STABLE
SET search_path TO 'public', 'lensers', 'xp', 'content'
AS $$
WITH ranked AS (
  SELECT
    lp.id AS lenser_id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    COALESCE(xt.total_xp, 0)::bigint AS total_xp,
    COALESCE(xt.current_level, 1) AS current_level,
    ROW_NUMBER() OVER (ORDER BY COALESCE(xt.total_xp, 0) DESC) AS rank
  FROM lensers.profiles lp
  LEFT JOIN (
    SELECT t.lenser_id, SUM(t.total_xp) AS total_xp, MAX(t.current_level) AS current_level
    FROM xp.totals t
    GROUP BY t.lenser_id
  ) xt ON xt.lenser_id = lp.id
  WHERE lp.status = 'active'
    AND lp.visibility = 'public'
    AND lp.deletion_requested_at IS NULL
    AND CASE p_period
      WHEN 'weekly'  THEN lp.last_active_at > now() - interval '7 days'
      WHEN 'monthly' THEN lp.last_active_at > now() - interval '30 days'
      ELSE true
    END
  ORDER BY COALESCE(xt.total_xp, 0) DESC
  LIMIT LEAST(p_limit, 100)
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
  SELECT count(*) AS cnt FROM (
    SELECT 1
    FROM content.thread_reactions tr
    JOIN content.threads t ON t.id = tr.thread_id AND t.lenser_id = r.lenser_id
    WHERE tr.created_at > now() - interval '7 days'
    UNION ALL
    SELECT 1
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates pt ON pt.id = pr.prompt_id AND pt.lenser_id = r.lenser_id
    WHERE pr.created_at > now() - interval '7 days'
  ) x
) re7 ON true
ORDER BY r.rank;
$$;


-- ---------------------------------------------------------------------------
-- TIER 2C: Rewrite fn_lensers_get_suggested
-- Get candidates by tag overlap first, then enrich with lenser_score inline.
-- Avoids scanning entire vw_lensers_score.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_lensers_get_suggested(
  p_lenser_id uuid,
  p_limit     integer DEFAULT 10
)
RETURNS TABLE(
  lenser_id         uuid,
  handle            text,
  display_name      text,
  avatar_url        text,
  total_xp          bigint,
  current_level     integer,
  lenser_score      double precision,
  tag_overlap_score double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'content', 'xp'
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
  -- Get top candidates by tag overlap, enriched with profile + XP data
  top_candidates AS (
    SELECT
      lp.id AS lenser_id,
      lp.handle,
      lp.display_name,
      lp.avatar_url,
      COALESCE(xt.total_xp, 0)::bigint AS total_xp,
      COALESCE(xt.current_level, 1) AS current_level,
      COALESCE(agg.tag_overlap_score, 0.0) AS tag_overlap_score
    FROM author_tag_agg agg
    JOIN lensers.profiles lp ON lp.id = agg.lenser_id
    LEFT JOIN (
      SELECT t.lenser_id, SUM(t.total_xp) AS total_xp, MAX(t.current_level) AS current_level
      FROM xp.totals t
      GROUP BY t.lenser_id
    ) xt ON xt.lenser_id = lp.id
    WHERE lp.status = 'active'
      AND lp.visibility = 'public'
      AND lp.deletion_requested_at IS NULL
      AND lp.id <> p_lenser_id
      AND lp.id NOT IN (SELECT following_id FROM already_following)
    ORDER BY agg.tag_overlap_score DESC
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


-- ---------------------------------------------------------------------------
-- TIER 2D: Simplify vw_xp_leaderboard_global
-- Remove dead 'me' CTE (auth.uid() is a user_id, not a lenser_id —
-- it never matched xp.totals.lenser_id). Without the UNION, PostgreSQL
-- can push PostgREST's .range() LIMIT into the window function.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_xp_leaderboard_global AS
WITH ranked AS (
  SELECT
    t.app_id,
    t.lenser_id,
    t.total_xp,
    t.current_level,
    RANK() OVER (PARTITION BY t.app_id ORDER BY t.total_xp DESC, t.lenser_id) AS rank
  FROM xp.totals t
)
SELECT
  r.app_id,
  r.rank,
  r.lenser_id,
  r.total_xp,
  r.current_level,
  jsonb_build_object(
    'display_name', l.display_name,
    'handle', l.handle,
    'avatar_url', l.avatar_url
  ) AS "user"
FROM ranked r
JOIN lensers.profiles l ON l.id = r.lenser_id
WHERE r.rank <= 100;
