-- Migration: fix_identity_enforcement
-- Purpose: Eliminate client-side identity injection:
--   1. Force user_id := auth.uid() via BEFORE INSERT triggers on reaction tables
--   2. Remove p_lenser_id parameter from personal feed RPCs; resolve from auth.uid() internally

-- ============================================================
-- 1. Reaction tables: enforce user_id via trigger
-- ============================================================

CREATE OR REPLACE FUNCTION "content"."set_reaction_user_id"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'content', 'auth'
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "content"."set_reaction_user_id"() OWNER TO "postgres";

CREATE TRIGGER "trg_set_reaction_user_id"
  BEFORE INSERT ON "content"."thread_reactions"
  FOR EACH ROW EXECUTE FUNCTION "content"."set_reaction_user_id"();

CREATE TRIGGER "trg_set_reaction_user_id"
  BEFORE INSERT ON "content"."prompt_reactions"
  FOR EACH ROW EXECUTE FUNCTION "content"."set_reaction_user_id"();

CREATE TRIGGER "trg_set_reaction_user_id"
  BEFORE INSERT ON "content"."thread_reply_reactions"
  FOR EACH ROW EXECUTE FUNCTION "content"."set_reaction_user_id"();

-- ============================================================
-- 2. fn_content_get_personal_threads: remove p_lenser_id
--    Resolve the caller's lenser from auth.uid() internally.
-- ============================================================

DROP FUNCTION IF EXISTS "public"."fn_content_get_personal_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer);

CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_threads"(
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
) RETURNS TABLE(
  "id"             "uuid",
  "personal_score" double precision,
  "hot_score"      double precision,
  "primary_language" "text",
  "author_profile" "jsonb",
  "tags"           "jsonb",
  "reaction_totals" "jsonb",
  "title"          "text",
  "reply_count"    integer,
  "created_at"     timestamp with time zone
)
  LANGUAGE "sql" STABLE
  SET "search_path" TO 'public', 'content', 'lensers'
AS $$
WITH
  v_lenser_id AS (
    SELECT lensers.get_auth_lenser_id() AS id
  ),
  user_pref AS (
    SELECT preferred_language, user_id
    FROM lensers.profiles
    WHERE id = (SELECT id FROM v_lenser_id)
  ),
  -- Explicitly followed tags + cross-language equivalents + recent reaction tags
  interest_tags AS (
    -- Directly followed
    SELECT tag_id
    FROM lensers.tag_follows
    WHERE lenser_id = (SELECT id FROM v_lenser_id)
    UNION
    -- Cross-language equivalents of directly followed tags
    SELECT xcl.equivalent_tag_id AS tag_id
    FROM lensers.tag_follows      tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM v_lenser_id)
    UNION
    -- Tags inferred from recent thread reactions
    SELECT DISTINCT tm.tag_id
    FROM content.thread_reactions tr
    JOIN content.threads           t2 ON t2.id = tr.thread_id
    JOIN content.tag_map           tm ON tm.entity_id = t2.id
                                      AND tm.entity_type = 'thread'
    WHERE tr.user_id    = (SELECT user_id FROM user_pref)
      AND tr.created_at > now() - interval '30 days'
  ),
  thread_tag_sim AS (
    SELECT
      tm.entity_id                                                        AS thread_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'thread'
    GROUP BY tm.entity_id
  ),
  -- Threads with 3+ distinct reporters are excluded (quality filter)
  reported_threads AS (
    SELECT target_id
    FROM content.reports
    WHERE target_type = 'thread'::"content"."entity_type_enum"
    GROUP BY target_id
    HAVING COUNT(DISTINCT reporter_id) >= 3
  ),
  followed_authors AS (
    SELECT following_id AS lenser_id
    FROM lensers.follows
    WHERE follower_id = (SELECT id FROM v_lenser_id)
  )
SELECT
  v.id,
  (
    0.30 * COALESCE(ts.tag_sim, 0.0)
    + 0.25 * CASE
        WHEN hs.primary_language = (SELECT preferred_language FROM user_pref) THEN 1.0
        ELSE 0.0
      END
    + 0.20 * LEAST(hs.hot_score / 2.0, 1.0)
    + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
    + 0.10 * CASE WHEN fa.lenser_id IS NOT NULL THEN 1.0 ELSE 0.0 END
  )                                                                  AS personal_score,
  hs.hot_score,
  hs.primary_language,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.reply_count,
  v.created_at
