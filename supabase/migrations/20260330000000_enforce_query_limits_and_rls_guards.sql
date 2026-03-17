-- Migration: enforce_query_limits_and_rls_guards
-- Purpose:
--   Eliminate N+1 correlated subqueries in all public-facing and auth views.
--   Every view that contained a correlated scalar subquery (executing once per row)
--   is replaced with an equivalent LATERAL join. This allows the query planner to:
--     1. Use indexes on FK columns (thread_id, prompt_id, tag_id, battle_id) for
--        paginated queries — dramatically reducing per-row cost on small result sets.
--     2. Avoid unbounded per-row scans when application code fetches all rows.
--
-- Affected views:
--   content.vw_auth_prompts           — reaction_totals N+1
--   content.vw_auth_threads           — reaction_totals N+1
--   public.vw_content_threads_public  — reaction_totals N+1 + tags N+1 (with nested tag-name N+1)
--   public.vw_prompt_templates_public — reaction_totals N+1 + tags N+1 (with nested tag-name N+1)
--   public.vw_content_thread_replies_public — reaction_totals N+1
--   public.vw_content_tags_public     — tag-name N+1
--   public.vw_tags_public_extended    — tag-name N+1
--   public.vw_tags_public_stats       — tag-name N+1
--   public.vw_battles_public          — contender_count N+1
--   public.vw_battle_health           — contender_count N+1 + submission_count N+1
--
-- Views NOT changed (already safe):
--   content.vw_prompts_hot_scores     — uses a single batch-aggregated subquery (not per-row)
--   content.vw_threads_hot_scores     — same
--   content.vw_tag_cross_lang         — join-only, no correlated subqueries
--   lensers.vw_lensers_score          — batch aggregated subqueries (not per-row)
--   public.vw_auth_lenser             — two-table join, trivial
--   public.vw_lensers_public_recent   — already has LIMIT 5
--   public.vw_xp_leaderboard_global   — already caps at rank <= 100
--   public.vw_xp_leaderboard_season   — already caps at rank <= 100
--   public.vw_battle_funnel           — aggregate-only, returns one row
--   public.vw_battle_participation    — aggregate-only, small result set
--   public.vw_feedback_admin          — admin-only, security_invoker
--   public.vw_feedback_user           — filtered by auth.uid(), returns own rows only
--   public.vw_lensers_social_links_private — filtered by auth.uid()
--   public.vw_lensers_social_links_public  — join-only, no N+1
--   public.vw_ai_models_public        — small static table, ORDER BY name
--
-- Rollback: re-run the view definitions from 20260328000000 and 20260324000000.

BEGIN;

-- =============================================================================
-- 1. content.vw_auth_prompts
--    Base: 20260324000000 (adds status column)
--    Fix:  Replace correlated reaction_totals subquery with LATERAL join.
--    DROP CASCADE required (column list unchanged, but subquery changes).
-- =============================================================================
DROP VIEW IF EXISTS "content"."vw_auth_prompts" CASCADE;

CREATE VIEW "content"."vw_auth_prompts" AS
SELECT
    p.id,
    p.lenser_id,
    p.visibility,
    p.status,
    p.created_at,
    p.updated_at,
    pt.title,
    pt.description,
    pt.content,
    pt.language_code,
    rt.reaction_totals,
    jsonb_build_object(
        'handle',       prof.handle,
        'display_name', prof.display_name,
        'avatar_url',   prof.avatar_url
    ) AS author_profile
FROM content.prompt_templates p
LEFT JOIN lensers.profiles prof
    ON prof.id = p.lenser_id
LEFT JOIN content.prompt_translations pt
    ON pt.prompt_id = p.id AND pt.is_original = true
LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals
    FROM (
        SELECT reaction, count(*)::integer AS cnt
        FROM content.prompt_reactions
        WHERE prompt_id = p.id
        GROUP BY reaction
    ) x
) rt ON true;

ALTER TABLE "content"."vw_auth_prompts" OWNER TO "postgres";

GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "service_role";


-- =============================================================================
-- 2. content.vw_auth_threads
--    Base: 20260324000000 (adds status + prompt_data columns)
--    Fix:  Replace correlated reaction_totals subquery with LATERAL join.
--    DROP CASCADE required.
-- =============================================================================
DROP VIEW IF EXISTS "content"."vw_auth_threads" CASCADE;

