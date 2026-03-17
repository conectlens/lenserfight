-- Phase 2: Status model simplification
-- 1. Add content_status enum and status column to threads + prompt_templates
-- 2. Fix thread_replies.status enum (was using thread_visibility — wrong type)
-- 3. Drop dead trg_reactions_refresh_totals trigger/functions
-- 4. Drop unnecessary RPCs: fn_agent_adapters_list, fn_battles_get_public, fn_battles_list_public
-- 5. Create vw_battles_public view to replace dropped RPCs

-- ── 1. Content status enum ───────────────────────────────────────────────────

CREATE TYPE "content"."content_status" AS ENUM ('draft', 'published', 'archived');

ALTER TABLE "content"."threads"
  ADD COLUMN IF NOT EXISTS "status" "content"."content_status"
    NOT NULL DEFAULT 'published';

ALTER TABLE "content"."prompt_templates"
  ADD COLUMN IF NOT EXISTS "status" "content"."content_status"
    NOT NULL DEFAULT 'published';

-- ── 2. Thread reply status — fix wrong enum type ─────────────────────────────
-- thread_replies.status was typed as content.thread_visibility which is semantically wrong.
-- Replace with a dedicated thread_reply_status enum.

CREATE TYPE "content"."thread_reply_status" AS ENUM ('published', 'hidden', 'deleted');

ALTER TABLE "content"."thread_replies"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "content"."thread_replies"
  ALTER COLUMN "status" TYPE "content"."thread_reply_status"
  USING CASE
    WHEN status::text = 'public'    THEN 'published'::content.thread_reply_status
    WHEN status::text = 'private'   THEN 'hidden'::content.thread_reply_status
    WHEN status::text = 'community' THEN 'published'::content.thread_reply_status
    ELSE 'hidden'::content.thread_reply_status
  END;

ALTER TABLE "content"."thread_replies"
  ALTER COLUMN "status" SET DEFAULT 'published'::content.thread_reply_status;

-- ── 3. Drop dead reactions refresh trigger/functions ─────────────────────────
-- trg_reactions_refresh_totals references content.reactions which does not exist
-- (replaced by per-entity tables: thread_reactions, prompt_reactions, etc.).
-- The stored reaction_totals update path is also being removed.

DROP FUNCTION IF EXISTS "public"."fn_content_update_prompt_reaction_totals"(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS "content"."refresh_reaction_totals"(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS "content"."trg_reactions_refresh_totals"() CASCADE;

-- ── 4. Drop unnecessary RPCs ─────────────────────────────────────────────────

-- fn_agent_adapters_list: plain SELECT of own adapters — RLS handles this.
-- Replace with: supabase.schema('battles').from('agent_adapters').select('*')
DROP FUNCTION IF EXISTS "public"."fn_agent_adapters_list"() CASCADE;

-- fn_battles_get_public / fn_battles_list_public: complex SELECT → use view instead
DROP FUNCTION IF EXISTS "public"."fn_battles_get_public"(uuid) CASCADE;
DROP FUNCTION IF EXISTS "public"."fn_battles_list_public"(integer, integer) CASCADE;

-- ── 5. Create vw_battles_public to replace the dropped RPCs ─────────────────

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
  (
    SELECT COUNT(*)
    FROM battles.contenders c
    WHERE c.battle_id = b.id
  ) AS contender_count
FROM battles.battles b
WHERE b.status = ANY (ARRAY[
    'voting'::battles.battle_status_enum,
    'scoring'::battles.battle_status_enum,
    'closed'::battles.battle_status_enum,
    'published'::battles.battle_status_enum
  ])
  AND b.deleted_at IS NULL;

GRANT SELECT ON "public"."vw_battles_public" TO "anon";
GRANT SELECT ON "public"."vw_battles_public" TO "authenticated";
GRANT SELECT ON "public"."vw_battles_public" TO "service_role";
