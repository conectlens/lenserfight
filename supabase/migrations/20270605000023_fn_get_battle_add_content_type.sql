-- fn_get_battle / fn_get_battle_by_slug never returned content_type, even
-- though battles.battles has had that column all along. The web arena page
-- resolves which layout to render (text/image/audio/video/...) from
-- battle.content_type (BattleLayoutResolver.resolveBattleLayout) — with it
-- always undefined, every battle rendered through TextBattleLayout
-- regardless of its actual content type, so an image battle's real
-- submissions (media_url) were never shown; the UI just displayed the
-- text-path "Awaiting submission..." placeholder forever, even after both
-- contenders had successfully submitted images.

DROP FUNCTION IF EXISTS "public"."fn_get_battle_by_slug"("p_slug" "text");
DROP FUNCTION IF EXISTS "public"."fn_get_battle"("p_battle_id" "uuid", "p_slug" "text");

CREATE OR REPLACE FUNCTION "public"."fn_get_battle"(
  "p_battle_id" "uuid" DEFAULT NULL::"uuid",
  "p_slug" "text" DEFAULT NULL::"text"
) RETURNS TABLE(
  "id" "uuid", "slug" "text", "title" "text", "task_prompt" "text", "status" "text",
  "total_vote_count" integer, "published_at" timestamp with time zone,
  "voting_opens_at" timestamp with time zone, "voting_closes_at" timestamp with time zone,
  "finalized_at" timestamp with time zone, "battle_type" "text", "voter_eligibility" "text",
  "handicap_config" "jsonb", "creator_lenser_id" "uuid", "forum_thread_id" "text",
  "workflow_id" "uuid", "lens_id" "uuid", "execution_starts_at" timestamp with time zone,
  "auto_publish" boolean, "voting_duration_hours" integer, "vote_velocity" numeric,
  "og_image_url" "text", "winner_contender_id" "uuid", "parent_battle_id" "uuid",
  "deleted_at" timestamp with time zone, "task_source" "text", "contender_structure" "text",
  "judging_mode" "text", "challenge_type" "text", "shared_input_snapshot" "jsonb",
  "lenser_battle_policy" "jsonb", "content_type" "text"
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
    b.task_source,
    b.contender_structure::text,
    b.judging_mode::text,
    b.challenge_type,
    b.shared_input_snapshot,
    b.lenser_battle_policy,
    b.content_type
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

COMMENT ON FUNCTION "public"."fn_get_battle"("p_battle_id" "uuid", "p_slug" "text") IS 'Security wrapper: look up a battle by id or slug. Public battles are visible to everyone; drafts only to the creator. Returns NULL when not found or draft-and-not-creator. Now includes content_type, needed by the web arena to pick the correct layout (text/image/audio/video/...).';

CREATE OR REPLACE FUNCTION "public"."fn_get_battle_by_slug"("p_slug" "text") RETURNS TABLE(
  "id" "uuid", "slug" "text", "title" "text", "task_prompt" "text", "status" "text",
  "total_vote_count" integer, "published_at" timestamp with time zone,
  "voting_opens_at" timestamp with time zone, "voting_closes_at" timestamp with time zone,
  "finalized_at" timestamp with time zone, "battle_type" "text", "voter_eligibility" "text",
  "handicap_config" "jsonb", "creator_lenser_id" "uuid", "forum_thread_id" "text",
  "workflow_id" "uuid", "lens_id" "uuid", "execution_starts_at" timestamp with time zone,
  "auto_publish" boolean, "voting_duration_hours" integer, "vote_velocity" numeric,
  "og_image_url" "text", "winner_contender_id" "uuid", "parent_battle_id" "uuid",
  "deleted_at" timestamp with time zone, "task_source" "text", "contender_structure" "text",
  "judging_mode" "text", "challenge_type" "text", "shared_input_snapshot" "jsonb",
  "lenser_battle_policy" "jsonb", "content_type" "text"
)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
  SELECT * FROM public.fn_get_battle(NULL::"uuid", p_slug);
$$;

COMMENT ON FUNCTION "public"."fn_get_battle_by_slug"("p_slug" "text") IS 'Alias for fn_get_battle(p_slug). Return type kept in sync with fn_get_battle, including content_type.';
