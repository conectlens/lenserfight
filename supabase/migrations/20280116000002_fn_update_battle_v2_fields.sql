-- Migration: extend fn_update_battle with V2 concept-separation fields
-- Adds: p_task_source, p_contender_structure, p_judging_mode, p_challenge_type
-- Also adds these to the RETURNS TABLE so the returned row matches fn_get_battle output.
--
-- Context: battles.battles already has these columns (Phase CS migration).
-- fn_update_battle was never updated to write or return them, so createBattle()
-- in the wizard silently dropped all V2 axes on every battle creation.

DROP FUNCTION IF EXISTS public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb
);

CREATE OR REPLACE FUNCTION public.fn_update_battle(
  p_battle_id           uuid,
  p_title               text    DEFAULT NULL,
  p_task_prompt         text    DEFAULT NULL,
  p_battle_type         text    DEFAULT NULL,
  p_voter_eligibility   text    DEFAULT NULL,
  p_handicap_config     jsonb   DEFAULT NULL,
  p_workflow_id         uuid    DEFAULT NULL,
  p_lens_id             uuid    DEFAULT NULL,
  p_forum_thread_id     uuid    DEFAULT NULL,
  p_shared_input_snapshot jsonb DEFAULT NULL,
  p_lenser_battle_policy  jsonb DEFAULT NULL,
  -- V2 concept-separation axes
  p_task_source         text    DEFAULT NULL,
  p_contender_structure text    DEFAULT NULL,
  p_judging_mode        text    DEFAULT NULL,
  p_challenge_type      text    DEFAULT NULL
)
RETURNS TABLE(
  id                    uuid,
  slug                  text,
  title                 text,
  task_prompt           text,
  status                text,
  total_vote_count      integer,
  published_at          timestamp with time zone,
  voting_opens_at       timestamp with time zone,
  voting_closes_at      timestamp with time zone,
  battle_type           text,
  voter_eligibility     text,
  handicap_config       jsonb,
  creator_lenser_id     uuid,
  forum_thread_id       text,
  workflow_id           uuid,
  lens_id               uuid,
  execution_starts_at   timestamp with time zone,
  auto_publish          boolean,
  voting_duration_hours integer,
  vote_velocity         numeric,
  og_image_url          text,
  winner_contender_id   uuid,
  parent_battle_id      uuid,
  deleted_at            timestamp with time zone,
  -- V2 fields
  task_source           text,
  contender_structure   text,
  judging_mode          text,
  challenge_type        text,
  shared_input_snapshot jsonb,
  lenser_battle_policy  jsonb
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
    lenser_battle_policy  = COALESCE(p_lenser_battle_policy,                               b.lenser_battle_policy),
    task_source           = COALESCE(p_task_source,                                        b.task_source),
    contender_structure   = COALESCE(p_contender_structure::battles.contender_structure_enum, b.contender_structure),
    judging_mode          = COALESCE(p_judging_mode::battles.judging_mode_enum,            b.judging_mode),
    challenge_type        = COALESCE(p_challenge_type,                                     b.challenge_type)
  WHERE b.id = p_battle_id
    AND b.creator_lenser_id = v_lenser_id
  RETURNING
    b.id, b.slug, b.title, b.task_prompt, b.status::text, b.total_vote_count,
    b.published_at, b.voting_opens_at, b.voting_closes_at,
    b.battle_type::text, b.voter_eligibility::text, b.handicap_config,
    b.creator_lenser_id, b.forum_thread_id::text, b.workflow_id, b.lens_id,
    b.execution_starts_at, b.auto_publish, b.voting_duration_hours,
    b.vote_velocity, b.og_image_url, b.winner_contender_id,
    b.parent_battle_id, b.deleted_at,
    b.task_source, b.contender_structure::text, b.judging_mode::text,
    b.challenge_type, b.shared_input_snapshot, b.lenser_battle_policy;
END;
$$;

ALTER FUNCTION public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text
) OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text
) TO anon;
GRANT ALL ON FUNCTION public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text
) TO authenticated;
GRANT ALL ON FUNCTION public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.fn_update_battle(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text
) IS
  'Update a battle draft. Caller must be the creator. All params are optional — only non-null values overwrite. '
  'Now accepts and returns V2 concept-separation axes: task_source, contender_structure, judging_mode, challenge_type.';
