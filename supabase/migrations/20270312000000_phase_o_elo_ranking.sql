-- Phase O3: Per-battle ELO ranking compute
--
-- After a battle finalizes (status → 'closed' with a `winner_contender_id`),
-- update `reputation.lenser_scores` (score_type='elo') for the winner and
-- loser using the standard K=32 formula:
--
--   E_player        = 1 / (1 + 10^((opponent - player) / 400))
--   winner_new      = winner_elo + 32 * (1 - E_winner)
--   loser_new       = loser_elo  + 32 * (0 - E_loser)
--
-- For drawn battles (`winner_contender_id IS NULL` after finalization), each
-- contender receives `K * (0.5 - E_player)` instead of win/loss values.
--
-- Idempotency: each battle is logged in `reputation.elo_battle_log` with a
-- PRIMARY KEY on `battle_id`. Re-invocation no-ops via INSERT … ON CONFLICT
-- DO NOTHING + RETURNING-empty short-circuit.
--
-- Storage choice
--   We update `reputation.lenser_scores` (the existing source of truth used
--   by `xp.v_leaderboard`) rather than introducing a new column on
--   `battles.contenders`. This keeps a single ELO source of truth.

-- ─── 1. Idempotency log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reputation.elo_battle_log (
  battle_id          uuid        PRIMARY KEY,
  computed_at        timestamptz NOT NULL DEFAULT now(),
  winner_lenser_id   uuid,
  loser_lenser_id    uuid,
  is_draw            boolean     NOT NULL DEFAULT false,
  winner_score_before numeric(10,4),
  winner_score_after  numeric(10,4),
  loser_score_before  numeric(10,4),
  loser_score_after   numeric(10,4),
  k_factor           integer     NOT NULL DEFAULT 32
);

ALTER TABLE reputation.elo_battle_log OWNER TO postgres;

COMMENT ON TABLE reputation.elo_battle_log IS
  'Phase O3: idempotency + audit log for per-battle ELO updates. PK on '
  'battle_id ensures each battle is scored at most once.';

-- ─── 2. fn_compute_elo_after_battle ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_compute_elo_after_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, reputation
AS $$
DECLARE
  v_battle           battles.battles%ROWTYPE;
  v_winner_lenser_id uuid;
  v_loser_lenser_id  uuid;
  v_winner_score     numeric(10,4);
  v_loser_score      numeric(10,4);
  v_winner_new       numeric(10,4);
  v_loser_new        numeric(10,4);
  v_e_winner         numeric;
  v_e_loser          numeric;
  v_k_factor         constant integer := 32;
  v_default_score    constant numeric := 1000;
  v_is_draw          boolean := false;
