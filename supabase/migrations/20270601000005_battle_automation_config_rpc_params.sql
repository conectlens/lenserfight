-- Phase CT follow-up: carry automation_config through create/update battle RPCs.
-- Keeps the battles.battles JSONB column private to the battles schema while
-- preserving existing callers through defaulted parameters.

BEGIN;

DROP FUNCTION IF EXISTS public.fn_battles_create(text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.fn_battles_create(
  p_title text,
  p_slug text,
  p_task_prompt text,
  p_rubric_id uuid DEFAULT NULL::uuid,
  p_automation_config jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id   uuid;
  v_battle_id   uuid;
  v_count       integer;
  v_oldest_at   timestamptz;
  v_retry_after integer;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest_at
    FROM battles.battles
   WHERE creator_lenser_id = v_lenser_id
     AND created_at > now() - interval '1 hour';

  IF v_count >= 20 THEN
    v_retry_after := GREATEST(0, EXTRACT(epoch FROM (v_oldest_at + interval '1 hour' - now()))::integer);
    RAISE EXCEPTION 'battle_rate_limit_exceeded'
      USING HINT   = 'p0429',
            DETAIL = '{"retry_after":' || v_retry_after || '}';
  END IF;

  INSERT INTO battles.battles (
    creator_lenser_id,
    title,
    slug,
    task_prompt,
    rubric_id,
    status,
    automation_config
  )
  VALUES (
    v_lenser_id,
    p_title,
    p_slug,
    p_task_prompt,
    p_rubric_id,
    'draft',
    COALESCE(p_automation_config, '{}'::jsonb)
  )
  RETURNING id INTO v_battle_id;

  RETURN v_battle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_battles_create(text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_battles_create(text, text, text, uuid, jsonb) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_battles_create(text, text, text, uuid, jsonb) IS
  'Create a draft battle for the authenticated lenser. Accepts optional automation_config JSONB, capped by battles_automation_config_size_check.';

DROP FUNCTION IF EXISTS public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_update_battle(
  p_battle_id uuid,
  p_title text DEFAULT NULL::text,
  p_task_prompt text DEFAULT NULL::text,
  p_battle_type text DEFAULT NULL::text,
  p_voter_eligibility text DEFAULT NULL::text,
  p_handicap_config jsonb DEFAULT NULL::jsonb,
  p_workflow_id uuid DEFAULT NULL::uuid,
  p_lens_id uuid DEFAULT NULL::uuid,
  p_forum_thread_id uuid DEFAULT NULL::uuid,
  p_shared_input_snapshot jsonb DEFAULT NULL::jsonb,
  p_lenser_battle_policy jsonb DEFAULT NULL::jsonb,
  p_task_source text DEFAULT NULL::text,
  p_contender_structure text DEFAULT NULL::text,
  p_judging_mode text DEFAULT NULL::text,
  p_challenge_type text DEFAULT NULL::text,
  p_automation_config jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  task_prompt text,
  status text,
  total_vote_count integer,
  published_at timestamptz,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  battle_type text,
  voter_eligibility text,
  handicap_config jsonb,
  creator_lenser_id uuid,
  forum_thread_id text,
  workflow_id uuid,
  lens_id uuid,
  execution_starts_at timestamptz,
  auto_publish boolean,
  voting_duration_hours integer,
  vote_velocity numeric,
  og_image_url text,
  winner_contender_id uuid,
  parent_battle_id uuid,
  deleted_at timestamptz,
  task_source text,
  contender_structure text,
  judging_mode text,
  challenge_type text,
  shared_input_snapshot jsonb,
  lenser_battle_policy jsonb
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
    title                 = COALESCE(p_title,                                                b.title),
    task_prompt           = COALESCE(p_task_prompt,                                          b.task_prompt),
    battle_type           = COALESCE(p_battle_type::battles.battle_type_enum,                b.battle_type),
    voter_eligibility     = COALESCE(p_voter_eligibility::battles.voter_eligibility_enum,    b.voter_eligibility),
    handicap_config       = COALESCE(p_handicap_config,                                      b.handicap_config),
    workflow_id           = COALESCE(p_workflow_id,                                          b.workflow_id),
    lens_id               = COALESCE(p_lens_id,                                              b.lens_id),
    forum_thread_id       = COALESCE(p_forum_thread_id,                                      b.forum_thread_id),
    shared_input_snapshot = COALESCE(p_shared_input_snapshot,                                b.shared_input_snapshot),
    lenser_battle_policy  = COALESCE(p_lenser_battle_policy,                                 b.lenser_battle_policy),
    task_source           = COALESCE(p_task_source,                                          b.task_source),
    contender_structure   = COALESCE(p_contender_structure::battles.contender_structure_enum, b.contender_structure),
    judging_mode          = COALESCE(p_judging_mode::battles.judging_mode_enum,              b.judging_mode),
    challenge_type        = COALESCE(p_challenge_type,                                       b.challenge_type),
    automation_config     = COALESCE(p_automation_config,                                    b.automation_config)
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

REVOKE ALL ON FUNCTION public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb) IS
  'Update a battle draft owned by the current lenser. Accepts V2 axes and optional automation_config JSONB without exposing battles schema tables through PostgREST.';

COMMIT;
