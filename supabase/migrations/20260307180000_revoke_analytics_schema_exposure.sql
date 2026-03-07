-- Description: Remove analytics schema from PostgREST API surface.
-- Revoke all wildcard table grants on analytics from anon/authenticated,
-- then restore only the two safe selective grants (product_feedback, lenser_stats).
-- Also update supabase/config.toml: remove 'analytics' from schemas list.
-- Created at: 2026-03-07 18:00:00

-- =========================================================================
-- 1. REVOKE ALL TABLE-LEVEL ACCESS TO ANALYTICS FROM API ROLES
-- =========================================================================

-- Remove any wildcard or leftover grants that could expose internal tables
-- (page_views, share_events, lenser_activity, tag_activity_events, etc.)
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon, authenticated;

-- =========================================================================
-- 2. RESTORE SELECTIVE GRANTS FOR SAFE ANALYTICS TABLES
-- =========================================================================

-- product_feedback: users can submit and view their own feedback
GRANT INSERT ON analytics.product_feedback TO anon, authenticated;
GRANT SELECT ON analytics.product_feedback TO authenticated;

-- lenser_stats: public read-only engagement stats (join counts, activity)
GRANT SELECT ON analytics.lenser_stats TO anon, authenticated;
