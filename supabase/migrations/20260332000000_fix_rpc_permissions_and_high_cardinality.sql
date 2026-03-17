-- Migration: fix_rpc_permissions_and_high_cardinality
-- Purpose:
--   Fix multiple 500 (statement timeout) and 403 (permission denied) errors:
--
--   Root cause: All failing queries either lacked SECURITY DEFINER (trending
--   functions → 403) or materialised the full LATERAL view for 765K+ rows before
--   applying LIMIT (everything else → statement timeout).
--
--   Pattern applied throughout: "candidate-set + late-join"
--     1. Take the N most-recent public rows from the base table (fast partial index).
--     2. Aggregate reactions for only those N rows (indexed FK scan).
--     3. Score / rank within that bounded set.
--     4. Late-join with the expensive LATERAL view for only the final LIMIT rows.
--
--   Personal functions also add a NULL-user early exit so unauthenticated callers
--   receive an empty result instantly instead of running a full scan.
--
-- Depends on: 20260331000000_flat_reaction_counts_and_tags_rpc

BEGIN;

-- =============================================================================
-- 1. fn_content_get_popular_prompts  (NEW)
--    Replaces direct PostgREST ORDER BY reaction_totals->>copy / copy_count.
--    Candidate set: 5K most-recent public prompts (idx_prompt_templates_public_feed).
--    Reaction aggregation: idx_prompt_reactions_prompt_reaction (prompt_id, reaction).
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_popular_prompts"(
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
)
RETURNS TABLE(
  "id"              "uuid",
  "lenser_id"       "uuid",
  "visibility"      "content"."visibility_enum",
  "title"           "text",
  "description"     "text",
  "author_profile"  "jsonb",
  "reaction_totals" "jsonb",
  "copy_count"      integer,
  "like_count"      integer,
  "saved_count"     integer,
  "tags"            "jsonb",
  "created_at"      timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
WITH
  candidates AS (
    SELECT pt.id, pt.created_at
    FROM content.prompt_templates pt
    WHERE pt.visibility = 'public' AND pt.status = 'published'
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
  ranked AS (
    SELECT
      c.id,
      log(greatest(1,
        4.0 * coalesce(r.copy_count,  0)
      + 2.0 * coalesce(r.like_count,  0)
      + 1.0 * coalesce(r.saved_count, 0)
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
        AS hot_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, v.lenser_id, v.visibility, v.title, v.description,
  v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
  v.saved_count, v.tags, v.created_at
FROM ranked rk
JOIN public.vw_prompt_templates_public v ON v.id = rk.id
ORDER BY rk.hot_score DESC;
$$;

REVOKE ALL ON FUNCTION "public"."fn_content_get_popular_prompts"(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_popular_prompts"(integer, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_popular_prompts"(integer, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_popular_prompts"(integer, integer) TO "service_role";


-- =============================================================================
-- 2. fn_content_get_trending_prompts  (REPLACE)
--    Was: SECURITY INVOKER → 403 on content.vw_prompts_hot_scores.
--         Also joined the full view for all rows before LIMIT → timeout.
--    Now: candidate-set approach + SECURITY DEFINER.
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_prompts"(
  "p_lang"   "text"    DEFAULT NULL,
  "p_limit"  integer   DEFAULT 20,
  "p_offset" integer   DEFAULT 0
)
RETURNS TABLE(
  "id"               "uuid",
  "hot_score"        double precision,
  "primary_language" "text",
  "author_profile"   "jsonb",
  "tags"             "jsonb",
  "reaction_totals"  "jsonb",
  "title"            "text",
  "description"      "text",
  "created_at"       timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
WITH
  candidates AS (
    SELECT pt.id, pt.created_at
    FROM content.prompt_templates pt
    WHERE pt.visibility = 'public' AND pt.status = 'published'
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
  scored AS (
    SELECT
      c.id,
      log(greatest(1,
        4.0 * coalesce(r.copy_count,  0)
      + 2.0 * coalesce(r.like_count,  0)
      + 1.0 * coalesce(r.saved_count, 0)
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
        * CASE WHEN p_lang IS NOT NULL AND ptt.language_code = p_lang THEN 1.5 ELSE 1.0 END
        AS hot_score,
      ptt.language_code AS primary_language
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.prompt_translations ptt ON ptt.prompt_id = c.id AND ptt.is_original = true
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT v.id, s.hot_score, s.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.description, v.created_at
FROM scored s
JOIN public.vw_prompt_templates_public v ON v.id = s.id
ORDER BY s.hot_score DESC;
$$;


-- =============================================================================
-- 3. fn_content_get_trending_threads  (REPLACE — symmetric)
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_threads"(
  "p_lang"   "text"    DEFAULT NULL,
  "p_limit"  integer   DEFAULT 20,
  "p_offset" integer   DEFAULT 0
)
RETURNS TABLE(
  "id"               "uuid",
  "hot_score"        double precision,
  "primary_language" "text",
  "author_profile"   "jsonb",
  "tags"             "jsonb",
  "reaction_totals"  "jsonb",
  "title"            "text",
  "reply_count"      integer,
  "created_at"       timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
WITH
  candidates AS (
    SELECT t.id, t.created_at, t.reply_count, t.view_count
    FROM content.threads t
    WHERE t.visibility = 'public' AND t.status = 'published'
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
  scored AS (
    SELECT
      c.id,
      log(greatest(1,
        2.0 * coalesce(r.like_count, 0)
      + 3.0 * c.reply_count
      + 0.5 * c.view_count
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
        * CASE WHEN p_lang IS NOT NULL AND ttt.language_code = p_lang THEN 1.5 ELSE 1.0 END
        AS hot_score,
      ttt.language_code AS primary_language,
      c.reply_count
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.thread_id = c.id
    LEFT JOIN content.thread_translations ttt ON ttt.thread_id = c.id AND ttt.is_original = true
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT v.id, s.hot_score, s.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, s.reply_count, v.created_at
FROM scored s
JOIN public.vw_content_threads_public v ON v.id = s.id
ORDER BY s.hot_score DESC;
$$;


-- =============================================================================
-- 4. fn_content_get_prompts_by_tag  (NEW)
--    Resolves IDs via tag_map (indexed FK), then late-joins with view.
--    Replaces PostgREST .contains('tags', ...) which forces a full-table JSONB scan.
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_prompts_by_tag"(
  "p_tag_slug" "text",
  "p_limit"    integer DEFAULT 20,
  "p_offset"   integer DEFAULT 0
)
RETURNS TABLE(
  "id"              "uuid",
  "lenser_id"       "uuid",
  "visibility"      "content"."visibility_enum",
  "title"           "text",
  "description"     "text",
  "author_profile"  "jsonb",
  "reaction_totals" "jsonb",
  "copy_count"      integer,
  "like_count"      integer,
  "saved_count"     integer,
  "tags"            "jsonb",
  "created_at"      timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS prompt_id
    FROM content.tag_map tm
    JOIN content.tags    tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'prompt_template'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.visibility, v.title, v.description,
    v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
    v.saved_count, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_prompt_templates_public v ON v.id = m.prompt_id
  ORDER BY v.created_at DESC
  LIMIT  LEAST(p_limit,  50)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION "public"."fn_content_get_prompts_by_tag"("text", integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_prompts_by_tag"("text", integer, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_prompts_by_tag"("text", integer, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_prompts_by_tag"("text", integer, integer) TO "service_role";


-- =============================================================================
-- 5. fn_content_get_threads_by_tag  (NEW — symmetric)
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_threads_by_tag"(
  "p_tag_slug" "text",
  "p_limit"    integer DEFAULT 20,
  "p_offset"   integer DEFAULT 0
)
RETURNS TABLE(
  "id"              "uuid",
  "lenser_id"       "uuid",
  "title"           "text",
  "content"         "text",
  "author_profile"  "jsonb",
  "reaction_totals" "jsonb",
  "like_count"      integer,
  "reply_count"     integer,
  "view_count"      integer,
  "visibility"      "content"."visibility_enum",
  "tags"            "jsonb",
  "created_at"      timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers'
AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS thread_id
    FROM content.tag_map tm
    JOIN content.tags    tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'thread'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.title, v.content,
    v.author_profile, v.reaction_totals, v.like_count,
    v.reply_count, v.view_count, v.visibility, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_content_threads_public v ON v.id = m.thread_id
  ORDER BY v.created_at DESC
  LIMIT  LEAST(p_limit,  50)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION "public"."fn_content_get_threads_by_tag"("text", integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_threads_by_tag"("text", integer, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_threads_by_tag"("text", integer, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_threads_by_tag"("text", integer, integer) TO "service_role";


-- =============================================================================
-- 6. fn_content_get_personal_threads  (REPLACE)
--    Old: started FROM vw_content_threads_public (765K rows × LATERAL joins).
--    New: candidate-set from content.threads (5K rows, indexed), reactions
--         aggregated for candidates only, late-join with complex view last.
--    Also: early-exit when auth.uid() is NULL (anon callers get empty result).
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_threads"(
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
)
RETURNS TABLE(
  "id"               "uuid",
  "personal_score"   double precision,
  "hot_score"        double precision,
  "primary_language" "text",
  "author_profile"   "jsonb",
  "tags"             "jsonb",
  "reaction_totals"  "jsonb",
  "title"            "text",
  "reply_count"      integer,
  "created_at"       timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers', 'auth'
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
  -- Fast partial-index scan; guard keeps this empty for anon callers
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
  candidate_scores AS (
    SELECT
      c.id,
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
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
        + 0.10 * CASE WHEN fa.following_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS personal_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.thread_id = c.id
    LEFT JOIN content.thread_translations ttt ON ttt.thread_id = c.id AND ttt.is_original = true
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = c.lenser_id
    LEFT JOIN lensers.follows fa
           ON fa.follower_id  = (SELECT id FROM current_lenser)
          AND fa.following_id = c.lenser_id
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'thread'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
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


-- =============================================================================
-- 7. fn_content_get_personal_prompts  (REPLACE — symmetric)
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_prompts"(
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
)
RETURNS TABLE(
  "id"               "uuid",
  "personal_score"   double precision,
  "hot_score"        double precision,
  "primary_language" "text",
  "author_profile"   "jsonb",
  "tags"             "jsonb",
  "reaction_totals"  "jsonb",
  "title"            "text",
  "description"      "text",
  "created_at"       timestamp with time zone
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers', 'auth'
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
  candidate_scores AS (
    SELECT
      c.id,
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
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
        + 0.10 * CASE WHEN fa.following_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS personal_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.prompt_translations ptt ON ptt.prompt_id = c.id AND ptt.is_original = true
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = c.lenser_id
    LEFT JOIN lensers.follows fa
           ON fa.follower_id  = (SELECT id FROM current_lenser)
          AND fa.following_id = c.lenser_id
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'prompt_template'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
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

COMMIT;
