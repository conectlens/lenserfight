-- Fix 1: fn_content_get_trending_threads referenced content.thread_reactions
-- which no longer exists (replaced by the unified content.reactions table).
-- Rewrite reaction_agg CTE to use content.reactions WHERE entity_type = 'thread'.
--
-- Fix 2: fn_xp_get_summary had an ambiguous column reference "total_xp" because
-- the inner subquery alias "t" and the RETURNS TABLE both declare total_xp.
-- Rename the inner subquery alias to avoid the collision.

CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_threads"(
  "p_lang"   text    DEFAULT NULL,
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
) RETURNS TABLE(
  "id"              uuid,
  "hot_score"       double precision,
  "primary_language" text,
  "author_profile"  jsonb,
  "tags"            jsonb,
  "reaction_totals" jsonb,
  "title"           text,
  "reply_count"     integer,
  "created_at"      timestamptz
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'content', 'lensers'
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
    SELECT r.entity_id AS thread_id,
      count(*) FILTER (WHERE r.reaction = 'like'::content.reaction_enum) AS like_count
    FROM content.reactions r
    WHERE r.entity_type = 'thread'::content.entity_type_enum
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  scored AS (
    SELECT
      c.id,
      log(greatest(1,
        2.0 * coalesce(ra.like_count, 0)
      + 3.0 * c.reply_count
      + 0.5 * c.view_count
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
        * CASE WHEN p_lang IS NOT NULL AND ttt.language_code = p_lang THEN 1.5 ELSE 1.0 END
        AS hot_score,
      ttt.language_code AS primary_language,
      c.reply_count
    FROM candidates c
    LEFT JOIN reaction_agg ra ON ra.thread_id = c.id
    LEFT JOIN content.entity_translations ttt ON ttt.entity_id = c.id AND ttt.entity_type = 'thread'::content.entity_type_enum AND ttt.is_original = true
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


CREATE OR REPLACE FUNCTION "public"."fn_xp_get_summary"(
  "p_lenser_id" uuid DEFAULT NULL,
  "p_app_id"    uuid DEFAULT NULL
) RETURNS TABLE(
  "total_xp"      bigint,
  "current_level" integer,
  "app_id"        uuid,
  "min_total_xp"  bigint,
  "max_total_xp"  bigint
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'xp', 'lensers', 'auth'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  IF p_lenser_id IS NULL THEN
    SELECT id INTO v_lenser_id FROM lensers.profiles WHERE user_id = auth.uid();
  ELSE
    v_lenser_id := p_lenser_id;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(xrow.row_total_xp, 0)::bigint,
    COALESCE(xrow.row_level, 1),
    COALESCE(xrow.row_app_id, '00000000-0000-0000-0000-000000000001'::uuid),
    COALESCE(l.min_total_xp, 0)::bigint,
    l.max_total_xp::bigint
  FROM (
    SELECT xt.total_xp AS row_total_xp,
           xt.current_level AS row_level,
           xt.app_id AS row_app_id
    FROM xp.totals xt
    WHERE xt.lenser_id = v_lenser_id
      AND (p_app_id IS NULL OR xt.app_id = p_app_id)
    LIMIT 1
  ) xrow
  LEFT JOIN xp.levels l
    ON l.app_id = COALESCE(xrow.row_app_id, '00000000-0000-0000-0000-000000000001'::uuid)
   AND l.level  = COALESCE(xrow.row_level, 1);
END;
$$;
