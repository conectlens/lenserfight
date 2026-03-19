-- =============================================================================
-- Migration: Performance Indexes
-- File: 20260341000012_performance_indexes.sql
-- Targets: 5 production slow-query paths identified from pg_stat_statements
-- =============================================================================
-- NOTE: In production on a live database, replace CREATE INDEX with
-- CREATE INDEX CONCURRENTLY to avoid table locks during index build.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 1: lensers.profiles — unfiltered (user_id, status)
--
-- Problem: idx_profiles_user_id_status is partial (WHERE deletion_requested_at
--   IS NULL). The RPC "SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
--   AND status = $1" does NOT filter on deletion_requested_at, so rows outside
--   the partial predicate cause a full seq scan. Cache hit: 42–55%.
--   154 anon calls at 187ms mean / 933 auth calls at 14ms mean = 42s total.
--
-- Fix: Unfiltered composite index covers all rows regardless of deletion state.
--   The existing partial index remains and is still preferred for queries that
--   explicitly filter on deletion_requested_at IS NULL.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_status_all
  ON lensers.profiles (user_id, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 2: content.prompt_translations — GIN trigram on title for ILIKE search
--
-- Problem: vw_prompt_templates_public exposes title from prompt_translations
--   (WHERE is_original = true). Queries with "title ilike $1" cannot use btree
--   and fall back to a full seq scan. Mean: 1,902ms, max: 6,347ms.
--
-- Fix: Enable pg_trgm then create a partial GIN index on lower(title) matching
--   the exact view join predicate. The partial predicate halves index size by
--   excluding translated (non-original) rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_prompt_translations_title_trgm
  ON content.prompt_translations
  USING gin (lower(title) extensions.gin_trgm_ops)
  WHERE is_original = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 3a: content.thread_reactions — composite (created_at, thread_id)
--
-- Problem: fn_lensers_get_leaderboard LATERAL counts 7-day reactions:
--   thread_reactions tr JOIN threads t ON t.id = tr.thread_id AND t.lenser_id = r.lenser_id
--   WHERE tr.created_at > now() - interval '7 days'
--   The existing idx_thread_reactions_created_at is standalone — planner must
--   heap-fetch thread_id for every row in the date window before joining.
--   Mean: 2,321ms, cache_hit: 30.8%.
--
-- Fix: Composite (created_at, thread_id) enables index-only scan over the 7-day
--   window, surfacing thread_id inline for the join. Old created_at index stays
--   for queries that only filter by date.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_thread_reactions_created_at_thread_id
  ON content.thread_reactions (created_at, thread_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 3b: content.prompt_reactions — composite (created_at, prompt_id)
--
-- Problem: Mirrors 3a for the prompt side of the same fn_lensers_get_leaderboard
--   LATERAL:
--   prompt_reactions pr JOIN prompt_templates pt ON pt.id = pr.prompt_id AND pt.lenser_id = r.lenser_id
--   WHERE pr.created_at > now() - interval '7 days'
--   idx_prompt_reactions_created_at is standalone.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_prompt_reactions_created_at_prompt_id
  ON content.prompt_reactions (created_at, prompt_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 4: xp.totals — composite (app_id, total_xp DESC)
--
-- Problem: vw_xp_leaderboard_global runs:
--   RANK() OVER (PARTITION BY app_id ORDER BY total_xp DESC, lenser_id)
--   on a full scan of xp.totals. idx_xp_totals_lenser_id covers only (lenser_id)
--   — wrong column order for this window function. Cache_hit: 14.4%, 8 calls,
--   mean 957ms.
--
-- Fix: (app_id, total_xp DESC) aligns with PARTITION BY app_id ORDER BY total_xp
--   DESC, enabling the planner to use an incremental sort / index scan instead
--   of a full table scan + in-memory sort. Complementary to idx_xp_totals_lenser_id.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_xp_totals_app_id_total_xp_desc
  ON xp.totals (app_id, total_xp DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX 5: content.reports — composite (target_type, target_id)
--
-- Problem: fn_content_get_personal_threads excludes flagged threads via:
--   WHERE c.id NOT IN (
--     SELECT target_id FROM content.reports
--     WHERE target_type = 'thread'::content.entity_type_enum
--     GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
--   )
--   content.reports has NO index — this is a full seq scan on every call.
--
-- Fix: (target_type, target_id) lets the planner narrow by target_type first
--   then group over target_id, eliminating the full scan.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reports_target_type_target_id
  ON content.reports (target_type, target_id);
