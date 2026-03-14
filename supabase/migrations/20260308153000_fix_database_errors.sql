-- supabase/migrations/20260308153000_fix_database_errors.sql

-- =========================================================================
-- ERROR 1: permission denied for table tag_activity_events
-- =========================================================================
-- Description: The `xp.on_tag_created` function is called by a trigger on 
-- `content.tag_map`. When an authenticated user tags content, this function 
-- fires. However, the `analytics` schema is restricted, and the function
-- runs as the invoker by default. 
--
-- Fix: Define the function as SECURITY DEFINER so it runs with the 
-- permissions of the owner (postgres).

ALTER FUNCTION xp.on_tag_created() SECURITY DEFINER;
-- Secure the search_path for SECURITY DEFINER functions to prevent search_path hijacking
ALTER FUNCTION xp.on_tag_created() SET search_path = public, xp, analytics;

-- =========================================================================
-- ERROR 2: Cannot coerce the result to a single JSON object (0 rows)
-- =========================================================================
-- Description: The view `vw_prompt_templates_public` filters for public 
-- prompts. However, the underlying RLS policy `prompt_templates_select` 
-- requires `auth.uid() IS NOT NULL`, which prevents anonymous users from 
-- seeing public content. It also might be too restrictive for logged-in 
-- users in some edge cases.
--
-- Fix: Update prompts RLS to allow public access to all users (including anon).

-- 1. Correct Prompt Templates Select Policy
DROP POLICY IF EXISTS "prompt_templates_select" ON "content"."prompt_templates";
DROP POLICY IF EXISTS "prompt_templates_select_public" ON "content"."prompt_templates";

CREATE POLICY "prompt_templates_select_public" 
ON "content"."prompt_templates" 
FOR SELECT 
USING (visibility = 'public');

-- Ensure authors can still see their own (including private/drafts)
DROP POLICY IF EXISTS "Authors can see own prompts" ON "content"."prompt_templates";
CREATE POLICY "Authors can see own prompts" 
ON "content"."prompt_templates" 
FOR SELECT TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

-- 2. Ensure Threads have consistent public access (already mostly correct but for safety)
DROP POLICY IF EXISTS "threads_public_select" ON "content"."threads";
CREATE POLICY "threads_public_select" 
ON "content"."threads" 
FOR SELECT 
USING (visibility = 'public');

DROP POLICY IF EXISTS "Authors can see own threads" ON "content"."threads";
CREATE POLICY "Authors can see own threads" 
ON "content"."threads" 
FOR SELECT TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());
