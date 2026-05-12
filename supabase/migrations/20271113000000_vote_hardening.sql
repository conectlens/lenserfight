-- Phase BM — Vote hardening.
--
-- 1. battles.votes gains updated_at (back-fills to created_at).
-- 2. trg_votes_updated_at maintains it on UPDATE.
-- 3. fn_battles_get_my_vote returns contender_id + value + updated_at so the
--    UI can render "voted N minutes ago".
-- 4. fn_battles_change_vote performs an idempotent vote swap inside a single
--    transaction:
--      - asserts battle.status='voting'
--      - upserts the row (no double-vote — UNIQUE(battle_id, voter_lenser_id)
--        is DEFERRABLE so we delete-then-insert in the same txn).
--      - re-derives vote_aggregates to keep counts consistent.
--
-- Raises P0001 ('battle_closed') when the battle is no longer in voting.

-- ── 1. updated_at column + trigger ──────────────────────────────────────────
ALTER TABLE battles.votes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE battles.votes SET updated_at = created_at WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION battles.fn_votes_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

ALTER FUNCTION battles.fn_votes_set_updated_at() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_votes_set_updated_at ON battles.votes;
CREATE TRIGGER trg_votes_set_updated_at
  BEFORE UPDATE ON battles.votes
  FOR EACH ROW EXECUTE FUNCTION battles.fn_votes_set_updated_at();

-- ── 2. fn_battles_get_my_vote — replace existing reader ─────────────────────
DROP FUNCTION IF EXISTS public.fn_battles_get_my_vote(uuid);
CREATE OR REPLACE FUNCTION public.fn_battles_get_my_vote(p_battle_id UUID)
RETURNS TABLE(
  contender_id UUID,
  vote_value   TEXT,
  is_draw      BOOLEAN,
  updated_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
  SELECT
    v.voted_contender_id AS contender_id,
    v.vote_value::text   AS vote_value,
    v.is_draw,
    v.updated_at
  FROM battles.votes v
  WHERE v.battle_id       = p_battle_id
    AND v.voter_lenser_id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_battles_get_my_vote(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_get_my_vote(UUID)
  TO authenticated, service_role;

-- ── 3. fn_battles_change_vote ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_change_vote(
  p_battle_id        UUID,
  p_new_contender_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_voter      UUID;
  v_status     TEXT;
  v_existing   battles.votes%ROWTYPE;
  v_old_cid    UUID;
BEGIN
  v_voter := lensers.get_auth_lenser_id();
  IF v_voter IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT status::text INTO v_status
    FROM battles.battles WHERE id = p_battle_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'battle_not_found' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'voting' THEN
    RAISE EXCEPTION 'battle_closed: status=%', v_status USING ERRCODE = 'P0001';
  END IF;

  -- contender must belong to this battle
  IF NOT EXISTS (
    SELECT 1 FROM battles.contenders
     WHERE id = p_new_contender_id AND battle_id = p_battle_id
  ) THEN
    RAISE EXCEPTION 'contender_not_in_battle' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
    FROM battles.votes
   WHERE battle_id = p_battle_id
     AND voter_lenser_id = v_voter
   FOR UPDATE;

  IF v_existing.id IS NULL THEN
    -- First vote — just delegate to fn_submit_vote semantics inline.
    INSERT INTO battles.votes (
      battle_id, voter_lenser_id, vote_value, voted_contender_id, is_draw, rationale
    )
    VALUES (
      p_battle_id, v_voter, 'contender_a'::battles.vote_value_enum,
      p_new_contender_id, false, NULL
    )
    RETURNING * INTO v_existing;

    INSERT INTO battles.vote_aggregates (
      battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count
    ) VALUES (
      p_battle_id, p_new_contender_id, 1, 1, 0
    )
    ON CONFLICT (battle_id, contender_id) DO UPDATE SET
      raw_vote_count    = battles.vote_aggregates.raw_vote_count + 1,
      weighted_vote_sum = battles.vote_aggregates.weighted_vote_sum + 1,
      updated_at        = now();

    UPDATE battles.battles
       SET total_vote_count = total_vote_count + 1
     WHERE id = p_battle_id;

    RETURN jsonb_build_object(
      'vote_id',    v_existing.id,
      'updated_at', v_existing.updated_at,
      'status',     'created'
    );
  END IF;

  v_old_cid := v_existing.voted_contender_id;
  IF v_old_cid IS NOT DISTINCT FROM p_new_contender_id THEN
    -- No-op; touch updated_at so callers can see the action.
    UPDATE battles.votes
       SET updated_at = now()
     WHERE id = v_existing.id
     RETURNING updated_at INTO v_existing.updated_at;

    RETURN jsonb_build_object(
      'vote_id',    v_existing.id,
      'updated_at', v_existing.updated_at,
      'status',     'unchanged'
    );
  END IF;

  -- Swap: decrement the old aggregate, increment the new one, update the row.
  UPDATE battles.vote_aggregates
     SET raw_vote_count    = GREATEST(raw_vote_count    - 1, 0),
         weighted_vote_sum = GREATEST(weighted_vote_sum - 1, 0),
         updated_at        = now()
   WHERE battle_id = p_battle_id
     AND contender_id = v_old_cid;

  INSERT INTO battles.vote_aggregates (
    battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count
  ) VALUES (
    p_battle_id, p_new_contender_id, 1, 1, 0
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE SET
    raw_vote_count    = battles.vote_aggregates.raw_vote_count + 1,
    weighted_vote_sum = battles.vote_aggregates.weighted_vote_sum + 1,
    updated_at        = now();

  UPDATE battles.votes
     SET voted_contender_id = p_new_contender_id
   WHERE id = v_existing.id
   RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'vote_id',    v_existing.id,
    'updated_at', v_existing.updated_at,
    'status',     'changed'
  );
END $$;

ALTER FUNCTION public.fn_battles_change_vote(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_change_vote(UUID, UUID)
  TO authenticated, service_role;