BEGIN
  -- Idempotency guard: insert log row first; bail if a row already exists.
  INSERT INTO reputation.elo_battle_log (battle_id, k_factor)
  VALUES (p_battle_id, v_k_factor)
  ON CONFLICT (battle_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_computed', 'battle_id', p_battle_id);
  END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    -- Battle vanished after we logged; clean up to allow a future retry.
    DELETE FROM reputation.elo_battle_log WHERE battle_id = p_battle_id;
    RAISE EXCEPTION 'Battle % not found', p_battle_id USING ERRCODE = '42704';
  END IF;

  IF v_battle.status <> 'closed' THEN
    DELETE FROM reputation.elo_battle_log WHERE battle_id = p_battle_id;
    RAISE EXCEPTION 'Battle % is in status %, must be closed before ELO compute',
      p_battle_id, v_battle.status USING ERRCODE = '22023';
  END IF;

  -- Resolve winner/loser. NULL winner_contender_id ⇒ tie.
  IF v_battle.winner_contender_id IS NULL THEN
    v_is_draw := true;
    SELECT contender_ref_id
      INTO v_winner_lenser_id
    FROM battles.contenders
    WHERE battle_id = p_battle_id AND slot = 'A'
    LIMIT 1;

    SELECT contender_ref_id
      INTO v_loser_lenser_id
    FROM battles.contenders
    WHERE battle_id = p_battle_id AND slot = 'B'
    LIMIT 1;
  ELSE
    SELECT contender_ref_id
      INTO v_winner_lenser_id
    FROM battles.contenders
    WHERE id = v_battle.winner_contender_id;

    SELECT contender_ref_id
      INTO v_loser_lenser_id
    FROM battles.contenders
    WHERE battle_id = p_battle_id
      AND id <> v_battle.winner_contender_id
    LIMIT 1;
  END IF;

  IF v_winner_lenser_id IS NULL OR v_loser_lenser_id IS NULL THEN
    DELETE FROM reputation.elo_battle_log WHERE battle_id = p_battle_id;
    RAISE EXCEPTION 'Battle % has insufficient contenders for ELO compute', p_battle_id
      USING ERRCODE = '22023';
  END IF;

  -- Read current ELO scores; default 1000 if no row.
  SELECT score INTO v_winner_score
    FROM reputation.lenser_scores
   WHERE lenser_id = v_winner_lenser_id AND score_type = 'elo';
  v_winner_score := COALESCE(v_winner_score, v_default_score);

  SELECT score INTO v_loser_score
    FROM reputation.lenser_scores
   WHERE lenser_id = v_loser_lenser_id AND score_type = 'elo';
  v_loser_score := COALESCE(v_loser_score, v_default_score);

  -- Expected scores.
  v_e_winner := 1.0 / (1.0 + power(10.0, (v_loser_score - v_winner_score) / 400.0));
  v_e_loser  := 1.0 / (1.0 + power(10.0, (v_winner_score - v_loser_score) / 400.0));

  IF v_is_draw THEN
    v_winner_new := v_winner_score + v_k_factor * (0.5 - v_e_winner);
    v_loser_new  := v_loser_score  + v_k_factor * (0.5 - v_e_loser);
  ELSE
    v_winner_new := v_winner_score + v_k_factor * (1.0 - v_e_winner);
    v_loser_new  := v_loser_score  + v_k_factor * (0.0 - v_e_loser);
  END IF;

  -- Persist updated scores.
  INSERT INTO reputation.lenser_scores (lenser_id, score_type, score, computed_at)
  VALUES (v_winner_lenser_id, 'elo', v_winner_new, now())
  ON CONFLICT (lenser_id, score_type) DO UPDATE
    SET score = EXCLUDED.score, computed_at = now();

  INSERT INTO reputation.lenser_scores (lenser_id, score_type, score, computed_at)
  VALUES (v_loser_lenser_id, 'elo', v_loser_new, now())
  ON CONFLICT (lenser_id, score_type) DO UPDATE
    SET score = EXCLUDED.score, computed_at = now();

  -- Backfill the audit log row inserted at top of function.
  UPDATE reputation.elo_battle_log
  SET winner_lenser_id    = v_winner_lenser_id,
      loser_lenser_id     = v_loser_lenser_id,
      is_draw             = v_is_draw,
      winner_score_before = v_winner_score,
      winner_score_after  = v_winner_new,
      loser_score_before  = v_loser_score,
      loser_score_after   = v_loser_new
  WHERE battle_id = p_battle_id;

  RETURN jsonb_build_object(
    'battle_id',           p_battle_id,
    'is_draw',             v_is_draw,
    'winner_lenser_id',    v_winner_lenser_id,
    'loser_lenser_id',     v_loser_lenser_id,
    'winner_score_before', v_winner_score,
    'winner_score_after',  v_winner_new,
    'loser_score_before',  v_loser_score,
    'loser_score_after',   v_loser_new,
    'k_factor',            v_k_factor
  );
END;
$$;

ALTER FUNCTION public.fn_compute_elo_after_battle(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_compute_elo_after_battle(uuid) IS
  'Phase O3: K=32 per-battle ELO update. Reads winner/loser from '
  'battles.contenders, applies the standard formula, upserts '
  'reputation.lenser_scores (score_type=elo), and logs the operation in '
  'reputation.elo_battle_log for idempotency.';

GRANT EXECUTE ON FUNCTION public.fn_compute_elo_after_battle(uuid) TO service_role;

-- Ensure (lenser_id, score_type) is uniquely indexed so the upsert above is
-- well-defined. The original table has no UNIQUE on this pair.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lenser_scores_lenser_type
  ON reputation.lenser_scores (lenser_id, score_type);

-- ─── 3. Hook into fn_battles_finalize ────────────────────────────────────────
-- Wrap the existing finalize function: after it transitions the battle to
-- 'closed', call fn_compute_elo_after_battle. Errors are swallowed so a bad
-- ELO compute never reverts a finalized battle.

CREATE OR REPLACE FUNCTION public.fn_battles_finalize(p_battle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers', 'xp', 'reputation'
AS $$
DECLARE
    v_battle RECORD;
    v_winner_id uuid;
    v_top RECORD;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status NOT IN ('voting', 'scoring') THEN
        RAISE EXCEPTION 'Battle must be in voting or scoring status to finalize (current: %)', v_battle.status;
    END IF;

    SELECT contender_id, raw_vote_count
    INTO v_top
    FROM battles.vote_aggregates
    WHERE battle_id = p_battle_id
    ORDER BY raw_vote_count DESC
    LIMIT 1;

    IF v_top IS NOT NULL THEN
        DECLARE
            v_tie_count int;
        BEGIN
            SELECT COUNT(*) INTO v_tie_count
            FROM battles.vote_aggregates
            WHERE battle_id = p_battle_id
              AND raw_vote_count = v_top.raw_vote_count;

            IF v_tie_count > 1 THEN
                v_winner_id := NULL;
            ELSE
                v_winner_id := v_top.contender_id;
            END IF;
        END;
    END IF;

    UPDATE battles.vote_aggregates va
    SET rank_position = sub.rk
    FROM (
        SELECT contender_id,
               ROW_NUMBER() OVER (ORDER BY raw_vote_count DESC, weighted_vote_sum DESC) AS rk
        FROM battles.vote_aggregates
        WHERE battle_id = p_battle_id
    ) sub
    WHERE va.battle_id = p_battle_id
      AND va.contender_id = sub.contender_id;

    UPDATE battles.battles
    SET status = 'closed',
        winner_contender_id = v_winner_id,
        finalized_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;

    -- Phase O3: per-battle ELO update. Best-effort — never roll back finalize.
    BEGIN
      PERFORM public.fn_compute_elo_after_battle(p_battle_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_compute_elo_after_battle failed for battle %: %', p_battle_id, SQLERRM;
    END;
END;
$$;

ALTER FUNCTION public.fn_battles_finalize(uuid) OWNER TO postgres;
