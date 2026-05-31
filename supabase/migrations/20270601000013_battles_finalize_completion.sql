-- ============================================================================
-- Battles lifecycle: close the orphaned scoring -> closed transition + wire
-- judging-mode-aware, automated finalization.
--
-- Context (verified):
--   public.fn_battles_finalize advances a battle scoring -> closed(+winner) but
--   was never driven autonomously for normal (non-workflow) battles, and it
--   ranked ONLY by battles.vote_aggregates.raw_vote_count -- so ai_judge /
--   ai_vs_ai battles (no votes) got a NULL/garbage winner, and exact ties were
--   silently left winner_contender_id = NULL.
--
-- This migration is additive at the schema level (CREATE OR REPLACE / new
-- functions); it also retires two dead pg_cron jobs (B6). No table/column DDL,
-- no data deletion. The battles schema stays private; all access remains
-- through public.* SECURITY DEFINER RPCs.
--
--   B1  public.fn_battles_finalize        -- mode-aware winner + deterministic tie-break
--   B2  public.fn_worker_run_finalize_cycle -- durable, advisory-locked sweep: voting->scoring->closed
--   B3  public.fn_record_ai_judge_verdict  -- REST entry point for ai-judge-battle edge fn
--   B4  public.fn_battle_open_voting / fn_battles_start_voting -- auto-set voting_closes_at
--   B5  public.fn_mcp_battle_finalize      -- creator-checked finalize for the MCP server
--   B6  retire dead pg_cron auto-close-voting / auto-finalize-battles jobs
-- ============================================================================


-- ----------------------------------------------------------------------------
-- B1: mode-aware finalize with a deterministic, never-NULL tie-break.
-- ----------------------------------------------------------------------------
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

    -- Persist rank_position for contenders that have an aggregates row (preserve
    -- existing rank-persistence behavior; ai_judge battles with no aggregates row
    -- simply get no rank rows, unchanged).
    UPDATE battles.vote_aggregates va
    SET rank_position = sub.rk
    FROM (
        SELECT s.contender_id,
               ROW_NUMBER() OVER (
                 ORDER BY s.score DESC,
                          s.raw_vote_count DESC,
                          s.weighted_vote_sum DESC,
                          s.submitted_at ASC NULLS LAST,
                          s.contender_id ASC
               ) AS rk
        FROM _battle_finalize_scores s
    ) sub
    WHERE va.battle_id = p_battle_id
      AND va.contender_id = sub.contender_id;

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

ALTER FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") IS
'Finalizes a battle scoring/voting -> closed(+winner). Mode-aware winner selection: community = raw_vote_count; ai_judge = rubric-weighted mean of battles.ai_judge_verdicts; hybrid (inferred from ai_judge_enabled + community votes present) = 0.5*community_norm + 0.5*(judge_mean/10). Deterministic tie-break (never NULL winner): score DESC, raw_vote_count DESC, weighted_vote_sum DESC, earliest submitted_at ASC, contender_id ASC. Best-effort ELO + result notification.';

-- SECURITY: finalize force-closes a battle, locks the winner, mutates ELO and
-- fires notifications with NO ownership/voting-window check. It must NOT be
-- callable directly by anon/authenticated over PostgREST (an anonymous client
-- could force-close any live battle and manipulate outcomes). Legitimate callers
-- reach it via SECURITY DEFINER wrappers owned by postgres (definer rights, no
-- grant needed): public.fn_mcp_battle_finalize (creator-checked, web+MCP+CLI),
-- public.fn_record_ai_judge_verdict, public.fn_worker_run_finalize_cycle. The
-- score-aggregator runner calls it with service_role.
REVOKE ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "service_role";


-- ----------------------------------------------------------------------------
-- B2a: dispatch-dedup marker for AI judging. Bounds re-dispatch of the (paid)
-- ai-judge-battle edge function: without it, every sweep tick re-POSTs the LLM
-- call for a scoring battle until verdicts land (an unbounded cost storm, since
-- the LLM call routinely outlasts the poll interval). Nullable, no backfill.
-- ----------------------------------------------------------------------------
ALTER TABLE "battles"."battles"
  ADD COLUMN IF NOT EXISTS "judge_dispatched_at" timestamp with time zone;

