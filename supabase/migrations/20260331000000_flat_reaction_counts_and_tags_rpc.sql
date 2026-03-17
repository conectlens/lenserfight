-- Migration: flat_reaction_counts_and_tags_rpc
-- Purpose:
--   1. Add flat integer columns (copy_count, like_count, saved_count) to
--      vw_prompt_templates_public so PostgREST can order by them without JSONB
--      key extraction — eliminates full-table-scan + sort on reaction_totals->>'copy'.
--   2. Add like_count to vw_content_threads_public for symmetric ordering support.
--   3. Add composite index on content.prompt_reactions(prompt_id, reaction) and
--      content.thread_reactions(thread_id, reaction) so LATERAL reaction aggregations
--      use index-only scans instead of sequential scans on the reactions tables.
--   4. Add list_tags_stats(p_lang, p_limit, p_offset) RPC that replaces direct
--      vw_tags_public_stats queries — enforces a row cap (default 50) and resolves
--      tag names in the caller's preferred language with fallback to any translation.
--
-- Root cause for statement timeouts:
--   ?order=reaction_totals->>copy.desc forces the planner to materialise reaction_totals
--   for every row before sorting — no index path exists for JSONB key extraction.
--   Flat integer columns eliminate this: PostgREST emits ORDER BY copy_count DESC
--   which the planner CAN satisfy via an index on the underlying data.
--
-- Depends on: 20260330000000_enforce_query_limits_and_rls_guards

BEGIN;

-- =============================================================================
-- 0. Indexes — fast LATERAL reaction aggregation via index-only scans
-- =============================================================================

-- Prompt reactions: (prompt_id, reaction) → supports GROUP BY prompt_id, reaction
CREATE INDEX IF NOT EXISTS "idx_prompt_reactions_prompt_reaction"
    ON "content"."prompt_reactions" ("prompt_id", "reaction");

-- Thread reactions: (thread_id, reaction) → supports GROUP BY thread_id, reaction
CREATE INDEX IF NOT EXISTS "idx_thread_reactions_thread_reaction"
    ON "content"."thread_reactions" ("thread_id", "reaction");

-- Thread reply reactions: (reply_id, reaction)
CREATE INDEX IF NOT EXISTS "idx_thread_reply_reactions_reply_reaction"
    ON "content"."thread_reply_reactions" ("reply_id", "reaction");

-- Tag translations: (tag_id) → speeds up LATERAL name lookup
CREATE INDEX IF NOT EXISTS "idx_tag_translations_tag_id"
    ON "content"."tag_translations" ("tag_id");

-- Tag map: (entity_type, entity_id) → used by LATERAL tags aggregation
CREATE INDEX IF NOT EXISTS "idx_tag_map_entity"
    ON "content"."tag_map" ("entity_type", "entity_id");

-- Prompt templates: covering index for list queries filtered by visibility+status
CREATE INDEX IF NOT EXISTS "idx_prompt_templates_public_feed"
    ON "content"."prompt_templates" ("visibility", "status", "created_at" DESC)
    WHERE "visibility" = 'public' AND "status" = 'published';

-- Threads: covering index for list queries filtered by visibility+status
CREATE INDEX IF NOT EXISTS "idx_threads_public_feed"
    ON "content"."threads" ("visibility", "status", "created_at" DESC)
    WHERE "visibility" = 'public' AND "status" = 'published';


-- =============================================================================
-- 1. public.vw_prompt_templates_public — add flat reaction count columns
--    Base: 20260330000000 (LATERAL reaction aggregation, all columns from 20260328)
--    Change: expand LATERAL to also produce copy_count, like_count, saved_count
--            as plain integers alongside the existing reaction_totals JSONB.
--    DROP CASCADE required (new columns added).
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_prompt_templates_public" CASCADE;

CREATE VIEW "public"."vw_prompt_templates_public" AS
SELECT
    pt.id,
    pt.lenser_id,
    pt.visibility,
    COALESCE(ptr.title, 'Untitled'::text) AS title,
    ptr.description,
    COALESCE(ptr.content, ''::text)       AS content,
    jsonb_build_object(
        'id',           prof.id,
        'handle',       prof.handle,
        'display_name', prof.display_name,
        'avatar_url',   prof.avatar_url
    ) AS author_profile,
    rt.reaction_totals,
    rt.copy_count,
    rt.like_count,
    rt.saved_count,
    pt.created_at,
    tg_agg.tags
