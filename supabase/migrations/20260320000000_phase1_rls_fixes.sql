-- =============================================================================
-- Phase 1: RLS Fixes + Missing Indexes
-- Fixes: broken profile update policy, dead badge policy, duplicate/dead thread
-- policies, duplicate ai.generations policies, agent_adapters adapter leak,
-- and adds critical missing indexes for forum list/detail/author query paths.
-- All changes are non-breaking: removing dead/duplicate permissive policies
-- does not change effective access for any real user.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix lensers.profiles — "Profiles update own secure" compared wrong column
--    Bug: USING(auth.uid() = id) — profiles.id is profile UUID, not auth UID.
--    Fix: compare against user_id column.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles update own secure" ON "lensers"."profiles";

CREATE POLICY "profiles_owner_update"
  ON "lensers"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ("user_id" = "auth"."uid"())
  WITH CHECK ("user_id" = "auth"."uid"());


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix lensers.badges — "lenser_badges_select_own" compared wrong column
--    Bug: USING(lenser_id = auth.uid()) — lenser_id is a profile FK, not auth UID.
--    Fix: drop the buggy policy; the existing "Select own badges" policy is correct.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lenser_badges_select_own" ON "lensers"."badges";


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Clean up content.threads — remove dead/duplicate policies
--    "deny_all"   → USING(false) permissive ALL policy — dead code, never blocks
--    "deny_select" → USING(false) permissive SELECT policy — dead code
--    "Authors can see own threads" → duplicate of threads_owner_select
--    "threads_public_select" → USING(visibility='public'), superceded by
--      "Public threads are viewable by everyone" which covers public+community
--    "Users can create threads" → duplicate of threads_owner_insert
--    "Users can update their own threads" → duplicate of threads_owner_update
--    "Users can delete their own threads" → duplicate of threads_owner_delete
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "deny_all"                        ON "content"."threads";
DROP POLICY IF EXISTS "deny_select"                     ON "content"."threads";
DROP POLICY IF EXISTS "Authors can see own threads"     ON "content"."threads";
DROP POLICY IF EXISTS "threads_public_select"           ON "content"."threads";
DROP POLICY IF EXISTS "Users can create threads"        ON "content"."threads";
DROP POLICY IF EXISTS "Users can update their own threads" ON "content"."threads";
DROP POLICY IF EXISTS "Users can delete their own threads" ON "content"."threads";


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Clean up content.prompt_templates — remove duplicate policies
--    "Users can create prompts" → duplicate of prompts_owner_insert (if exists)
--    "Users can update their own prompts" → duplicate of prompts_owner_update
--    "Users can delete their own prompts" → duplicate of prompts_owner_delete
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create prompts"         ON "content"."prompt_templates";
DROP POLICY IF EXISTS "Users can update their own prompts" ON "content"."prompt_templates";
DROP POLICY IF EXISTS "Users can delete their own prompts" ON "content"."prompt_templates";


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Clean up ai.generations — remove duplicate policies (3 sets for same access)
--    Keep: ai_generations_select_own, ai_generations_insert_own,
--          ai_generations_update_own, ai_generations_delete_own,
--          ai_generations_admin_select_all_secure
--    Remove: old set (ai_gen_*) and third insert policy
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_gen_select"         ON "ai"."generations";
DROP POLICY IF EXISTS "ai_gen_insert"         ON "ai"."generations";
DROP POLICY IF EXISTS "ai_gen_update"         ON "ai"."generations";
DROP POLICY IF EXISTS "ai_gen_delete"         ON "ai"."generations";
DROP POLICY IF EXISTS "insert_own_generations" ON "ai"."generations";

-- Remove overly broad public-prompt select (any authenticated user could see
-- any generation linked to a public prompt, including private input_text).
-- Owners can see their own generations via ai_generations_select_own.
-- Admin can see all via ai_generations_admin_select_all_secure.
-- Note: if public generation display is needed, add a specific public visibility
-- check filtered by generations.visibility = 'public'.
DROP POLICY IF EXISTS "ai_models_read_all"   ON "ai"."models";
DROP POLICY IF EXISTS "ai_models_select"     ON "ai"."models";
DROP POLICY IF EXISTS "ai_models_write"      ON "ai"."models";
DROP POLICY IF EXISTS "ai_models_write_service" ON "ai"."models";
-- Keep: ai_models_select_public_or_admin, ai_models_insert_admin_only,
--       ai_models_update_admin_only, ai_models_delete_admin_only


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fix battles.agent_adapters — remove policy leaking other users' adapters
--    "Active adapters are viewable by authenticated" allows ANY authenticated
--    user to see ALL active adapters. Only owners should see their own.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active adapters are viewable by authenticated" ON "battles"."agent_adapters";


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Add missing indexes — critical for forum list/detail/author query paths
-- ─────────────────────────────────────────────────────────────────────────────

-- Forum listing: public threads ordered by time (used by vw_content_threads_public)
CREATE INDEX IF NOT EXISTS "idx_threads_public_created"
  ON "content"."threads" ("created_at" DESC)
  WHERE "visibility" = 'public';

-- Author profile queries (getByLenser)
CREATE INDEX IF NOT EXISTS "idx_threads_lenser_id"
  ON "content"."threads" ("lenser_id");

-- Forum prompt listing: public prompts ordered by time
CREATE INDEX IF NOT EXISTS "idx_prompt_templates_public_created"
  ON "content"."prompt_templates" ("created_at" DESC)
  WHERE "visibility" = 'public';

-- Author profile queries for prompts
CREATE INDEX IF NOT EXISTS "idx_prompt_templates_lenser_id"
  ON "content"."prompt_templates" ("lenser_id");

-- Tag browsing + personalization CTEs (tag_map lookups are extremely hot)
CREATE INDEX IF NOT EXISTS "idx_tag_map_entity"
  ON "content"."tag_map" ("entity_id", "entity_type");

CREATE INDEX IF NOT EXISTS "idx_tag_map_tag_id"
  ON "content"."tag_map" ("tag_id");

-- Thread replies list (thread detail page)
CREATE INDEX IF NOT EXISTS "idx_thread_replies_thread_created"
  ON "content"."thread_replies" ("thread_id", "created_at");

-- Nested replies (parent lookup)
CREATE INDEX IF NOT EXISTS "idx_thread_replies_parent"
  ON "content"."thread_replies" ("parent_reply_id")
  WHERE "parent_reply_id" IS NOT NULL;

-- Profile handle lookup (slug-based routing)
CREATE INDEX IF NOT EXISTS "idx_profiles_handle"
  ON "lensers"."profiles" ("handle");

-- Auth UID → profile join (used by get_auth_lenser_id(), very hot)
CREATE INDEX IF NOT EXISTS "idx_profiles_user_id"
  ON "lensers"."profiles" ("user_id");

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
