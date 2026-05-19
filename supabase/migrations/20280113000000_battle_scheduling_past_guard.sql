-- Migration: battle scheduling past-timestamp guard
--
-- Adds server-authoritative validation to fn_schedule_battle and
-- fn_update_battle_execution_settings so that a past execution_starts_at
-- is rejected at the database layer regardless of what the client sends.
--
-- This is the DB half of the two-layer defence implemented in issue #208:
--   * Frontend: serializeScheduleDateTime() returns null for past timestamps
--   * Database: RAISE EXCEPTION before any UPDATE is issued
--
-- Rollback: replace the function bodies with the originals (no schema change).

-- ─── fn_schedule_battle ────────────────────────────────────────────────────
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

  -- Reject NULL, malformed, or past execution times.
  -- The frontend enforces the same rule via serializeScheduleDateTime(); this
  -- constraint is the server-authoritative backstop against tampered payloads.
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
    b.id, b.slug, b.title, b.task_prompt, b.status, b.total_vote_count, b.published_at,
    b.voting_opens_at, b.voting_closes_at, b.battle_type, b.voter_eligibility, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id, b.workflow_id, b.lens_id,
    b.execution_starts_at, b.auto_publish, b.voting_duration_hours, b.vote_velocity, b.og_image_url,
    b.winner_contender_id, b.parent_battle_id, b.deleted_at;
END;
$$;

-- ─── fn_update_battle_execution_settings ───────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_update_battle_execution_settings"(
  "p_battle_id"            uuid,
  "p_execution_starts_at"  timestamp with time zone,
  "p_voting_duration_hours" integer,
  "p_auto_publish"         boolean
) RETURNS void
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

  UPDATE battles.battles
  SET    execution_starts_at   = p_execution_starts_at,
         voting_duration_hours = p_voting_duration_hours,
         auto_publish          = p_auto_publish
  WHERE  id = p_battle_id
    AND  creator_lenser_id = v_lenser_id;
END;
$$;

COMMENT ON FUNCTION "public"."fn_update_battle_execution_settings"(uuid, timestamp with time zone, integer, boolean)
  IS 'Security wrapper: update execution scheduling fields on a battle owned by the current user. Rejects past execution timestamps server-side (issue #208).';
