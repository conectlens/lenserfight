-- Migration: Content Recommendation System — Phase 1 + 2
-- Hot score views for threads/prompts, lenser reputation view, and language-aware trending RPCs.
-- Entirely additive — no existing tables, views, or RPCs are modified.
-- Rollback: DROP VIEW + DROP FUNCTION for each object created here.

-- ──────────────────────────────────────────────────────────────────────────────
-- INDEXES (idempotent — skipped if already exist)
-- ──────────────────────────────────────────────────────────────────────────────

-- Reaction aggregation (GROUP BY)
CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread_id
  ON content.thread_reactions(thread_id);

CREATE INDEX IF NOT EXISTS idx_prompt_reactions_prompt_id
  ON content.prompt_reactions(prompt_id);

-- Recent-reaction filter used in lenser score view
CREATE INDEX IF NOT EXISTS idx_thread_reactions_created_at
  ON content.thread_reactions(created_at);

CREATE INDEX IF NOT EXISTS idx_prompt_reactions_created_at
  ON content.prompt_reactions(created_at);

-- Language lookup for hot score views (partial — only original translations)
CREATE INDEX IF NOT EXISTS idx_thread_translations_original
  ON content.thread_translations(thread_id)
  WHERE is_original = true;

CREATE INDEX IF NOT EXISTS idx_prompt_translations_original
  ON content.prompt_translations(prompt_id)
  WHERE is_original = true;

-- ──────────────────────────────────────────────────────────────────────────────
-- VIEW: content.vw_threads_hot_scores
-- Gravity-based hot score per public thread.
-- Formula: LOG(2×likes + 3×replies + 0.5×views) / (age_hours + 2)^1.5
-- Exponent 1.5 is slightly gentler than Hacker News (1.8), giving forum threads
-- a longer useful lifespan before decay dominates.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW content.vw_threads_hot_scores AS
SELECT
  t.id,
  tt_orig.language_code AS primary_language,
  LOG(
    GREATEST(1,
      2.0 * COALESCE(r.like_count, 0)
      + 3.0 * COALESCE(t.reply_count, 0)
      + 0.5 * COALESCE(t.view_count, 0)
    )
  ) / POW(
    EXTRACT(EPOCH FROM (now() - t.created_at)) / 3600.0 + 2,
    1.5
  ) AS hot_score
FROM content.threads t
LEFT JOIN content.thread_translations tt_orig
  ON tt_orig.thread_id = t.id
  AND tt_orig.is_original = true
LEFT JOIN (
  SELECT
    thread_id,
    COUNT(*) FILTER (WHERE reaction = 'like') AS like_count
  FROM content.thread_reactions
  GROUP BY thread_id
) r ON r.thread_id = t.id
WHERE t.visibility = 'public'::"content"."visibility_enum";

-- ──────────────────────────────────────────────────────────────────────────────
-- VIEW: content.vw_prompts_hot_scores
-- Gravity-based hot score per public prompt.
-- Copy (execution intent) is the primary signal for prompts.
-- Formula: LOG(4×copies + 2×likes + 1×saves) / (age_hours + 2)^1.5
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW content.vw_prompts_hot_scores AS
SELECT
  pt.id,
  ptt_orig.language_code AS primary_language,
  LOG(
    GREATEST(1,
      4.0 * COALESCE(r.copy_count, 0)
      + 2.0 * COALESCE(r.like_count, 0)
      + 1.0 * COALESCE(r.saved_count, 0)
    )
  ) / POW(
    EXTRACT(EPOCH FROM (now() - pt.created_at)) / 3600.0 + 2,
    1.5
  ) AS hot_score
FROM content.prompt_templates pt
LEFT JOIN content.prompt_translations ptt_orig
  ON ptt_orig.prompt_id = pt.id
  AND ptt_orig.is_original = true
LEFT JOIN (
  SELECT
    prompt_id,
    COUNT(*) FILTER (WHERE reaction = 'copy')  AS copy_count,
    COUNT(*) FILTER (WHERE reaction = 'like')  AS like_count,
    COUNT(*) FILTER (WHERE reaction = 'saved') AS saved_count
  FROM content.prompt_reactions
  GROUP BY prompt_id
) r ON r.prompt_id = pt.id
WHERE pt.visibility = 'public'::"content"."visibility_enum";

-- ──────────────────────────────────────────────────────────────────────────────
-- VIEW: lensers.vw_lensers_score
-- Author reputation score combining XP and recent 7-day content engagement.
-- Formula: 0.7 × LOG(xp) + 0.3 × LOG(recent_reactions_7d)
-- Used to boost content by reputable authors and power "Top Lensers" surface.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW lensers.vw_lensers_score AS
SELECT
  lp.id                        AS lenser_id,
  lp.handle,
  lp.display_name,
  lp.avatar_url,
  COALESCE(xt.total_xp, 0)     AS total_xp,
  COALESCE(xt.current_level, 1) AS current_level,
  (
    0.7 * LOG(GREATEST(1, COALESCE(xt.total_xp, 0)::float)) +
    0.3 * LOG(GREATEST(1, COALESCE(re7.recent_reactions, 0)::float))
  )                            AS lenser_score