FROM content.prompt_templates pt
LEFT JOIN content.prompt_translations ptr
    ON ptr.prompt_id = pt.id AND ptr.is_original = true
LEFT JOIN lensers.profiles prof
    ON prof.id = pt.lenser_id
LEFT JOIN LATERAL (
    SELECT
        COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals,
        COALESCE(SUM(CASE WHEN reaction = 'copy'  THEN cnt ELSE 0 END)::int, 0) AS copy_count,
        COALESCE(SUM(CASE WHEN reaction = 'like'  THEN cnt ELSE 0 END)::int, 0) AS like_count,
        COALESCE(SUM(CASE WHEN reaction = 'saved' THEN cnt ELSE 0 END)::int, 0) AS saved_count
    FROM (
        SELECT reaction, count(*)::integer AS cnt
        FROM content.prompt_reactions
        WHERE prompt_id = pt.id
        GROUP BY reaction
    ) x
) rt ON true
LEFT JOIN LATERAL (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'id',   tg.id,
            'slug', tg.slug,
            'name', COALESCE(tn.name, tg.slug)
        )),
        '[]'::jsonb
    ) AS tags
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id
    LEFT JOIN LATERAL (
        SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1
    ) tn ON true
    WHERE tm.entity_type = 'prompt_template'::content.entity_type_enum
      AND tm.entity_id   = pt.id
) tg_agg ON true
WHERE pt.visibility = 'public'::content.visibility_enum
  AND pt.status     = 'published'::content.content_status;

ALTER TABLE "public"."vw_prompt_templates_public" OWNER TO "postgres";

GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "anon";
GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "authenticated";
GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "service_role";


-- =============================================================================
-- 2. public.vw_content_threads_public — add flat like_count column
--    Base: 20260330000000
--    Change: expand LATERAL to produce like_count integer.
--    DROP CASCADE required (new column added).
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_content_threads_public" CASCADE;

CREATE VIEW "public"."vw_content_threads_public" AS
SELECT
    t.id,
    t.lenser_id,
    COALESCE(tt.title, 'Untitled'::text) AS title,
    COALESCE(tt.content, ''::text)       AS content,
    jsonb_build_object(
        'handle',       prof.handle,
        'display_name', prof.display_name,
        'avatar_url',   prof.avatar_url
    ) AS author_profile,
    rt.reaction_totals,
    rt.like_count,
    t.reply_count,
    t.view_count,
    t.created_at,
    t.thumbnail_url,
    t.prompt_data,
    t.visibility,
    tg_agg.tags
FROM content.threads t
LEFT JOIN content.thread_translations tt
    ON tt.thread_id = t.id AND tt.is_original = true
LEFT JOIN lensers.profiles prof
    ON prof.id = t.lenser_id
LEFT JOIN LATERAL (
    SELECT
        COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals,
        COALESCE(SUM(CASE WHEN reaction = 'like' THEN cnt ELSE 0 END)::int, 0) AS like_count
    FROM (
        SELECT reaction, count(*)::integer AS cnt
        FROM content.thread_reactions
        WHERE thread_id = t.id
        GROUP BY reaction
    ) x
) rt ON true
LEFT JOIN LATERAL (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'id',   tg.id,
            'slug', tg.slug,
            'name', COALESCE(tn.name, tg.slug)
        )),
        '[]'::jsonb
    ) AS tags
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id
    LEFT JOIN LATERAL (
        SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1
    ) tn ON true
    WHERE tm.entity_type = 'thread'::content.entity_type_enum
      AND tm.entity_id   = t.id
) tg_agg ON true
WHERE t.visibility = 'public'::content.visibility_enum
  AND t.status     = 'published'::content.content_status;

ALTER TABLE "public"."vw_content_threads_public" OWNER TO "postgres";

GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "anon";
GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "authenticated";
GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "service_role";


