-- Migration: performance_indexes_and_author_handle
-- Purpose:
--   Address the top five slow-query groups from the Supabase performance advisor:
--
--   1. vw_prompt_templates_public / vw_content_threads_public with
--      author_profile->>'handle' filter (~1700 ms / ~2645 ms).
--      Root cause: JSONB operator on a computed view column forces a full view
--      materialisation before filtering; no index path exists.
--      Fix: add `lenser_handle` (text) as a direct column in both views so the
--      planner can push `WHERE prof.handle = $1` into the base-table join and use
--      idx_profiles_handle.
--
--   2. fn_lensers_get_leaderboard low buffer-cache hit rate (26.8%, ~1057 ms).
--      Root cause: vw_lensers_score scans all thread_reactions / prompt_reactions
--      with a dynamic 7-day window; no index exists on created_at in those tables.
--      Fix: add created_at DESC indexes on both reaction tables, covering indexes
--      on xp.totals, and a last_active_at partial index on lensers.profiles for
--      weekly/monthly leaderboard filtering.
--
--   3. fn_content_get_personal_threads / fn_content_get_personal_prompts (~865 ms).
--      Root cause: the interest_tags CTE does a full scan of thread_reactions /
--      prompt_reactions filtered by user_id + date; the exclusion subquery on
--      content.reports lacks an index; lensers.tag_follows has no covering index.
--      Fix: add user_id + created_at indexes on reaction tables, a partial index on
--      tag_follows, and a composite index on reports.
--
--   4. is_original = true lookups in translations tables are unindexed.
--      Fix: add partial indexes on thread_translations and prompt_translations.
--
--   5. list_tags_stats CTE scans analytics.tag_activity_daily without date/tag index.
--      Fix: add composite indexes for both the full-table aggregation and the
--      7-day window scan.
--
-- New indexes: 15
-- View columns added: lenser_handle (text) on both public views
-- Grants: re-applied after DROP CASCADE
--
-- Depends on: 20260332000000_fix_rpc_permissions_and_high_cardinality

BEGIN;

-- =============================================================================
-- 1. PROFILE INDEXES
-- =============================================================================

-- Handle lookup: critical for author_profile JSONB filter pushdown.
-- When the view exposes lenser_handle as a plain text column, the planner can
-- rewrite the predicate to prof.handle = $1 and use this index, then do a
-- nested-loop join into content.prompt_templates / content.threads via lenser_id.
CREATE INDEX IF NOT EXISTS idx_profiles_handle
    ON lensers.profiles (handle)
    WHERE deletion_requested_at IS NULL;

-- Last-active-at: used by fn_lensers_get_leaderboard for weekly / monthly periods.
-- Partial index restricts scan to the active, visible lenser set.
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at
    ON lensers.profiles (last_active_at DESC NULLS LAST)
    WHERE status = 'active'
      AND visibility = 'public'
      AND deletion_requested_at IS NULL;


-- =============================================================================
-- 2. XP.TOTALS COVERING INDEX
-- =============================================================================

-- vw_lensers_score groups xp.totals by lenser_id and takes SUM(total_xp) /
-- MAX(current_level). Without an index the planner does a sequential scan.
CREATE INDEX IF NOT EXISTS idx_xp_totals_lenser_id
    ON xp.totals (lenser_id, total_xp, current_level);


-- =============================================================================
-- 3. REACTION TIMESTAMP INDEXES
-- =============================================================================

-- Thread reactions: 7-day window scan in vw_lensers_score.
-- Including thread_id allows an index-only path when the planner joins with threads.
CREATE INDEX IF NOT EXISTS idx_thread_reactions_created_at
    ON content.thread_reactions (created_at DESC, thread_id);

-- Prompt reactions: symmetric.
CREATE INDEX IF NOT EXISTS idx_prompt_reactions_created_at
    ON content.prompt_reactions (created_at DESC, prompt_id);

