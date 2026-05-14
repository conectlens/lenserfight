-- Fix "column reference 'id' is ambiguous" in fn_update_battle.
-- The RETURNS TABLE declares a column named 'id', which Postgres cannot
-- distinguish from the battles.battles.id column in the RETURNING clause.
-- Qualify the column as battles.id to resolve the ambiguity.

CREATE OR REPLACE FUNCTION "public"."fn_update_battle"(
  "p_battle_id"        uuid,
  "p_title"            text    DEFAULT NULL,
  "p_task_prompt"      text    DEFAULT NULL,
  "p_battle_type"      text    DEFAULT NULL,
  "p_voter_eligibility" text   DEFAULT NULL,
  "p_handicap_config"  jsonb   DEFAULT NULL,
  "p_workflow_id"      uuid    DEFAULT NULL,
  "p_lens_id"          uuid    DEFAULT NULL,
  "p_forum_thread_id"  text    DEFAULT NULL
)
RETURNS TABLE(
  "id"                   uuid,
  "slug"                 text,
  "title"                text,
  "task_prompt"          text,
  "status"               text,
  "total_vote_count"     integer,
  "published_at"         timestamptz,
  "voting_opens_at"      timestamptz,
  "voting_closes_at"     timestamptz,
  "battle_type"          text,
  "voter_eligibility"    text,
  "handicap_config"      jsonb,
  "creator_lenser_id"    uuid,
  "forum_thread_id"      text,
  "workflow_id"          uuid,
  "lens_id"              uuid,
  "execution_starts_at"  timestamptz,
  "auto_publish"         boolean,
  "voting_duration_hours" integer,
  "vote_velocity"        numeric,
  "og_image_url"         text,
  "winner_contender_id"  uuid,
  "parent_battle_id"     uuid,
  "deleted_at"           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE battles.battles b
  SET
    title             = COALESCE(p_title,             b.title),
    task_prompt       = COALESCE(p_task_prompt,       b.task_prompt),
    battle_type       = COALESCE(p_battle_type,       b.battle_type),
    voter_eligibility = COALESCE(p_voter_eligibility, b.voter_eligibility),
    handicap_config   = COALESCE(p_handicap_config,   b.handicap_config),
    workflow_id       = COALESCE(p_workflow_id,        b.workflow_id),
    lens_id           = COALESCE(p_lens_id,            b.lens_id),
    forum_thread_id   = COALESCE(p_forum_thread_id,   b.forum_thread_id)
  WHERE b.id = p_battle_id
    AND b.creator_lenser_id = v_lenser_id
  RETURNING
    b.id, b.slug, b.title, b.task_prompt, b.status, b.total_vote_count,
    b.published_at, b.voting_opens_at, b.voting_closes_at,
    b.battle_type, b.voter_eligibility, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id, b.workflow_id, b.lens_id,
    b.execution_starts_at, b.auto_publish, b.voting_duration_hours,
    b.vote_velocity, b.og_image_url, b.winner_contender_id,
    b.parent_battle_id, b.deleted_at;
END;
$$;