CREATE VIEW "content"."vw_auth_threads" AS
SELECT
    t.id,
    t.lenser_id,
    t.visibility,
    t.status,
    t.view_count,
    t.reply_count,
    t.thumbnail_url,
    t.created_at,
    t.updated_at,
    t.prompt_data,
    tt.title,
    tt.content,
    tt.language_code,
    rt.reaction_totals,
    jsonb_build_object(
        'handle',       prof.handle,
        'display_name', prof.display_name,
        'avatar_url',   prof.avatar_url
    ) AS author_profile
FROM content.threads t
LEFT JOIN lensers.profiles prof
    ON prof.id = t.lenser_id
LEFT JOIN content.thread_translations tt
    ON tt.thread_id = t.id AND tt.is_original = true
LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals
    FROM (
        SELECT reaction, count(*)::integer AS cnt
        FROM content.thread_reactions
        WHERE thread_id = t.id
        GROUP BY reaction
    ) x
) rt ON true;

ALTER TABLE "content"."vw_auth_threads" OWNER TO "postgres";

GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "service_role";


-- =============================================================================
-- 3. public.vw_content_threads_public
--    Base: 20260328000000 (adds lenser_id, view_count, visibility columns)
--    Fix:  Replace reaction_totals N+1 and tags N+1 (with nested tag-name N+1)
--          with LATERAL joins.
--    DROP CASCADE required.
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
    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals
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
        SELECT name
        FROM content.tag_translations
        WHERE tag_id = tg.id
        LIMIT 1
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
-- 4. public.vw_prompt_templates_public
--    Base: 20260328000000 (adds visibility column)
--    Fix:  Replace reaction_totals N+1 and tags N+1 (with nested tag-name N+1)
--          with LATERAL joins.
--    DROP CASCADE required.
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
    pt.created_at,
    tg_agg.tags
FROM content.prompt_templates pt
LEFT JOIN content.prompt_translations ptr
    ON ptr.prompt_id = pt.id AND ptr.is_original = true
LEFT JOIN lensers.profiles prof
    ON prof.id = pt.lenser_id
LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals
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
        SELECT name
        FROM content.tag_translations
        WHERE tag_id = tg.id
        LIMIT 1
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
-- 5. public.vw_content_thread_replies_public
--    Base: 20260324000000 (adds status filter + ORDER BY)
--    Fix:  Replace reaction_totals N+1 with LATERAL join.
--    DROP CASCADE required.
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_content_thread_replies_public" CASCADE;

CREATE VIEW "public"."vw_content_thread_replies_public" AS
SELECT
    r.id,
    r.thread_id,
    r.parent_reply_id,
    r.lenser_id,
    r.content,
    r.content_html,
    rt.reaction_totals,
    r.created_at,
    jsonb_build_object(
        'handle',       prof.handle,
        'display_name', prof.display_name,
        'avatar_url',   prof.avatar_url
    ) AS author_profile
FROM content.thread_replies r
JOIN content.threads t
    ON t.id = r.thread_id
LEFT JOIN lensers.profiles prof
    ON prof.id = r.lenser_id
LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) AS reaction_totals
    FROM (
        SELECT reaction, count(*)::integer AS cnt
        FROM content.thread_reply_reactions
        WHERE reply_id = r.id
        GROUP BY reaction
    ) x
) rt ON true
WHERE t.visibility = 'public'::content.visibility_enum
  AND t.status     = 'published'::content.content_status
  AND r.status     = 'published'::content.thread_reply_status
  AND r.deleted_at IS NULL
ORDER BY r.created_at;

ALTER TABLE "public"."vw_content_thread_replies_public" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "service_role";


-- =============================================================================
-- 6. public.vw_content_tags_public
--    Base: 20260321000000
--    Fix:  Replace per-tag correlated name lookup with LATERAL join.
--    CREATE OR REPLACE is safe here (column list preserved).
-- =============================================================================
CREATE OR REPLACE VIEW "public"."vw_content_tags_public" AS
SELECT
    t.id,
    t.slug,
    COALESCE(tn.name, t.slug) AS name,
    t.visibility