-- ----------------------------------------------------------------------------
-- B2: durable, advisory-locked, bounded finalize sweep for the Node.js worker.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."fn_worker_run_finalize_cycle"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'public'
    AS $$
DECLARE
  c_limit         constant int := 50;
  r               RECORD;
  processed       int := 0;
  v_has_verdicts  boolean;
BEGIN
  -- Single-flight: skip this cycle entirely if another holds the lock. The
  -- xact-scoped advisory lock is auto-released on commit.
  IF NOT pg_try_advisory_xact_lock(hashtext('battles:finalize-cycle')::bigint) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT b.id, b.ai_judge_enabled, b.status::text AS status, b.judge_dispatched_at
    FROM   battles.battles b
    WHERE  b.status IN ('voting', 'scoring')
      AND  b.voting_closes_at IS NOT NULL
      AND  b.voting_closes_at <= now()
      AND  b.deleted_at        IS NULL
    ORDER BY b.voting_closes_at ASC
    LIMIT c_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Durable voting -> scoring close once the window has elapsed. This sweep
      -- is the single consolidated driver (the legacy pg_cron auto-close-voting /
      -- auto-finalize jobs are unscheduled in B6 to avoid dual drivers). Freezing
      -- votes into 'scoring' before judging/finalizing means a single sweep
      -- carries a normal battle voting -> scoring -> closed with no manual step;
      -- AI battles move to 'scoring' then await async verdicts.
      IF r.status = 'voting' THEN
        UPDATE battles.battles
           SET status = 'scoring', updated_at = now()
         WHERE id = r.id AND status = 'voting';
      END IF;

      IF r.ai_judge_enabled THEN
        SELECT EXISTS (
          SELECT 1 FROM battles.ai_judge_verdicts WHERE battle_id = r.id
        ) INTO v_has_verdicts;

        IF v_has_verdicts THEN
          -- Verdicts recorded -> finalize now (scoring -> closed).
          PERFORM public.fn_battles_finalize(r.id);
          processed := processed + 1;
        ELSIF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
              AND current_setting('app.supabase_url', true) IS NOT NULL THEN
          -- No verdicts yet: dispatch the judge, BUT bounded by a cooldown so we
          -- never re-POST the paid LLM call on every tick while it runs (the call
          -- routinely outlasts the poll interval). The verdict wrapper
          -- (public.fn_record_ai_judge_verdict) finalizes once verdicts land.
          IF r.judge_dispatched_at IS NULL
             OR r.judge_dispatched_at < now() - interval '10 minutes' THEN
            PERFORM net.http_post(
              url     := current_setting('app.supabase_url', true) || '/functions/v1/ai-judge-battle',
              headers := jsonb_build_object(
                'Content-Type',  'application/json',
                'Authorization', 'Bearer ' || internal.get_service_role_key()
              ),
              body    := jsonb_build_object('battle_id', r.id)
            );
            UPDATE battles.battles SET judge_dispatched_at = now() WHERE id = r.id;
            processed := processed + 1;
          END IF;
          -- else: a dispatch is in flight within the cooldown -> wait, no re-POST.
        ELSE
          -- ai_judge battle, no verdicts, no dispatch channel (pg_net or
          -- app.supabase_url unset). Cannot judge -> leave it in 'scoring' rather
          -- than finalize to an all-zero / arbitrary winner. A later tick with a
          -- working channel, or manually recorded verdicts, completes it.
          NULL;
        END IF;
      ELSE
        -- community / hybrid -> finalize directly.
        PERFORM public.fn_battles_finalize(r.id);
        processed := processed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_worker_run_finalize_cycle: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN processed;
END;
$$;