FROM lensers.profiles lp
LEFT JOIN (
  SELECT lenser_id, SUM(total_xp) AS total_xp, MAX(current_level) AS current_level
  FROM xp.totals
  GROUP BY lenser_id
) xt ON xt.lenser_id = lp.id
LEFT JOIN (
  SELECT lenser_id, COUNT(*) AS recent_reactions
  FROM (
    SELECT t.lenser_id
    FROM content.thread_reactions tr
    JOIN content.threads t ON t.id = tr.thread_id
    WHERE tr.created_at > now() - interval '7 days'
    UNION ALL
    SELECT pt.lenser_id
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates pt ON pt.id = pr.prompt_id
    WHERE pr.created_at > now() - interval '7 days'
  ) all_recent
  GROUP BY lenser_id
) re7 ON re7.lenser_id = lp.id
WHERE lp.status = 'active'::"lensers"."lenser_status"
  AND lp.visibility = 'public'::"lensers"."lenser_visibility"
  AND lp.deletion_requested_at IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_trending_threads
-- Returns public threads sorted by hot_score, with optional language boost.
-- p_lang: ISO 639-1 language code; same-language threads get a ×1.5 boost.
-- p_limit: max rows returned (capped at 50).
-- p_offset: pagination offset.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_threads"(
  "p_lang"   text  DEFAULT NULL,
  "p_limit"  int   DEFAULT 20,
  "p_offset" int   DEFAULT 0
)
RETURNS TABLE(
  id               uuid,
  hot_score        float8,
  primary_language text,
  author_profile   jsonb,
  tags             jsonb,
  reaction_totals  jsonb,
  title            text,
  reply_count      int,
  created_at       timestamptz
)
LANGUAGE "sql"
STABLE
SECURITY INVOKER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
  SELECT
    v.id,
    hs.hot_score * CASE
      WHEN p_lang IS NOT NULL AND hs.primary_language = p_lang THEN 1.5
      ELSE 1.0
    END                          AS hot_score,
    hs.primary_language,
    v.author_profile,
    v.tags,
    v.reaction_totals,
    v.title,
    v.reply_count,
    v.created_at
  FROM public.vw_content_threads_public v
  JOIN content.vw_threads_hot_scores hs ON hs.id = v.id
  ORDER BY 2 DESC
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_trending_threads"(text, int, int) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_content_get_trending_threads"(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_threads"(text, int, int) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_threads"(text, int, int) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_threads"(text, int, int) TO "service_role";

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_trending_prompts
-- Returns public prompts sorted by hot_score, with optional language boost.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_prompts"(
  "p_lang"   text  DEFAULT NULL,
  "p_limit"  int   DEFAULT 20,
  "p_offset" int   DEFAULT 0
)
RETURNS TABLE(
  id               uuid,
  hot_score        float8,
  primary_language text,
  author_profile   jsonb,
  tags             jsonb,
  reaction_totals  jsonb,
  title            text,
  description      text,
  created_at       timestamptz
)
LANGUAGE "sql"
STABLE
SECURITY INVOKER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
  SELECT
    v.id,
    hs.hot_score * CASE
      WHEN p_lang IS NOT NULL AND hs.primary_language = p_lang THEN 1.5
      ELSE 1.0
    END                          AS hot_score,
    hs.primary_language,
    v.author_profile,
    v.tags,
    v.reaction_totals,
    v.title,
    v.description,
    v.created_at
  FROM public.vw_prompt_templates_public v
  JOIN content.vw_prompts_hot_scores hs ON hs.id = v.id
  ORDER BY 2 DESC
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_trending_prompts"(text, int, int) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_content_get_trending_prompts"(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_prompts"(text, int, int) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_prompts"(text, int, int) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_trending_prompts"(text, int, int) TO "service_role";

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_get_trending
-- Returns top Lensers by combined XP + recent engagement score.
-- Powers "Top Lensers" discovery surface.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_trending"(
  "p_limit" int DEFAULT 10
)
RETURNS TABLE(
  lenser_id     uuid,
  handle        text,
  display_name  text,
  avatar_url    text,
  total_xp      bigint,
  current_level int,
  lenser_score  float8
)
LANGUAGE "sql"
STABLE
SECURITY INVOKER
SET "search_path" TO 'public', 'lensers', 'content', 'xp'
AS $$
  SELECT
    lenser_id,
    handle,
    display_name,
    avatar_url,
    total_xp,
    current_level,
    lenser_score
  FROM lensers.vw_lensers_score
  ORDER BY lenser_score DESC
  LIMIT LEAST(p_limit, 50);
$$;

ALTER FUNCTION "public"."fn_lensers_get_trending"(int) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_lensers_get_trending"(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_trending"(int) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_trending"(int) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_trending"(int) TO "service_role";
