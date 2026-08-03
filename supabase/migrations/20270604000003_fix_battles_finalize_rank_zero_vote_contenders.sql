-- ============================================================================
-- Fix: fn_battles_finalize never rank-stamps a contender with zero votes.
--
-- Bug (found by pgTAP 99_battle_finalize_e2e.sql test 13 -- "community: B is
-- rank_position 2", have NULL want 2):
--   battles.vote_aggregates rows are created lazily, only when a contender
--   receives its first vote (public.fn_submit_vote upserts on
--   (battle_id, contender_id)). fn_battles_finalize (20270601000013) persisted
--   rank_position with a plain UPDATE ... WHERE va.contender_id = sub.contender_id,
--   which is a no-op for any contender that never got a vote_aggregates row --
--   e.g. the loser of a 2-0 community battle where the loser received zero
--   votes. That contender's rank_position stayed permanently NULL after the
--   battle closed.
--
-- Fix: change the persistence step from UPDATE-only to an UPSERT
-- (INSERT ... ON CONFLICT (battle_id, contender_id) DO UPDATE), so every
-- contender computed in _battle_finalize_scores gets a vote_aggregates row
-- with its rank stamped, regardless of whether it ever received a vote.
-- raw_vote_count/weighted_vote_sum default to 0 on insert, matching the
-- COALESCE(..., 0) already used when _battle_finalize_scores is built.
--
-- No table/column DDL. CREATE OR REPLACE on an existing SECURITY DEFINER
-- function; grants unchanged (Postgres preserves ACLs across REPLACE).
-- ============================================================================

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
    -- FOR UPDATE: serialize concurrent finalizers (worker cycle vs manual button
    -- vs CLI vs score-aggregator). The loser blocks, then re-reads status='closed'
    -- below and is rejected -- preventing double winner-write / double ELO /
    -- duplicate result notifications.
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

    -- Derive effective scoring mode. judging_mode_enum has NO 'hybrid' value and
    -- is NULLABLE on existing rows, so "hybrid" is INFERRED from ai_judge_enabled
    -- plus the simultaneous presence of community votes -- never an enum value.
    IF v_battle.judging_mode = 'ai_judge'
       OR (v_battle.judging_mode IS NULL AND v_battle.ai_judge_enabled AND NOT v_has_votes) THEN
        v_mode := 'ai_judge';
    ELSIF v_battle.ai_judge_enabled IS TRUE AND v_has_verdicts AND NOT v_has_votes THEN
        -- ai_judge_enabled battle (any judging_mode, incl. 'community_vote') that
        -- got verdicts but zero community votes: judge the verdicts, do not
        -- declare an all-tied community result.
        v_mode := 'ai_judge';
    ELSIF v_battle.ai_judge_enabled IS TRUE AND v_has_votes THEN
        v_mode := 'hybrid';
    ELSIF v_battle.judging_mode IN ('rubric_score', 'auto_score') AND v_has_verdicts THEN
        v_mode := 'ai_judge';
    ELSE
        v_mode := 'community';
    END IF;

    -- Guard: never score an ai_judge battle with no verdicts (would rank every
    -- contender 0 and pick an arbitrary tie-break winner). Callers that reach
    -- here without verdicts (manual Finalize button, CLI, or the cycle's
    -- no-dispatch-channel fallback) get a clear error instead of a wrong winner.
    IF v_mode = 'ai_judge' AND NOT v_has_verdicts THEN
        RAISE EXCEPTION 'Cannot finalize ai_judge battle %: AI verdicts not recorded yet', p_battle_id
            USING HINT = 'ai_verdicts_missing';
    END IF;

    -- Per-contender score + deterministic tie-break inputs, gathered into a temp
    -- result set. submitted_at ASC rewards whoever answered first; contender_id
    -- ASC is the final stable backstop so the winner is fully deterministic and
    -- NEVER left NULL. Deterministic order is:
    --   score DESC, raw_vote_count DESC, weighted_vote_sum DESC,
    --   submitted_at ASC (earliest first), contender_id ASC.
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
        -- rubric-weighted mean of verdict scores (criterion_id NULL -> weight 1.0)
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

    -- Normalization inputs for the hybrid blend.
    SELECT MAX(raw_vote_count), MAX(judge_mean)
    INTO v_max_votes, v_max_judge
    FROM _battle_finalize_scores;

    IF v_mode = 'community' THEN
        UPDATE _battle_finalize_scores SET score = raw_vote_count;
    ELSIF v_mode = 'ai_judge' THEN
        UPDATE _battle_finalize_scores SET score = judge_mean;
    ELSE
        -- hybrid: 50/50 blend of normalized community + normalized judge mean.
        -- community_norm = raw / max(raw); judge_norm = judge_mean / 10
        -- (verdict scores are 0..10). Fixed 50/50 weight (no config column).
        UPDATE _battle_finalize_scores
        SET score = ROUND(
            0.5 * (raw_vote_count / NULLIF(v_max_votes, 0))
          + 0.5 * (judge_mean / 10.0), 4);
    END IF;

    SELECT contender_id INTO v_winner_id
    FROM _battle_finalize_scores
    ORDER BY score DESC,
             raw_vote_count DESC,
             weighted_vote_sum DESC,
             submitted_at ASC NULLS LAST,
             contender_id ASC
    LIMIT 1;

    -- Persist rank_position for EVERY contender, not only ones with a
    -- pre-existing vote_aggregates row (a contender that received zero votes
    -- never got one via fn_submit_vote's lazy upsert). UPSERT so a zero-vote
    -- loser still gets ranked; raw_vote_count/weighted_vote_sum default to 0
    -- on insert, matching the COALESCE(..., 0) used to build the scores above.
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

    -- Phase O3: per-battle ELO update. Best-effort -- never roll back finalize.
    BEGIN
      PERFORM public.fn_compute_elo_after_battle(p_battle_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_compute_elo_after_battle failed for battle %: %', p_battle_id, SQLERRM;
    END;

    -- Result notification. Best-effort -- never roll back finalize (the notify fn
    -- swallows its own errors; this double-guard keeps finalize atomic).
    BEGIN
      PERFORM public.fn_notify_battle_result(p_battle_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_notify_battle_result failed for battle %: %', p_battle_id, SQLERRM;
    END;
END;
$$;

COMMENT ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") IS
'Finalizes a battle scoring/voting -> closed(+winner). Mode-aware winner selection: community = raw_vote_count; ai_judge = rubric-weighted mean of battles.ai_judge_verdicts; hybrid (inferred from ai_judge_enabled + community votes present) = 0.5*community_norm + 0.5*(judge_mean/10). Deterministic tie-break (never NULL winner): score DESC, raw_vote_count DESC, weighted_vote_sum DESC, earliest submitted_at ASC, contender_id ASC. rank_position is upserted for every contender (including zero-vote ones, which never get a vote_aggregates row via fn_submit_vote). Best-effort ELO + result notification.';