FROM public.vw_content_threads_public       v
JOIN content.vw_threads_hot_scores           hs ON hs.id = v.id
LEFT JOIN thread_tag_sim                     ts ON ts.thread_id = v.id
LEFT JOIN lensers.vw_lensers_score           ls ON ls.lenser_id = (v.author_profile->>'id')::uuid
LEFT JOIN followed_authors                   fa ON fa.lenser_id = (v.author_profile->>'id')::uuid
WHERE v.id NOT IN (SELECT target_id FROM reported_threads)
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) TO "service_role";

-- ============================================================
-- 3. fn_content_get_personal_prompts: remove p_lenser_id
--    Resolve the caller's lenser from auth.uid() internally.
-- ============================================================

DROP FUNCTION IF EXISTS "public"."fn_content_get_personal_prompts"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer);

CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_prompts"(
  "p_limit"  integer DEFAULT 20,
  "p_offset" integer DEFAULT 0
) RETURNS TABLE(
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
  LANGUAGE "sql" STABLE
  SET "search_path" TO 'public', 'content', 'lensers'
AS $$
WITH
  v_lenser_id AS (
    SELECT lensers.get_auth_lenser_id() AS id
  ),
  user_pref AS (
    SELECT preferred_language, user_id
    FROM lensers.profiles
    WHERE id = (SELECT id FROM v_lenser_id)
  ),
  interest_tags AS (
    SELECT tag_id
    FROM lensers.tag_follows
    WHERE lenser_id = (SELECT id FROM v_lenser_id)
    UNION
    SELECT xcl.equivalent_tag_id AS tag_id
    FROM lensers.tag_follows       tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM v_lenser_id)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates  pt2 ON pt2.id = pr.prompt_id
    JOIN content.tag_map           tm  ON tm.entity_id = pt2.id
                                       AND tm.entity_type = 'prompt_template'
    WHERE pr.user_id    = (SELECT user_id FROM user_pref)
      AND pr.created_at > now() - interval '30 days'
  ),
  prompt_tag_sim AS (
    SELECT
      tm.entity_id                                                        AS prompt_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'prompt_template'
    GROUP BY tm.entity_id
  ),
  reported_prompts AS (
    SELECT target_id
    FROM content.reports
    WHERE target_type = 'prompt_template'::"content"."entity_type_enum"
    GROUP BY target_id
    HAVING COUNT(DISTINCT reporter_id) >= 3
  ),
  followed_authors AS (
    SELECT following_id AS lenser_id
    FROM lensers.follows
    WHERE follower_id = (SELECT id FROM v_lenser_id)
  )
SELECT
  v.id,
  (
    0.30 * COALESCE(ps.tag_sim, 0.0)
    + 0.25 * CASE
        WHEN hs.primary_language = (SELECT preferred_language FROM user_pref) THEN 1.0
        ELSE 0.0
      END
    + 0.20 * LEAST(hs.hot_score / 2.0, 1.0)
    + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
    + 0.10 * CASE WHEN fa.lenser_id IS NOT NULL THEN 1.0 ELSE 0.0 END
  )                                                                  AS personal_score,
  hs.hot_score,
  hs.primary_language,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.description,
  v.created_at
FROM public.vw_prompt_templates_public       v
JOIN content.vw_prompts_hot_scores            hs ON hs.id = v.id
LEFT JOIN prompt_tag_sim                      ps ON ps.prompt_id = v.id
LEFT JOIN lensers.vw_lensers_score            ls ON ls.lenser_id = (v.author_profile->>'id')::uuid
LEFT JOIN followed_authors                    fa ON fa.lenser_id = (v.author_profile->>'id')::uuid
WHERE v.id NOT IN (SELECT target_id FROM reported_prompts)
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_prompts"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_prompts"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_prompts"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_prompts"("p_limit" integer, "p_offset" integer) TO "service_role";
