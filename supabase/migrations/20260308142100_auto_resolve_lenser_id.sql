-- supabase/migrations/20260308142100_auto_resolve_lenser_id.sql

-- 1. Create a STABLE and fast function to get the current authenticated Lenser's ID.
-- We use LIMIT 1 to stop the planner from full table scans and avoid Subquery processing overhead.
CREATE OR REPLACE FUNCTION lensers.get_auth_lenser_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lensers
AS $$
  SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lensers.get_auth_lenser_id() TO authenticated, service_role;

-- 2. Apply DEFAULT constraints to user-generated content tables.
-- This ensures if 'lenser_id' is omitted or DEFAULT is explicitly requested, it safely resolves to the actor.
ALTER TABLE content.prompt_templates ALTER COLUMN lenser_id SET DEFAULT lensers.get_auth_lenser_id();
ALTER TABLE content.threads ALTER COLUMN lenser_id SET DEFAULT lensers.get_auth_lenser_id();
ALTER TABLE content.thread_replies ALTER COLUMN lenser_id SET DEFAULT lensers.get_auth_lenser_id();

-- Analytics / Media that use lenser_id
ALTER TABLE ai.generations ALTER COLUMN lenser_id SET DEFAULT lensers.get_auth_lenser_id();
ALTER TABLE content.media_library ALTER COLUMN lenser_id SET DEFAULT lensers.get_auth_lenser_id();

-- 3. Replace IN (SELECT ...) subqueries in existing RLS policies with direct STABLE function equality checks.

-- content.threads
DROP POLICY IF EXISTS "Users can create threads" ON content.threads;
CREATE POLICY "Users can create threads" 
ON content.threads FOR INSERT TO authenticated 
WITH CHECK (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Users can update their own threads" ON content.threads;
CREATE POLICY "Users can update their own threads" 
ON content.threads FOR UPDATE TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Users can delete their own threads" ON content.threads;
CREATE POLICY "Users can delete their own threads" 
ON content.threads FOR DELETE TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

-- content.prompt_templates
DROP POLICY IF EXISTS "Users can create prompts" ON content.prompt_templates;
CREATE POLICY "Users can create prompts" 
ON content.prompt_templates FOR INSERT TO authenticated 
WITH CHECK (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Users can update their own prompts" ON content.prompt_templates;
CREATE POLICY "Users can update their own prompts" 
ON content.prompt_templates FOR UPDATE TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Users can delete their own prompts" ON content.prompt_templates;
CREATE POLICY "Users can delete their own prompts" 
ON content.prompt_templates FOR DELETE TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

-- ai.generations
DROP POLICY IF EXISTS "ai_generations_select_own" ON ai.generations;
CREATE POLICY "ai_generations_select_own" ON ai.generations FOR SELECT TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());