-- Thread reactions by user + date: interest_tags CTE in fn_content_get_personal_threads.
-- The CTE filters WHERE user_id = $1 AND created_at > now() - 30 days — this index
-- satisfies both predicates with an index range scan.
CREATE INDEX IF NOT EXISTS idx_thread_reactions_user_created
    ON content.thread_reactions (user_id, created_at DESC);

-- Prompt reactions by user + date: symmetric for fn_content_get_personal_prompts.
CREATE INDEX IF NOT EXISTS idx_prompt_reactions_user_created
    ON content.prompt_reactions (user_id, created_at DESC);


-- =============================================================================
-- 4. TRANSLATION ORIGINAL PARTIAL INDEXES
-- =============================================================================

-- Thread translations: every trending/personal query joins ON is_original = true.
-- The partial index eliminates all non-original rows from the scan.
CREATE INDEX IF NOT EXISTS idx_thread_translations_thread_original
    ON content.thread_translations (thread_id)
    WHERE is_original = true;

-- Prompt translations: symmetric.
CREATE INDEX IF NOT EXISTS idx_prompt_translations_prompt_original
    ON content.prompt_translations (prompt_id)
    WHERE is_original = true;


-- =============================================================================
-- 5. LENSER CONTENT INDEXES (profile-page author-filtered listings)
-- =============================================================================

-- Threads by author: feeds the profile-page thread list when filtered by lenser_id.
-- Partial on public + published so the planner skips private / draft rows.
CREATE INDEX IF NOT EXISTS idx_threads_lenser_id_created
    ON content.threads (lenser_id, created_at DESC)
    WHERE visibility = 'public'
      AND status = 'published';

-- Prompt templates by author: symmetric.
CREATE INDEX IF NOT EXISTS idx_prompt_templates_lenser_id_created
    ON content.prompt_templates (lenser_id, created_at DESC)
    WHERE visibility = 'public'
      AND status = 'published';


-- =============================================================================
-- 6. PERSONALIZATION INDEXES
-- =============================================================================

-- Tag follows by lenser: interest_tags CTE does WHERE lenser_id = $1 — covering index
-- over (lenser_id, tag_id) satisfies this with an index-only scan.
CREATE INDEX IF NOT EXISTS idx_tag_follows_lenser_id
    ON lensers.tag_follows (lenser_id, tag_id);

-- Reports target lookup: the personal-feed exclusion subquery groups by target_id and
-- filters by target_type. This index supports both predicates and the GROUP BY.
CREATE INDEX IF NOT EXISTS idx_reports_target_type_id
    ON content.reports (target_type, target_id, reporter_id);


-- =============================================================================
-- 7. ANALYTICS INDEXES
-- =============================================================================

-- tag_activity_daily, recent_7d CTE: range scan on activity_date with GROUP BY tag_id.
-- Composite (activity_date DESC, tag_id) allows an index range scan + grouping.
CREATE INDEX IF NOT EXISTS idx_tag_activity_daily_date_tag
    ON analytics.tag_activity_daily (activity_date DESC, tag_id);

-- tag_activity_daily, daily CTE: full-table GROUP BY tag_id — a plain tag_id index
-- lets the planner consider an index scan + aggregate instead of a sequential scan.
CREATE INDEX IF NOT EXISTS idx_tag_activity_daily_tag_id
    ON analytics.tag_activity_daily (tag_id, activity_date DESC);


-- =============================================================================
-- 8. VIEW UPDATES: add lenser_handle as direct column
--
-- Adding lenser_handle (= prof.handle) as a plain text column enables PostgREST
-- to emit `WHERE lenser_handle = $1` instead of `WHERE author_profile->>'handle' = $1`.
-- A plain column reference lets the planner push the predicate through the view's
-- LEFT JOIN on lensers.profiles, turning the LEFT JOIN into a keyed lookup via
-- idx_profiles_handle (group 1 above) and then a range scan on the per-lenser
-- partial index (group 5 above).
--
-- DROP CASCADE: only cascades to views built on these views (none). Functions that
-- reference the views by name are unaffected.
-- =============================================================================

