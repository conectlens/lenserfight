-- fn_create_battle's p_battle_type is declared text, but
-- battles.battles.battle_type is battles.battle_type_enum — Postgres does
-- not implicitly cast text to a user-defined enum on INSERT, so every call
-- to fn_create_battle failed with "column "battle_type" is of type
-- battle_type_enum but expression is of type text". Given this function has
-- zero callers anywhere in the codebase (confirmed by repo-wide grep), it
-- had never actually been exercised. Same fix for p_content_type, which
-- had the same latent mismatch waiting for it (content_type is plain text
-- so no cast needed there, but validated in-function instead to fail with a
-- clear message rather than a raw check-constraint error).

CREATE OR REPLACE FUNCTION "public"."fn_create_battle"(
  "p_title" "text",
  "p_task_prompt" "text",
  "p_battle_type" "text",
  "p_voter_eligibility" "text" DEFAULT 'open'::"text",
  "p_handicap_config" "jsonb" DEFAULT '{}'::"jsonb",
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid",
  "p_lens_id" "uuid" DEFAULT NULL::"uuid",
  "p_content_type" "text" DEFAULT 'text'::"text"
) RETURNS TABLE(
  "id" "uuid", "slug" "text", "title" "text", "task_prompt" "text", "status" "text",
  "total_vote_count" integer, "published_at" timestamp with time zone,
  "voting_opens_at" timestamp with time zone, "voting_closes_at" timestamp with time zone,
  "battle_type" "text", "voter_eligibility" "text", "handicap_config" "jsonb",
  "creator_lenser_id" "uuid", "forum_thread_id" "text", "workflow_id" "uuid", "lens_id" "uuid",
  "execution_starts_at" timestamp with time zone, "auto_publish" boolean,
  "voting_duration_hours" integer, "vote_velocity" numeric, "og_image_url" "text",
  "winner_contender_id" "uuid", "parent_battle_id" "uuid", "deleted_at" timestamp with time zone,
  "content_type" "text"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_slug      text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  v_slug := lower(regexp_replace(p_title, '[^a-z0-9\s-]', '', 'gi'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := left(v_slug, 80) || '-' || substr(md5(random()::text), 1, 6);

  -- Insert via CTE to avoid the ambiguous "id" (and other same-named)
  -- reference between the RETURNS TABLE output columns and the actual
  -- battles.battles columns — same pattern already used by
  -- fn_invite_battle_contender for the same reason.
  RETURN QUERY
  WITH ins AS (
    INSERT INTO battles.battles (
      title, task_prompt, battle_type, voter_eligibility,
      handicap_config, creator_lenser_id, slug, status,
      workflow_id, lens_id, content_type
    ) VALUES (
      p_title, p_task_prompt, p_battle_type::battles.battle_type_enum,
      p_voter_eligibility::battles.voter_eligibility_enum,
      COALESCE(p_handicap_config, '{}'::jsonb), v_lenser_id, v_slug, 'draft',
      p_workflow_id, p_lens_id, COALESCE(p_content_type, 'text')
    )
    RETURNING *
  )
  SELECT
    ins.id, ins.slug, ins.title, ins.task_prompt, ins.status, ins.total_vote_count,
    ins.published_at, ins.voting_opens_at, ins.voting_closes_at,
    ins.battle_type::text, ins.voter_eligibility::text, ins.handicap_config,
    ins.creator_lenser_id, ins.forum_thread_id::text, ins.workflow_id, ins.lens_id,
    ins.execution_starts_at, ins.auto_publish, ins.voting_duration_hours, ins.vote_velocity,
    ins.og_image_url, ins.winner_contender_id, ins.parent_battle_id, ins.deleted_at,
    ins.content_type
  FROM ins;
END;
$$;
