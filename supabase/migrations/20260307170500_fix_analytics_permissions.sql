-- Description: Fix typos in trigger functions and enforce security isolation (GRASP: Information Expert)
-- Created at: 2026-03-07 17:05:00

-- =========================================================================
-- 1. FIX INCORRECT SCHEMA REFERENCES (GRASP: High Cohesion, Information Expert)
-- =========================================================================

-- Fix trg_award_founder_badges which incorrectly had 'public.' hardcoded
CREATE OR REPLACE FUNCTION lensers.trg_award_founder_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers, analytics
AS $$
BEGIN
  -- Fix: reference correctly to lensers. schema
  PERFORM lensers.auto_award_badges_from_join_order(NEW.lenser_id);
  RETURN NEW;
END;
$$;

-- Fix error strings in join log protection triggers
CREATE OR REPLACE FUNCTION lensers.prevent_lenser_join_log_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Fix: Update error message to point to correct schema (analytics)
  RAISE EXCEPTION 'Deletion from analytics.lenser_join_log is not allowed';
END;
$$;

CREATE OR REPLACE FUNCTION lensers.prevent_lenser_join_log_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF old.join_order <> new.join_order OR old.lenser_id <> new.lenser_id THEN
    -- Fix: Update error message to point to correct schema (analytics)
    RAISE EXCEPTION 'join_order and lenser_id are immutable on analytics.lenser_join_log';
  END IF;
  RETURN new;
END;
$$;

-- =========================================================================
-- 2. ENFORCE SECURITY DEFING FOR INTERNAL TRIGGERS (GRASP: Low Coupling)
-- =========================================================================

-- Redefine internal logic triggers as SECURITY DEFINER so they can access 
-- secured schemas like 'analytics' regardless of the authenticated user's privileges.

ALTER FUNCTION lensers.init_lenser_engagement_row() SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.trg_create_join_log() SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.anonymize_join_log() SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.assign_country_join_order(uuid, text) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.auto_award_badges_from_join_order(uuid) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.auto_award_badges_from_level(uuid, uuid, integer, integer, uuid) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.auto_award_badges_from_streak(uuid, integer, uuid) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.auto_award_country_badges(uuid) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.award_badge(uuid, lensers.lenser_badge_type, text, text, text, uuid) SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.trg_handle_deletion_request() SECURITY DEFINER SET search_path = public, lensers, analytics;
ALTER FUNCTION lensers.delete_expired_lensers() SECURITY DEFINER SET search_path = public, lensers, analytics, content;

ALTER FUNCTION content.sync_prompt_count() SECURITY DEFINER SET search_path = public, content, analytics;
ALTER FUNCTION content.sync_thread_count() SECURITY DEFINER SET search_path = public, content, analytics;

-- =========================================================================
-- 3. ENSURE SYSTEM-LEVEL ACCESS
-- =========================================================================

GRANT USAGE ON SCHEMA analytics, ops, system, billing TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA analytics, ops, system, billing TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics, ops, system, billing TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA analytics, ops, system, billing TO service_role;

-- Partially isolated: USAGE allowed, but ALL tables REVOKED by default
REVOKE ALL ON SCHEMA analytics FROM anon, authenticated;
GRANT USAGE ON SCHEMA analytics TO anon, authenticated;

REVOKE ALL ON SCHEMA ops FROM anon, authenticated;
REVOKE ALL ON SCHEMA system FROM anon, authenticated;
REVOKE ALL ON SCHEMA billing FROM anon, authenticated;

-- =========================================================================
-- 4. SELECTIVE API EXPOSURE (analytics.product_feedback)
-- =========================================================================

-- Grant specific table access for feedback
GRANT INSERT ON analytics.product_feedback TO anon, authenticated;
GRANT SELECT ON analytics.product_feedback TO authenticated;

-- Grant access to public engagement stats (as per policies in remote_schema)
GRANT SELECT ON analytics.lenser_stats TO anon, authenticated;

-- Manage Policies for product_feedback
-- Drop the restrictive 'no_direct_access' that blocks all API traffic
DROP POLICY IF EXISTS "no_direct_access" ON analytics.product_feedback;

-- Ensure INSERT is allowed for all users (handled securely by set_feedback_user_id trigger)
CREATE POLICY "p_feedback_insert_public" ON analytics.product_feedback 
  FOR INSERT TO anon, authenticated 
  WITH CHECK (true);

-- Ensure users can only see their own feedback (redundant with remote_schema but explicit is better)
DROP POLICY IF EXISTS "feedback_read_own" ON analytics.product_feedback;
CREATE POLICY "p_feedback_select_own" ON analytics.product_feedback 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