-- 8a. vw_prompt_templates_public —————————————————————————————————————————————
DROP VIEW IF EXISTS "public"."vw_prompt_templates_public" CASCADE;

CREATE VIEW "public"."vw_prompt_templates_public" AS
SELECT
    pt.id,
    pt.lenser_id,
    prof.handle AS lenser_handle,
    pt.visibility,
    COALESCE(ptr.title, 'Untitled'::text)  AS title,
    ptr.description,
    COALESCE(ptr.content, ''::text)        AS content,
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
        COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)                      AS reaction_totals,
        COALESCE(SUM(CASE WHEN reaction = 'copy'  THEN cnt ELSE 0 END)::int, 0)     AS copy_count,
        COALESCE(SUM(CASE WHEN reaction = 'like'  THEN cnt ELSE 0 END)::int, 0)     AS like_count,
        COALESCE(SUM(CASE WHEN reaction = 'saved' THEN cnt ELSE 0 END)::int, 0)     AS saved_count
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

COMMENT ON COLUMN "public"."vw_prompt_templates_public"."lenser_handle" IS
'Flat text copy of the author handle. Use eq(lenser_handle, ''foo'') for profile-page
filtering — this is indexable, unlike author_profile->>(''handle'').';


-- 8b. vw_content_threads_public ——————————————————————————————————————————————
DROP VIEW IF EXISTS "public"."vw_content_threads_public" CASCADE;

CREATE VIEW "public"."vw_content_threads_public" AS
SELECT
    t.id,
    t.lenser_id,
    prof.handle AS lenser_handle,
    COALESCE(tt.title,   'Untitled'::text) AS title,
    COALESCE(tt.content, ''::text)         AS content,
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
        COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)                  AS reaction_totals,
        COALESCE(SUM(CASE WHEN reaction = 'like' THEN cnt ELSE 0 END)::int, 0)  AS like_count
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

COMMENT ON COLUMN "public"."vw_content_threads_public"."lenser_handle" IS
'Flat text copy of the author handle. Use eq(lenser_handle, ''foo'') for profile-page
filtering — this is indexable, unlike author_profile->>(''handle'').';


COMMIT;


-- =============================================================================
-- ROLLBACK SCRIPT (apply manually — do NOT auto-apply)
-- =============================================================================
-- BEGIN;
--
-- -- Remove new indexes
-- DROP INDEX IF EXISTS lensers.idx_profiles_handle;
-- DROP INDEX IF EXISTS lensers.idx_profiles_last_active_at;
-- DROP INDEX IF EXISTS xp.idx_xp_totals_lenser_id;
-- DROP INDEX IF EXISTS content.idx_thread_reactions_created_at;
-- DROP INDEX IF EXISTS content.idx_prompt_reactions_created_at;
-- DROP INDEX IF EXISTS content.idx_thread_reactions_user_created;
-- DROP INDEX IF EXISTS content.idx_prompt_reactions_user_created;
-- DROP INDEX IF EXISTS content.idx_thread_translations_thread_original;
-- DROP INDEX IF EXISTS content.idx_prompt_translations_prompt_original;
-- DROP INDEX IF EXISTS content.idx_threads_lenser_id_created;
-- DROP INDEX IF EXISTS content.idx_prompt_templates_lenser_id_created;
-- DROP INDEX IF EXISTS lensers.idx_tag_follows_lenser_id;
-- DROP INDEX IF EXISTS content.idx_reports_target_type_id;
-- DROP INDEX IF EXISTS analytics.idx_tag_activity_daily_date_tag;
-- DROP INDEX IF EXISTS analytics.idx_tag_activity_daily_tag_id;
--
-- -- Restore views without lenser_handle column
-- -- (Re-run sections 1 and 2 from 20260331000000_flat_reaction_counts_and_tags_rpc.sql)
--
-- COMMIT;
