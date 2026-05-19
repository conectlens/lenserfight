-- Migration: fix fn_schedule_battle status type mismatch
--
-- Column 5 of RETURNS TABLE declares "status text" but battles.battles.status
-- is battle_status_enum. Postgres 42804 refuses the implicit cast in the
-- RETURNING clause.  Fix: cast b.status::text explicitly.
--
-- Rollback: re-apply the previous version from 20280113000000_battle_scheduling_past_guard.sql.

CREATE OR REPLACE FUNCTION "public"."fn_schedule_battle"(
  "p_battle_id"            uuid,
  "p_execution_starts_at"  timestamp with time zone,
  "p_voting_duration_hours" integer DEFAULT 24,
  "p_auto_publish"         boolean DEFAULT true
) RETURNS TABLE(
  "id"                   uuid,
  "slug"                 text,
  "title"                text,
  "task_prompt"          text,
  "status"               text,
  "total_vote_count"     integer,
  "published_at"         timestamp with time zone,
  "voting_opens_at"      timestamp with time zone,
  "voting_closes_at"     timestamp with time zone,
  "battle_type"          text,
  "voter_eligibility"    text,
  "handicap_config"      jsonb,
  "creator_lenser_id"    uuid,
  "forum_thread_id"      text,
  "workflow_id"          uuid,
  "lens_id"              uuid,
  "execution_starts_at"  timestamp with time zone,
  "auto_publish"         boolean,
  "voting_duration_hours" integer,
  "vote_velocity"        numeric,
  "og_image_url"         text,
  "winner_contender_id"  uuid,
  "parent_battle_id"     uuid,
  "deleted_at"           timestamp with time zone
)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF p_execution_starts_at IS NULL THEN
    RAISE EXCEPTION 'execution_starts_at must not be null.' USING ERRCODE = '22000';
  END IF;

  IF p_execution_starts_at <= now() THEN
    RAISE EXCEPTION 'execution_starts_at must be in the future (got %).',
      p_execution_starts_at USING ERRCODE = '22000';
  END IF;

  RETURN QUERY
  UPDATE battles.battles AS b
  SET
    execution_starts_at   = p_execution_starts_at,
    voting_duration_hours = COALESCE(p_voting_duration_hours, 24),
    auto_publish          = COALESCE(p_auto_publish, true)
  WHERE b.id = p_battle_id
    AND b.creator_lenser_id = v_lenser_id
  RETURNING
    b.id, b.slug, b.title, b.task_prompt, b.status::text, b.total_vote_count, b.published_at,
    b.voting_opens_at, b.voting_closes_at, b.battle_type::text, b.voter_eligibility::text, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id, b.workflow_id, b.lens_id,
    b.execution_starts_at, b.auto_publish, b.voting_duration_hours, b.vote_velocity, b.og_image_url,
    b.winner_contender_id, b.parent_battle_id, b.deleted_at;
END;
$$;

COMMENT ON FUNCTION "public"."fn_schedule_battle"(uuid, timestamp with time zone, integer, boolean)
  IS 'Schedule a battle execution time. Rejects past timestamps server-side (issue #208). Casts enum columns to text to match declared return type.';
