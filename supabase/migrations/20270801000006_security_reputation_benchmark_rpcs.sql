-- Security hardening: public SECURITY DEFINER wrappers for the reputation schema.
--
-- Covers: reputationRepository (reputation.lenser_scores, contender_ratings,
-- judge_calibrations), battles-share-card.route.ts (reputation part), score-vote-risk edge function.

-- ─── REPUTATION SCHEMA ───────────────────────────────────────────────────────

-- ─── 1. fn_get_lenser_scores ─────────────────────────────────────────────────
-- Reputation scores for a lenser (reputationRepository.getLenserScores).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_scores(p_lenser_id uuid)
RETURNS TABLE(
  id          uuid,
  lenser_id   uuid,
  score_type  text,
  score       numeric,
  uncertainty numeric,
  computed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  SELECT ls.id, ls.lenser_id, ls.score_type, ls.score, ls.uncertainty, ls.computed_at
  FROM reputation.lenser_scores ls
  WHERE ls.lenser_id = p_lenser_id
  ORDER BY ls.computed_at DESC;
$$;

ALTER FUNCTION public.fn_get_lenser_scores(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_scores(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_scores(uuid) IS
  'Security wrapper: return all reputation score rows for a lenser, ordered by computed_at DESC.';

-- ─── 2. fn_get_contender_rating ──────────────────────────────────────────────
-- ELO rating for a lenser, optionally filtered to one category
-- (reputationRepository.getContenderRating).

CREATE OR REPLACE FUNCTION public.fn_get_contender_rating(
  p_lenser_id uuid,
  p_category  text DEFAULT NULL
)
RETURNS TABLE(
  id            uuid,
  lenser_id     uuid,
  category      text,
  elo_rating    numeric,
  uncertainty   numeric,
  battles_played integer,
  wins          integer,
  draws         integer,
  losses        integer,
  updated_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  SELECT cr.id, cr.lenser_id, cr.category, cr.elo_rating, cr.uncertainty,
         cr.battles_played, cr.wins, cr.draws, cr.losses, cr.updated_at
  FROM reputation.contender_ratings cr
  WHERE cr.lenser_id = p_lenser_id
    AND (p_category IS NULL OR cr.category = p_category)
  ORDER BY cr.updated_at DESC
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_contender_rating(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_contender_rating(uuid, text)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_contender_rating(uuid, text) IS
  'Security wrapper: fetch the most recent ELO contender rating for a lenser, '
  'optionally filtered to a specific category.';

-- ─── 3. fn_get_judge_calibration ─────────────────────────────────────────────
-- Judge calibration data for a lenser (reputationRepository.getJudgeCalibration).

CREATE OR REPLACE FUNCTION public.fn_get_judge_calibration(p_lenser_id uuid)
RETURNS TABLE(
  id                uuid,
  lenser_id         uuid,
  calibration_score numeric,
  total_judgments   integer,
  agreement_rate    numeric,
  kappa_score       numeric,
  updated_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  SELECT jc.id, jc.lenser_id, jc.calibration_score, jc.total_judgments,
         jc.agreement_rate, jc.kappa_score, jc.updated_at
  FROM reputation.judge_calibrations jc
  WHERE jc.lenser_id = p_lenser_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_judge_calibration(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_judge_calibration(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_judge_calibration(uuid) IS
  'Security wrapper: return the judge calibration record for a lenser.';

-- ─── 4. fn_get_battle_elo_log ─────────────────────────────────────────────────
-- ELO battle log for a battle (battles-share-card.route.ts reputation section).

CREATE OR REPLACE FUNCTION public.fn_get_battle_elo_log(p_battle_id uuid)
RETURNS TABLE(
  battle_id            uuid,
  winner_lenser_id     uuid,
  loser_lenser_id      uuid,
  winner_score_before  numeric,
  winner_score_after   numeric,
  loser_score_before   numeric,
  loser_score_after    numeric,
  is_draw              boolean,
  k_factor             integer,
  computed_at          timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  SELECT
    el.battle_id, el.winner_lenser_id, el.loser_lenser_id,
    el.winner_score_before, el.winner_score_after,
    el.loser_score_before,  el.loser_score_after,
    el.is_draw, el.k_factor, el.computed_at
  FROM reputation.elo_battle_log el
  WHERE el.battle_id = p_battle_id;
$$;

ALTER FUNCTION public.fn_get_battle_elo_log(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_elo_log(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_battle_elo_log(uuid) IS
  'Security wrapper: return ELO score change records for a specific battle.';

-- ─── WORKER-ONLY ─────────────────────────────────────────────────────────────

-- ─── 5. fn_worker_get_vote_risk_data ────────────────────────────────────────
-- Aggregate vote risk context for the score-vote-risk edge function.
-- Returns battle status, existing vote count, and the lenser's most recent
-- composite score — all in one call to minimize round-trips from the edge.

CREATE OR REPLACE FUNCTION public.fn_worker_get_vote_risk_data(
  p_battle_id uuid,
  p_lenser_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'reputation'
AS $$
  SELECT jsonb_build_object(
    'battle_status',  b.status,
    'vote_count',     (
      SELECT COUNT(*)
      FROM battles.votes v
      WHERE v.battle_id = p_battle_id
    ),
    'lenser_score',   (
      SELECT ls.score
      FROM reputation.lenser_scores ls
      WHERE ls.lenser_id  = p_lenser_id
        AND ls.score_type = 'composite'
      ORDER BY ls.computed_at DESC
      LIMIT 1
    ),
    'lenser_elo',     (
      SELECT cr.elo_rating
      FROM reputation.contender_ratings cr
      WHERE cr.lenser_id = p_lenser_id
      ORDER BY cr.updated_at DESC
      LIMIT 1
    )
  )
  FROM battles.battles b
  WHERE b.id = p_battle_id;
$$;

ALTER FUNCTION public.fn_worker_get_vote_risk_data(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_vote_risk_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_vote_risk_data(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_vote_risk_data(uuid, uuid) IS
  'Worker-only: return battle status, total vote count, and lenser scores as jsonb '
  'for the score-vote-risk edge function. Single round-trip.';