-- =============================================================================
-- 3. list_tags_stats RPC
--    Replaces direct queries against vw_tags_public_stats.
--    Enforces:
--      - Row cap (default 50, max 100)
--      - Language-aware name resolution: tries p_lang first, falls back to any
--        available translation, then falls back to slug
--      - Ordering: trend_score_7d DESC NULLS LAST, then total_usage DESC
--    Usage (PostgREST):
--      POST /rest/v1/rpc/list_tags_stats
--      {"p_lang": "en", "p_limit": 50, "p_offset": 0}
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."list_tags_stats"(
    "p_lang"   text DEFAULT 'en',
    "p_limit"  int  DEFAULT 50,
    "p_offset" int  DEFAULT 0
)
RETURNS TABLE (
    "id"            uuid,
    "slug"          text,
    "name"          text,
    "language_code" text,
    "created_at"    timestamptz,
    "created_count" bigint,
    "viewed_count"  bigint,
    "reacted_count" bigint,
    "total_usage"   bigint,
    "trend_score"   bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, content, analytics
AS $$
WITH daily AS (
    SELECT tag_id,
           sum(created_count) AS created_total,
           sum(viewed_count)  AS viewed_total,
           sum(reacted_count) AS reacted_total
    FROM analytics.tag_activity_daily
    GROUP BY tag_id
), recent_7d AS (
    SELECT tag_id,
           sum(
               (created_count * 1) +
               (viewed_count  * 2) +
               (reacted_count * 3)
           ) AS trend_score_7d
    FROM analytics.tag_activity_daily
    WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY tag_id
)
SELECT
    t.id,
    t.slug,
    COALESCE(tn_lang.name, tn_any.name, t.slug) AS name,
    COALESCE(tn_lang.lang, tn_any.lang, 'slug')  AS language_code,
    t.created_at,
    COALESCE(d.created_total,  0) AS created_count,
    COALESCE(d.viewed_total,   0) AS viewed_count,
    COALESCE(d.reacted_total,  0) AS reacted_count,
    (COALESCE(d.created_total, 0) + COALESCE(d.viewed_total, 0) + COALESCE(d.reacted_total, 0)) AS total_usage,
    COALESCE(r.trend_score_7d, 0) AS trend_score
FROM content.tags t
LEFT JOIN LATERAL (
    SELECT name, language_code AS lang
    FROM content.tag_translations
    WHERE tag_id       = t.id
      AND language_code = p_lang
    LIMIT 1
) tn_lang ON true
LEFT JOIN LATERAL (
    SELECT name, language_code AS lang
    FROM content.tag_translations
    WHERE tag_id = t.id
    LIMIT 1
) tn_any ON true
LEFT JOIN daily    d ON d.tag_id = t.id
LEFT JOIN recent_7d r ON r.tag_id = t.id
WHERE t.visibility = 'public'::content.tag_visibility_enum
ORDER BY trend_score_7d DESC NULLS LAST, total_usage DESC
LIMIT  LEAST(p_limit, 100)
OFFSET p_offset;
$$;

ALTER FUNCTION "public"."list_tags_stats"("p_lang" text, "p_limit" int, "p_offset" int)
    OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_tags_stats"("p_lang" text, "p_limit" int, "p_offset" int)
    TO "anon", "authenticated", "service_role";

COMMENT ON FUNCTION "public"."list_tags_stats"("p_lang" text, "p_limit" int, "p_offset" int) IS
'Returns top N public tags ordered by 7-day trend score.
Language resolution: tries p_lang first, falls back to any available translation, then slug.
Row cap: min(p_limit, 100). Default: top 50 tags in "en".';


COMMIT;

-- =============================================================================
-- ROLLBACK SCRIPT (apply manually — do NOT auto-apply)
-- =============================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS "public"."list_tags_stats"(text, int, int);
-- -- Re-run vw_prompt_templates_public from 20260330000000 (without flat count cols)
-- -- Re-run vw_content_threads_public from 20260330000000 (without flat count col)
-- -- DROP INDEX IF EXISTS idx_prompt_reactions_prompt_reaction;
-- -- DROP INDEX IF EXISTS idx_thread_reactions_thread_reaction;
-- -- DROP INDEX IF EXISTS idx_thread_reply_reactions_reply_reaction;
-- -- DROP INDEX IF EXISTS idx_tag_translations_tag_id;
-- -- DROP INDEX IF EXISTS idx_tag_map_entity;
-- -- DROP INDEX IF EXISTS idx_prompt_templates_public_feed;
-- -- DROP INDEX IF EXISTS idx_threads_public_feed;
-- COMMIT;
