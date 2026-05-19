-- Migration: extend fn_get_battle (and fn_get_battle_by_slug alias) to return V2 fields
-- V2 fields: task_source, contender_structure, judging_mode, challenge_type,
--            shared_input_snapshot, lenser_battle_policy
--
-- These columns exist in battles.battles since Phase CS (battle-creation-refactor)
-- but were not projected by fn_get_battle, making them invisible to the client.
-- This migration fixes that gap so BattleRulesDrawer can display type-specific rules.

DROP FUNCTION IF EXISTS "public"."fn_get_battle"(uuid, text);

CREATE OR REPLACE FUNCTION "public"."fn_get_battle"(
  "p_battle_id" "uuid"  DEFAULT NULL::"uuid",
  "p_slug"      "text"  DEFAULT NULL::"text"
)
RETURNS TABLE(
  "id"                    "uuid",
  "slug"                  "text",
  "title"                 "text",
  "task_prompt"           "text",
  "status"                "text",
  "total_vote_count"      integer,
  "published_at"          timestamp with time zone,
  "voting_opens_at"       timestamp with time zone,
  "voting_closes_at"      timestamp with time zone,
  "finalized_at"          timestamp with time zone,
  "battle_type"           "text",
  "voter_eligibility"     "text",
  "handicap_config"       "jsonb",
  "creator_lenser_id"     "uuid",
  "forum_thread_id"       "text",
  "workflow_id"           "uuid",
  "lens_id"               "uuid",
  "execution_starts_at"   timestamp with time zone,
  "auto_publish"          boolean,
  "voting_duration_hours" integer,
  "vote_velocity"         numeric,
  "og_image_url"          "text",
  "winner_contender_id"   "uuid",
  "parent_battle_id"      "uuid",
  "deleted_at"            timestamp with time zone,
  -- V2 fields (Phase CS)
  "task_source"           "text",
  "contender_structure"   "text",
  "judging_mode"          "text",
  "challenge_type"        "text",
  "shared_input_snapshot" "jsonb",
  "lenser_battle_policy"  "jsonb"
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public', 'battles', 'lensers'
AS $$
  SELECT
    b.id, b.slug, b.title, b.task_prompt, b.status, b.total_vote_count,
    b.published_at, b.voting_opens_at, b.voting_closes_at, b.finalized_at,
    b.battle_type::text, b.voter_eligibility::text, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id,
    b.workflow_id, b.lens_id, b.execution_starts_at,
    b.auto_publish, b.voting_duration_hours, b.vote_velocity, b.og_image_url,
    b.winner_contender_id, b.parent_battle_id, b.deleted_at,
    -- V2 axes
    b.task_source,
    b.contender_structure::text,
    b.judging_mode::text,
    b.challenge_type,
    b.shared_input_snapshot,
    b.lenser_battle_policy
  FROM battles.battles b
  WHERE (p_battle_id IS NULL OR b.id   = p_battle_id)
    AND (p_slug      IS NULL OR b.slug = p_slug)
    AND b.deleted_at IS NULL
    AND (
      b.status <> 'draft'
      OR b.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  LIMIT 1;
$$;

COMMENT ON FUNCTION "public"."fn_get_battle"("p_battle_id" "uuid", "p_slug" "text") IS
  'Security wrapper: look up a battle by id or slug. Public battles are visible to everyone; drafts only to the creator. Returns NULL when not found or draft-and-not-creator. Now includes V2 fields: task_source, contender_structure, judging_mode, challenge_type, shared_input_snapshot, lenser_battle_policy.';