FROM content.tags t
LEFT JOIN LATERAL (
    SELECT name
    FROM content.tag_translations
    WHERE tag_id = t.id
    LIMIT 1
) tn ON true
WHERE t.visibility = 'public'::content.tag_visibility_enum;

ALTER TABLE "public"."vw_content_tags_public" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "service_role";


-- =============================================================================
-- 7. public.vw_tags_public_extended
--    Base: 20260321000000
--    Fix:  Replace per-tag correlated name lookup with LATERAL join.
--    CREATE OR REPLACE safe (column list preserved).
-- =============================================================================
CREATE OR REPLACE VIEW "public"."vw_tags_public_extended" AS
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
    COALESCE(tn.name, t.slug) AS name,
    t.created_at,
    'public'::text             AS visibility,
    COALESCE(d.created_total,  0) AS created_count,
    COALESCE(d.viewed_total,   0) AS viewed_count,
    COALESCE(d.reacted_total,  0) AS reacted_count,
    (COALESCE(d.created_total, 0) + COALESCE(d.viewed_total, 0) + COALESCE(d.reacted_total, 0)) AS total_usage,
    COALESCE(r.trend_score_7d, 0) AS trend_score
FROM content.tags t
LEFT JOIN LATERAL (
    SELECT name
    FROM content.tag_translations
    WHERE tag_id = t.id
    LIMIT 1
) tn ON true
LEFT JOIN daily    d ON d.tag_id = t.id
LEFT JOIN recent_7d r ON r.tag_id = t.id
WHERE t.visibility = 'public'::content.tag_visibility_enum;

ALTER TABLE "public"."vw_tags_public_extended" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "service_role";


-- =============================================================================
-- 8. public.vw_tags_public_stats
--    Base: 20260321000000
--    Fix:  Replace per-tag correlated name lookup with LATERAL join.
--    CREATE OR REPLACE safe (column list preserved).
-- =============================================================================
CREATE OR REPLACE VIEW "public"."vw_tags_public_stats" AS
WITH events_filtered AS (
    SELECT e.tag_id,
           e.activity_type,
           e.occurred_at::date AS activity_date
    FROM analytics.tag_activity_events e
    JOIN content.tags t_1
        ON t_1.id = e.tag_id AND t_1.visibility = 'public'::content.tag_visibility_enum
    LEFT JOIN content.prompt_templates p
        ON e.entity_type = 'prompt_template'::content.entity_type_enum AND e.entity_id = p.id
    LEFT JOIN content.threads th
        ON e.entity_type = 'thread'::content.entity_type_enum AND e.entity_id = th.id
    WHERE (e.entity_type = 'prompt_template'::content.entity_type_enum AND p.visibility  = 'public'::content.visibility_enum)
       OR (e.entity_type = 'thread'::content.entity_type_enum           AND th.visibility = 'public'::content.visibility_enum)
), lifetime AS (
    SELECT tag_id,
           count(*) FILTER (WHERE activity_type = 'created') AS created_count,
           count(*) FILTER (WHERE activity_type = 'viewed')  AS viewed_count,
           count(*) FILTER (WHERE activity_type = 'reacted') AS reacted_count
    FROM events_filtered
    GROUP BY tag_id
), recent_7d AS (
    SELECT tag_id,
           sum(
               CASE WHEN activity_type = 'created' THEN 1 ELSE 0 END +
               CASE WHEN activity_type = 'viewed'  THEN 2 ELSE 0 END +
               CASE WHEN activity_type = 'reacted' THEN 3 ELSE 0 END
           ) AS trend_score_7d
    FROM events_filtered
    WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY tag_id
)
SELECT
    t.id,
    t.slug,
    COALESCE(tn.name, t.slug) AS name,
    t.created_at,
    'public'::text             AS visibility,
    COALESCE(l.created_count,  0) AS created_count,
    COALESCE(l.viewed_count,   0) AS viewed_count,
    COALESCE(l.reacted_count,  0) AS reacted_count,
    (COALESCE(l.created_count, 0) + COALESCE(l.viewed_count, 0) + COALESCE(l.reacted_count, 0)) AS total_usage,
    COALESCE(r.trend_score_7d, 0) AS trend_score_7d