ALTER FUNCTION "public"."fn_worker_run_finalize_cycle"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_worker_run_finalize_cycle"() IS
'Durable scoring -> closed sweep for the Node.js worker (svc.rpc(''fn_worker_run_finalize_cycle'')). Single-flight via xact advisory lock hashtext(''battles:finalize-cycle''); bounded LIMIT 50 with FOR UPDATE SKIP LOCKED; processes battles in status=scoring with voting_closes_at <= now() and deleted_at IS NULL. ai_judge_enabled battles without verdicts dispatch the ai-judge-battle edge function asynchronously (verdict recording finalizes later); all others finalize immediately. Idempotent: finalize only acts on voting/scoring, so re-entry is a no-op once closed. Returns count processed/dispatched.';

REVOKE ALL ON FUNCTION "public"."fn_worker_run_finalize_cycle"() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_worker_run_finalize_cycle"() TO service_role;


-- ----------------------------------------------------------------------------
-- B3: public REST entry point for the ai-judge-battle edge function. The
-- battles schema is not REST-exposed, so verdicts must land via this wrapper.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."fn_record_ai_judge_verdict"("p_battle_id" "uuid", "p_verdicts" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
DECLARE
  v         jsonb;
  inserted  int := 0;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(p_verdicts) LOOP
    INSERT INTO battles.ai_judge_verdicts
      (battle_id, contender_id, criterion_id, score, rationale, model_key, run_id)
    VALUES (
      p_battle_id,
      (v->>'contender_id')::uuid,
      NULLIF(v->>'criterion_id', '')::uuid,
      (v->>'score')::numeric,
      v->>'rationale',
      COALESCE(v->>'model_key', 'claude-sonnet-4-6'),
      NULLIF(v->>'run_id', '')::uuid
    );
    inserted := inserted + 1;
  END LOOP;

  -- Finalize once verdicts are recorded, only while the judge battle is still
  -- open (idempotent guard: a closed battle is never re-finalized).
  IF EXISTS (
    SELECT 1 FROM battles.battles
    WHERE id = p_battle_id
      AND ai_judge_enabled = TRUE
      AND status IN ('scoring', 'voting')
      AND deleted_at IS NULL
  ) THEN
    PERFORM public.fn_battles_finalize(p_battle_id);
  END IF;

  RETURN inserted;
END;
$$;

ALTER FUNCTION "public"."fn_record_ai_judge_verdict"("p_battle_id" "uuid", "p_verdicts" "jsonb") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_record_ai_judge_verdict"("p_battle_id" "uuid", "p_verdicts" "jsonb") IS
'REST entry point for the ai-judge-battle edge function (POST /rest/v1/rpc/fn_record_ai_judge_verdict {p_battle_id, p_verdicts}). The battles schema is not REST-exposed, so this public SECURITY DEFINER wrapper inserts verdict rows into battles.ai_judge_verdicts and then finalizes the battle when ai_judge_enabled and still open. p_verdicts = array of {contender_id, criterion_id?, score, rationale?, model_key?, run_id?}. service_role only.';

REVOKE ALL ON FUNCTION "public"."fn_record_ai_judge_verdict"("p_battle_id" "uuid", "p_verdicts" "jsonb") FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_record_ai_judge_verdict"("p_battle_id" "uuid", "p_verdicts" "jsonb") TO service_role;


-- ----------------------------------------------------------------------------
-- B4: auto-populate voting_closes_at so the durable sweep has a deadline. Both
-- open-voting paths default to now() + voting_duration_hours. COALESCE is
-- defensive (column is NOT NULL DEFAULT 24). now() < now()+interval satisfies
-- the battles_voting_window_order CHECK (opens_at < closes_at).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'lensers', 'public'
    AS $$
DECLARE
  v_creator_id     uuid;
  v_accepted_count int;
BEGIN
  SELECT id INTO v_creator_id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Require at least 2 accepted contenders before voting can open
  SELECT COUNT(*) INTO v_accepted_count
  FROM battles.contenders
  WHERE battle_id        = p_battle_id
    AND contender_status = 'accepted';

  IF v_accepted_count < 2 THEN
    RAISE EXCEPTION 'Battle must have at least 2 accepted contenders before voting can open.';
  END IF;

  UPDATE battles.battles
  SET
    status           = 'voting',
    voting_opens_at  = now(),
    voting_closes_at = now() + make_interval(hours => COALESCE(voting_duration_hours, 24)),
    updated_at       = now()
  WHERE id                = p_battle_id
    AND creator_lenser_id = v_creator_id
    AND status            = 'open'
    AND deleted_at        IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found, not owned by you, or not in open status.';
  END IF;
END;
$$;

ALTER FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") IS 'Transitions a battle from open to voting. Requires at least 2 accepted contenders. Sets voting_opens_at = now() and voting_closes_at = now() + voting_duration_hours so the durable finalize sweep has a deadline. Only callable by the battle creator. SECURITY DEFINER.';

GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "service_role";


CREATE OR REPLACE FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_pending int;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Only the battle creator can start voting';
    END IF;

    IF v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle must be open to start voting (current: %)', v_battle.status;
    END IF;

    -- Check all contenders have submitted
    SELECT COUNT(*) INTO v_pending
    FROM battles.submissions s
    WHERE s.battle_id = p_battle_id AND s.status = 'pending';

    IF v_pending > 0 THEN
        RAISE EXCEPTION '% contender(s) have not submitted yet', v_pending;
    END IF;

    UPDATE battles.battles
    SET status = 'voting',
        voting_opens_at = now(),
        voting_closes_at = COALESCE(
          p_voting_closes_at,
          now() + make_interval(hours => COALESCE(v_battle.voting_duration_hours, 24))
        ),
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) OWNER TO "postgres";

