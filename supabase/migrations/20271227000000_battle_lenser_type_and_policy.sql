-- ============================================================================
-- Battle Lenser Type + Policy Migration
-- ============================================================================
-- Adds:
-- 1. 'lenser_battle' to battles.battle_type_enum (was in frontend only)
-- 2. shared_input_snapshot JSONB column for Lens Battle parameter fairness
-- 3. lenser_battle_policy JSONB column for Lenser Battle memory/instruction rules
-- 4. CHECK constraint on lenser_battle_policy shape
-- ============================================================================

-- 1. Add missing enum value ─────────────────────────────────────────────────
-- ALTER TYPE ... ADD VALUE is append-only and non-destructive.
-- IF NOT EXISTS prevents failure on re-run.
ALTER TYPE battles.battle_type_enum ADD VALUE IF NOT EXISTS 'lenser_battle';

-- 2. Shared input snapshot ──────────────────────────────────────────────────
-- Stores the resolved Lens [[parameter]] values that ALL contenders receive.
-- Immutable after battle creation — ensures fairness.
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS shared_input_snapshot jsonb DEFAULT NULL;

COMMENT ON COLUMN battles.battles.shared_input_snapshot IS
  'Immutable snapshot of shared Lens [[parameter]] values resolved at battle creation time. All contenders receive these identical inputs.';

-- 3. Lenser Battle policy ───────────────────────────────────────────────────
-- Controls memory mode, instruction disclosure, and model binding override
-- for Lenser Battles where contenders bring their own AI identity.
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS lenser_battle_policy jsonb DEFAULT NULL;

COMMENT ON COLUMN battles.battles.lenser_battle_policy IS
  'Memory mode, instruction disclosure, and model binding override rules for Lenser Battles. NULL for non-Lenser Battle formats.';

-- 4. CHECK constraint ───────────────────────────────────────────────────────
-- Ensures lenser_battle_policy shape is valid when present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lenser_battle_policy_format'
  ) THEN
    ALTER TABLE battles.battles
      ADD CONSTRAINT chk_lenser_battle_policy_format
      CHECK (
        lenser_battle_policy IS NULL
        OR (
          lenser_battle_policy->>'memory_mode' IN ('clean_room', 'personality', 'unrestricted')
          AND lenser_battle_policy->>'instruction_disclosure' IN ('hidden', 'visible_after_close', 'always_visible')
        )
      );
  END IF;
END
$$;

-- 5. Update fn_update_battle to accept new columns ─────────────────────────
-- Drop the old overload first, then create the extended version.

DROP FUNCTION IF EXISTS "public"."fn_update_battle"(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid
);

CREATE OR REPLACE FUNCTION "public"."fn_update_battle"(
  "p_battle_id"              uuid,
  "p_title"                  text  DEFAULT NULL,
  "p_task_prompt"            text  DEFAULT NULL,
  "p_battle_type"            text  DEFAULT NULL,
  "p_voter_eligibility"      text  DEFAULT NULL,
  "p_handicap_config"        jsonb DEFAULT NULL,
  "p_workflow_id"            uuid  DEFAULT NULL,
  "p_lens_id"                uuid  DEFAULT NULL,
  "p_forum_thread_id"        uuid  DEFAULT NULL,
  "p_shared_input_snapshot"  jsonb DEFAULT NULL,
  "p_lenser_battle_policy"   jsonb DEFAULT NULL
)
RETURNS TABLE(
  "id"                     uuid,
  "slug"                   text,
  "title"                  text,
  "task_prompt"            text,
  "status"                 text,
  "total_vote_count"       integer,
  "published_at"           timestamptz,
  "voting_opens_at"        timestamptz,
  "voting_closes_at"       timestamptz,
  "battle_type"            text,
  "voter_eligibility"      text,
  "handicap_config"        jsonb,
  "creator_lenser_id"      uuid,
  "forum_thread_id"        text,
  "workflow_id"            uuid,
  "lens_id"                uuid,
  "execution_starts_at"    timestamptz,
  "auto_publish"           boolean,
  "voting_duration_hours"  integer,
  "vote_velocity"          numeric,
  "og_image_url"           text,
  "winner_contender_id"    uuid,
  "parent_battle_id"       uuid,
  "deleted_at"             timestamptz
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
    title                 = COALESCE(p_title,                                              b.title),
    task_prompt           = COALESCE(p_task_prompt,                                        b.task_prompt),
    battle_type           = COALESCE(p_battle_type::battles.battle_type_enum,              b.battle_type),
    voter_eligibility     = COALESCE(p_voter_eligibility::battles.voter_eligibility_enum,  b.voter_eligibility),
    handicap_config       = COALESCE(p_handicap_config,                                    b.handicap_config),
    workflow_id           = COALESCE(p_workflow_id,                                        b.workflow_id),
    lens_id               = COALESCE(p_lens_id,                                            b.lens_id),
    forum_thread_id       = COALESCE(p_forum_thread_id,                                    b.forum_thread_id),
    shared_input_snapshot = COALESCE(p_shared_input_snapshot,                              b.shared_input_snapshot),
    lenser_battle_policy  = COALESCE(p_lenser_battle_policy,                               b.lenser_battle_policy)
  WHERE b.id = p_battle_id
    AND b.creator_lenser_id = v_lenser_id
  RETURNING
    b.id, b.slug, b.title, b.task_prompt, b.status::text, b.total_vote_count,
    b.published_at, b.voting_opens_at, b.voting_closes_at,
    b.battle_type::text, b.voter_eligibility::text, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id::text, b.workflow_id, b.lens_id,
    b.execution_starts_at, b.auto_publish, b.voting_duration_hours,
    b.vote_velocity, b.og_image_url, b.winner_contender_id,
    b.parent_battle_id, b.deleted_at;
END;
$$;

ALTER FUNCTION "public"."fn_update_battle"(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb
) OWNER TO postgres;

REVOKE ALL ON FUNCTION "public"."fn_update_battle"(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "public"."fn_update_battle"(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb
) TO authenticated, service_role;