FROM content.tags t
LEFT JOIN LATERAL (
    SELECT name
    FROM content.tag_translations
    WHERE tag_id = t.id
    LIMIT 1
) tn ON true
LEFT JOIN lifetime  l ON l.tag_id = t.id
LEFT JOIN recent_7d r ON r.tag_id = t.id
WHERE t.visibility = 'public'::content.tag_visibility_enum;

ALTER TABLE "public"."vw_tags_public_stats" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "service_role";


-- =============================================================================
-- 9. public.vw_battles_public
--    Base: 20260321000000
--    Fix:  Replace per-battle correlated contender_count subquery with LATERAL.
--    CREATE OR REPLACE safe (column list preserved).
-- =============================================================================
CREATE OR REPLACE VIEW "public"."vw_battles_public" AS
SELECT
    b.id,
    b.title,
    b.slug,
    b.status,
    b.creator_lenser_id,
    b.vote_count_a,
    b.vote_count_b,
    b.vote_count_draw,
    b.created_at,
    b.updated_at,
    cc.contender_count
FROM battles.battles b
LEFT JOIN LATERAL (
    SELECT count(*) AS contender_count
    FROM battles.contenders c
    WHERE c.battle_id = b.id
) cc ON true
WHERE b.status = ANY (ARRAY[
    'voting'::battles.battle_status_enum,
    'scoring'::battles.battle_status_enum,
    'closed'::battles.battle_status_enum,
    'published'::battles.battle_status_enum
])
  AND b.deleted_at IS NULL;

ALTER TABLE "public"."vw_battles_public" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_battles_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_battles_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battles_public" TO "service_role";


-- =============================================================================
-- 10. public.vw_battle_health
--     Base: 20260321000000
--     Fix:  Replace per-battle correlated contender_count and submission_count
--           subqueries with LATERAL joins.
--     CREATE OR REPLACE safe (column list preserved).
-- =============================================================================
CREATE OR REPLACE VIEW "public"."vw_battle_health" AS
SELECT
    b.id,
    b.title,
    b.slug,
    b.status,
    b.created_at,
    b.voting_opens_at,
    b.voting_closes_at,
    b.finalized_at,
    b.published_at,
    b.vote_count_a,
    b.vote_count_b,
    b.vote_count_draw,
    (b.vote_count_a + b.vote_count_b + b.vote_count_draw) AS total_votes,
    CASE
        WHEN (b.vote_count_a + b.vote_count_b + b.vote_count_draw) >= 5 THEN 'confident'
        WHEN (b.vote_count_a + b.vote_count_b + b.vote_count_draw) >= 3 THEN 'moderate'
        ELSE 'low'
    END AS confidence_level,
    b.winner_contender_id,
    cc.contender_count,
    sc.submission_count,
    CASE
        WHEN b.finalized_at IS NOT NULL AND b.created_at IS NOT NULL
            THEN EXTRACT(epoch FROM (b.finalized_at - b.created_at)) / 3600.0
        ELSE NULL
    END AS hours_to_finalize
FROM battles.battles b
LEFT JOIN LATERAL (
    SELECT count(*) AS contender_count
    FROM battles.contenders c
    WHERE c.battle_id = b.id
) cc ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS submission_count
    FROM battles.submissions s
    WHERE s.battle_id = b.id
      AND s.status    = 'submitted'::battles.submission_status_enum
) sc ON true
WHERE b.deleted_at IS NULL;

ALTER TABLE "public"."vw_battle_health" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."vw_battle_health" TO "anon";
GRANT ALL ON TABLE "public"."vw_battle_health" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battle_health" TO "service_role";


COMMIT;

-- =============================================================================
-- ROLLBACK SCRIPT (apply manually — do NOT auto-apply)
-- =============================================================================
-- BEGIN;
--
-- -- Re-run the CREATE VIEW blocks from:
-- --   20260324000000_fix_visibility_status_and_enum.sql  (sections 4–6 for auth views + replies)
-- --   20260328000000_expose_missing_view_columns.sql     (sections 1–2 for threads/prompts public)
-- --   20260321000000_phase2_status_model.sql             (sections for battles, tags)
-- -- Then re-apply all GRANT statements from those migrations.
--
-- COMMIT;
