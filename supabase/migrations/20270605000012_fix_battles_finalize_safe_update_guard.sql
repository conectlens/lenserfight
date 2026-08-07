-- fn_battles_finalize's three score-assignment UPDATEs
-- (UPDATE _battle_finalize_scores SET score = ...) intentionally touch every
-- row of the per-battle temp table — there's no bug in the logic — but this
-- project has the pg-safeupdate style guard active, which rejects any UPDATE
-- lacking a WHERE clause with "UPDATE requires a WHERE clause", regardless of
-- whether an unconditional update is intentional. This made `lf battle
-- finalize` (and the web app's finalize button, same RPC) fail for every
-- battle.
--
-- Fix: add `WHERE contender_id IS NOT NULL` — always true for every row in
-- this temp table (contender_id is the join key from battles.contenders,
-- never null) — purely to satisfy the guard. No behavior change.

CREATE OR REPLACE FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'xp', 'reputation'
    AS $$
DECLARE
    v_battle           RECORD;
    v_winner_id        uuid;
    v_mode             text;
    v_has_votes        boolean;
    v_has_verdicts     boolean;
    v_max_votes        numeric;
    v_max_judge        numeric;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id
    FOR UPDATE;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status NOT IN ('voting', 'scoring') THEN
        RAISE EXCEPTION 'Battle must be in voting or scoring status to finalize (current: %)', v_battle.status;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM battles.vote_aggregates
        WHERE battle_id = p_battle_id AND raw_vote_count > 0
    ) INTO v_has_votes;

    SELECT EXISTS (
        SELECT 1 FROM battles.ai_judge_verdicts WHERE battle_id = p_battle_id
    ) INTO v_has_verdicts;

    IF v_battle.judging_mode = 'ai_judge'
       OR (v_battle.judging_mode IS NULL AND v_battle.ai_judge_enabled AND NOT v_has_votes) THEN
        v_mode := 'ai_judge';
    ELSIF v_battle.ai_judge_enabled IS TRUE AND v_has_verdicts AND NOT v_has_votes THEN
        v_mode := 'ai_judge';
    ELSIF v_battle.ai_judge_enabled IS TRUE AND v_has_votes THEN
        v_mode := 'hybrid';
    ELSIF v_battle.judging_mode IN ('rubric_score', 'auto_score') AND v_has_verdicts THEN
        v_mode := 'ai_judge';
    ELSE
        v_mode := 'community';
    END IF;

    IF v_mode = 'ai_judge' AND NOT v_has_verdicts THEN
        RAISE EXCEPTION 'Cannot finalize ai_judge battle %: AI verdicts not recorded yet', p_battle_id
            USING HINT = 'ai_verdicts_missing';
    END IF;

    DROP TABLE IF EXISTS _battle_finalize_scores;
    CREATE TEMP TABLE _battle_finalize_scores ON COMMIT DROP AS
    WITH contenders AS (
        SELECT c.id AS contender_id
        FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
    ),
    votes AS (
        SELECT va.contender_id,
               va.raw_vote_count::numeric    AS raw_vote_count,
               va.weighted_vote_sum::numeric AS weighted_vote_sum
        FROM battles.vote_aggregates va
        WHERE va.battle_id = p_battle_id
    ),
    judge AS (
        SELECT v.contender_id,
               SUM(v.score * COALESCE(rc.weight, 1.0))
                 / NULLIF(SUM(COALESCE(rc.weight, 1.0)), 0) AS judge_mean
        FROM battles.ai_judge_verdicts v
        LEFT JOIN battles.rubric_criteria rc ON rc.id = v.criterion_id
        WHERE v.battle_id = p_battle_id
        GROUP BY v.contender_id
    ),
    submitted AS (
        SELECT s.contender_id, MIN(s.submitted_at) AS submitted_at
        FROM battles.submissions s
        WHERE s.battle_id = p_battle_id
        GROUP BY s.contender_id
    )
    SELECT c.contender_id,
           COALESCE(vt.raw_vote_count, 0)    AS raw_vote_count,
           COALESCE(vt.weighted_vote_sum, 0) AS weighted_vote_sum,
           COALESCE(j.judge_mean, 0)         AS judge_mean,
           sub.submitted_at,
           0::numeric                        AS score
    FROM contenders c
    LEFT JOIN votes     vt  ON vt.contender_id  = c.contender_id
    LEFT JOIN judge     j   ON j.contender_id   = c.contender_id
    LEFT JOIN submitted sub ON sub.contender_id = c.contender_id;

    SELECT MAX(raw_vote_count), MAX(judge_mean)
    INTO v_max_votes, v_max_judge
    FROM _battle_finalize_scores;

    -- WHERE contender_id IS NOT NULL added below to satisfy the safe-update
    -- guard; these updates are, and always were, meant to touch every row.
    IF v_mode = 'community' THEN
        UPDATE _battle_finalize_scores SET score = raw_vote_count
        WHERE contender_id IS NOT NULL;
    ELSIF v_mode = 'ai_judge' THEN
        UPDATE _battle_finalize_scores SET score = judge_mean
        WHERE contender_id IS NOT NULL;
    ELSE
        UPDATE _battle_finalize_scores
        SET score = ROUND(
            0.5 * (raw_vote_count / NULLIF(v_max_votes, 0))
          + 0.5 * (judge_mean / 10.0), 4)
        WHERE contender_id IS NOT NULL;
    END IF;

    SELECT contender_id INTO v_winner_id
    FROM _battle_finalize_scores
    ORDER BY score DESC,
             raw_vote_count DESC,
             weighted_vote_sum DESC,
             submitted_at ASC NULLS LAST,
             contender_id ASC
    LIMIT 1;

    INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, rank_position)
    SELECT p_battle_id, s.contender_id, s.raw_vote_count, s.weighted_vote_sum,
           ROW_NUMBER() OVER (
             ORDER BY s.score DESC,
                      s.raw_vote_count DESC,
                      s.weighted_vote_sum DESC,
                      s.submitted_at ASC NULLS LAST,
                      s.contender_id ASC
           )
    FROM _battle_finalize_scores s
    ON CONFLICT (battle_id, contender_id) DO UPDATE
      SET rank_position = EXCLUDED.rank_position,
          updated_at    = now();

    UPDATE battles.battles
    SET status = 'closed',
        winner_contender_id = v_winner_id,
        finalized_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;

    BEGIN
      PERFORM public.fn_compute_elo_after_battle(p_battle_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_compute_elo_after_battle failed for battle %: %', p_battle_id, SQLERRM;
    END;

    BEGIN
      PERFORM public.fn_notify_battle_result(p_battle_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_notify_battle_result failed for battle %: %', p_battle_id, SQLERRM;
    END;
END;
$$;
