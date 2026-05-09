-- Phase 4: Vote rate-limit guard
-- fn_check_vote_rate_limit returns false if the same voter already voted on
-- the same battle within the last 60 seconds.

CREATE OR REPLACE FUNCTION battles.fn_check_vote_rate_limit(
  p_voter_lenser_id uuid,
  p_battle_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM battles.votes
    WHERE voter_lenser_id  = p_voter_lenser_id
      AND battle_id = p_battle_id
      AND created_at > (now() - INTERVAL '60 seconds')
  );
$$;

GRANT EXECUTE ON FUNCTION battles.fn_check_vote_rate_limit(uuid, uuid) TO authenticated;

-- Wire the rate-limit guard into fn_submit_vote.
-- The canonical vote-casting RPC must reject duplicate submissions within 60s.
CREATE OR REPLACE FUNCTION public.fn_submit_vote(
  p_battle_id          uuid,
  p_voted_contender_id uuid,
  p_vote_value         text,
  p_is_draw            boolean DEFAULT false,
  p_rationale          text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voter_lenser_id  uuid;
  v_vote_id   uuid;
BEGIN
  v_voter_lenser_id := lensers.get_auth_lenser_id();

  -- Rate-limit: one vote per voter per battle per 60 s
  IF NOT battles.fn_check_vote_rate_limit(v_voter_lenser_id, p_battle_id) THEN
    RAISE EXCEPTION 'RATE_LIMIT: vote rate limit exceeded for battle %', p_battle_id
      USING ERRCODE = 'P0429';
  END IF;

  INSERT INTO battles.votes (
    battle_id,
    voter_lenser_id,
    voted_contender_id,
    vote_value,
    is_draw,
    rationale
  )
  VALUES (
    p_battle_id,
    v_voter_lenser_id,
    p_voted_contender_id,
    p_vote_value,
    p_is_draw,
    p_rationale
  )
  RETURNING id INTO v_vote_id;

  RETURN jsonb_build_object(
    'vote_id',   v_vote_id,
    'status',    'submitted',
    'battle_id', p_battle_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_submit_vote(uuid, uuid, text, boolean, text) TO authenticated;
