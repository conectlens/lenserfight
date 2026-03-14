-- Description: Securely expose schemas and configure Row Level Security (RLS)
-- Created at: 2026-03-07 16:53:00

-- ==========================================
-- 1. SCHEMA EXPOSURE
-- ==========================================

-- Expose required schemas to PostgREST API
GRANT USAGE ON SCHEMA ai, content, lensers, xp TO anon, authenticated;

-- Ensure internal schemas are restricted
REVOKE ALL ON SCHEMA analytics, ops, system, billing FROM anon, authenticated;
GRANT USAGE ON SCHEMA analytics, ops, system, billing TO service_role;

-- ==========================================
-- 2. TABLE PRIVILEGES
-- ==========================================

-- LENSERS SCHEMA
GRANT SELECT ON ALL TABLES IN SCHEMA lensers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lensers TO authenticated;

-- CONTENT SCHEMA
GRANT SELECT ON ALL TABLES IN SCHEMA content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA content TO authenticated;

-- AI SCHEMA
GRANT SELECT ON ALL TABLES IN SCHEMA ai TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO authenticated;

-- XP SCHEMA
GRANT SELECT ON ALL TABLES IN SCHEMA xp TO anon, authenticated;

-- ==========================================
-- 3. RLS POLICIES ENHANCEMENT
-- ==========================================

-- Ensure RLS is enabled (already mostly enabled in remote_schema.sql, but confirming)
ALTER TABLE lensers.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.generations ENABLE ROW LEVEL SECURITY;

-- Additional Security Policies (if not already handled or need refinement)

-- Example: Ensure profiles are readable by everyone but only editable by owner
-- (Referencing existing policies in remote_schema.sql, ensuring coverage)

-- PROFILES
DROP POLICY IF EXISTS "p_lensers_select_self" ON lensers.profiles;
CREATE POLICY "p_lensers_select_self" ON lensers.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- GENERATIONS
DROP POLICY IF EXISTS "ai_generations_select_own" ON ai.generations;
CREATE POLICY "ai_generations_select_own" ON ai.generations FOR SELECT TO authenticated USING (lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid()));

-- ==========================================
-- 4. FUNCTION SECURITY
-- ==========================================

-- Ensure functions are security invoker unless specifically requiring higher privs
-- (Remote schema already defines many as SECURITY DEFINER where needed for system triggers)

-- ==========================================
-- FINAL RECOMMENDATION
-- ==========================================
-- In the Supabase Dashboard:
-- 1. Go to Settings -> API
-- 2. Add 'content', 'lensers', 'ai', 'xp' to the "Exposed schemas" list.