-- Re-issue grants to match the existing dump (anon/authenticated/service_role).
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "service_role";


-- ----------------------------------------------------------------------------
-- B5: creator-checked finalize entry for the MCP server. Mirrors the ownership
-- convention of fn_mcp_battle_set_status (service_role bypasses the check).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."fn_mcp_battle_finalize"("p_battle_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'lensers', 'public'
    AS $$
DECLARE
  v_caller uuid;
  v_status text;
  v_winner uuid;
BEGIN
  v_caller := lensers.get_auth_lenser_id();

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM battles.battles
       WHERE id = p_battle_id
         AND deleted_at IS NULL
         AND creator_lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  PERFORM public.fn_battles_finalize(p_battle_id);

  SELECT status::text, winner_contender_id
  INTO v_status, v_winner
  FROM battles.battles
  WHERE id = p_battle_id;

  RETURN jsonb_build_object(
    'id',                  p_battle_id,
    'status',              v_status,
    'winner_contender_id', v_winner
  );
END;
$$;

ALTER FUNCTION "public"."fn_mcp_battle_finalize"("p_battle_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_mcp_battle_finalize"("p_battle_id" "uuid") IS
'Creator-or-service_role finalize entry for the MCP server. Authenticated callers must own the battle (creator_lenser_id); service_role (NULL caller) bypasses. Delegates to public.fn_battles_finalize and returns {id, status, winner_contender_id}.';

REVOKE ALL ON FUNCTION "public"."fn_mcp_battle_finalize"("p_battle_id" "uuid") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."fn_mcp_battle_finalize"("p_battle_id" "uuid") TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- B6: consolidate onto a SINGLE finalize driver. Migration 20270530000002
-- scheduled the pg_cron jobs 'auto-close-voting' and 'auto-finalize-battles'
-- against legacy battles.fn_auto_close_voting_safe / fn_auto_finalize_battles_safe
-- (defined in 20260519131536, never dropped) -- so those jobs are LIVE, not dead.
-- The legacy battles.fn_auto_finalize_battles has NO advisory lock and NO
-- AI-dispatch cooldown; running it alongside the new fn_worker_run_finalize_cycle
-- (Node worker, matching the battle-auto-promote convention) would give two
-- uncoordinated drivers that double-finalize battles and double-POST the paid
-- ai-judge edge function. Unschedule the legacy jobs so the worker-driven cycle
-- (advisory-locked, cooldown-bounded, mode-aware) is the only driver. Fully
-- guarded: never fails the migration; a no-op where pg_cron is not installed.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron not installed -- no battle cron jobs to retire';
    RETURN;
  END IF;
  BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('auto-close-voting', 'auto-finalize-battles');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'battle cron retire skipped: %', SQLERRM;
  END;
END $$;
