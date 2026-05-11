-- Security hardening: public SECURITY DEFINER wrappers for reputation and benchmark schemas.
--
-- Covers: reputationRepository (reputation.lenser_scores, contender_ratings,
-- judge_calibrations), benchmarkRepository (benchmark.suites, tasks, invalidations),
-- battles-share-card.route.ts (reputation part), score-vote-risk edge function.

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

-- ─── BENCHMARK SCHEMA ────────────────────────────────────────────────────────

-- ─── 5. fn_list_benchmark_suites ─────────────────────────────────────────────
-- List suites the caller can see: their own OR public ones
-- (benchmarkRepository.listSuites).

CREATE OR REPLACE FUNCTION public.fn_list_benchmark_suites(
  p_creator_lenser_id uuid        DEFAULT NULL,
  p_limit             integer     DEFAULT 50,
  p_cursor            timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id                  uuid,
  title               text,
  description         text,
  creator_lenser_id   uuid,
  category            text,
  status              text,
  version             text,
  is_public           boolean,
  created_at          timestamptz,
  updated_at          timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
  SELECT s.id, s.title, s.description, s.creator_lenser_id, s.category,
         s.status, s.version, s.is_public, s.created_at, s.updated_at
  FROM benchmark.suites s
  WHERE (
    CASE
      WHEN p_creator_lenser_id IS NOT NULL
        THEN s.creator_lenser_id = p_creator_lenser_id
      ELSE
        s.creator_lenser_id = lensers.get_auth_lenser_id()
        OR s.is_public = true
    END
  )
  AND (p_cursor IS NULL OR s.created_at < p_cursor)
  ORDER BY s.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_benchmark_suites(uuid, integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_benchmark_suites(uuid, integer, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_benchmark_suites(uuid, integer, timestamptz) IS
  'Security wrapper: list benchmark suites visible to the caller '
  '(own suites OR public suites). Keyset-paginated by created_at DESC.';

-- ─── 6. fn_get_benchmark_suite ────────────────────────────────────────────────
-- Get a single benchmark suite by ID (benchmarkRepository.getSuite).
-- Returns the row if it is public OR owned by the caller.

CREATE OR REPLACE FUNCTION public.fn_get_benchmark_suite(p_suite_id uuid)
RETURNS TABLE(
  id                uuid,
  title             text,
  description       text,
  creator_lenser_id uuid,
  category          text,
  status            text,
  version           text,
  is_public         boolean,
  created_at        timestamptz,
  updated_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
  SELECT s.id, s.title, s.description, s.creator_lenser_id, s.category,
         s.status, s.version, s.is_public, s.created_at, s.updated_at
  FROM benchmark.suites s
  WHERE s.id = p_suite_id
    AND (
      s.is_public = true
      OR s.creator_lenser_id = lensers.get_auth_lenser_id()
    );
$$;

ALTER FUNCTION public.fn_get_benchmark_suite(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_benchmark_suite(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_benchmark_suite(uuid) IS
  'Security wrapper: fetch a benchmark suite by ID. '
  'Visible only if public or owned by the current user.';

-- ─── 7. fn_list_benchmark_tasks ──────────────────────────────────────────────
-- Tasks for a benchmark suite (benchmarkRepository.getTasksBySuite).

CREATE OR REPLACE FUNCTION public.fn_list_benchmark_tasks(p_suite_id uuid)
RETURNS TABLE(
  id                   uuid,
  suite_id             uuid,
  title                text,
  prompt_template      text,
  evaluation_protocol  jsonb,
  required_repetitions integer,
  ordinal              integer,
  workflow_id          uuid,
  created_at           timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
  SELECT t.id, t.suite_id, t.title, t.prompt_template, t.evaluation_protocol,
         t.required_repetitions, t.ordinal, t.workflow_id, t.created_at
  FROM benchmark.tasks t
  JOIN benchmark.suites s ON s.id = t.suite_id
  WHERE t.suite_id = p_suite_id
    AND (
      s.is_public = true
      OR s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  ORDER BY t.ordinal ASC;
$$;

ALTER FUNCTION public.fn_list_benchmark_tasks(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_benchmark_tasks(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_benchmark_tasks(uuid) IS
  'Security wrapper: list benchmark tasks for a suite, ordered by ordinal ASC. '
  'Respects same visibility rules as fn_get_benchmark_suite.';

-- ─── 8. fn_create_benchmark_suite ────────────────────────────────────────────
-- Create a benchmark suite (benchmarkRepository.createSuite).

CREATE OR REPLACE FUNCTION public.fn_create_benchmark_suite(
  p_title       text,
  p_description text    DEFAULT NULL,
  p_category    text    DEFAULT NULL,
  p_version     text    DEFAULT '1.0.0',
  p_is_public   boolean DEFAULT false
)
RETURNS TABLE(
  id                uuid,
  title             text,
  description       text,
  creator_lenser_id uuid,
  category          text,
  status            text,
  version           text,
  is_public         boolean,
  created_at        timestamptz,
  updated_at        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
  INSERT INTO benchmark.suites
    (title, description, category, version, is_public, creator_lenser_id, status)
  VALUES
    (p_title, p_description, p_category, p_version, p_is_public,
     lensers.get_auth_lenser_id(), 'draft')
  RETURNING
    id, title, description, creator_lenser_id, category,
    status, version, is_public, created_at, updated_at;
$$;

ALTER FUNCTION public.fn_create_benchmark_suite(text, text, text, text, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_benchmark_suite(text, text, text, text, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_benchmark_suite(text, text, text, text, boolean) IS
  'Security wrapper: create a benchmark suite owned by the current user. '
  'Status is always "draft" on creation.';

-- ─── 9. fn_create_benchmark_task ─────────────────────────────────────────────
-- Create a benchmark task within a suite (benchmarkRepository.createTask).
-- Enforces ownership: only the suite owner can add tasks.

CREATE OR REPLACE FUNCTION public.fn_create_benchmark_task(
  p_suite_id             uuid,
  p_title                text,
  p_prompt_template      text,
  p_evaluation_protocol  jsonb   DEFAULT '{}'::jsonb,
  p_required_repetitions integer DEFAULT 1,
  p_ordinal              integer DEFAULT 0,
  p_workflow_id          uuid    DEFAULT NULL
)
RETURNS TABLE(
  id                   uuid,
  suite_id             uuid,
  title                text,
  prompt_template      text,
  evaluation_protocol  jsonb,
  required_repetitions integer,
  ordinal              integer,
  workflow_id          uuid,
  created_at           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM benchmark.suites
    WHERE id = p_suite_id AND creator_lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'forbidden: suite % not owned by caller', p_suite_id;
  END IF;

  RETURN QUERY
  INSERT INTO benchmark.tasks
    (suite_id, title, prompt_template, evaluation_protocol,
     required_repetitions, ordinal, workflow_id)
  VALUES
    (p_suite_id, p_title, p_prompt_template, p_evaluation_protocol,
     p_required_repetitions, p_ordinal, p_workflow_id)
  RETURNING
    id, suite_id, title, prompt_template, evaluation_protocol,
    required_repetitions, ordinal, workflow_id, created_at;
END;
$$;

ALTER FUNCTION public.fn_create_benchmark_task(uuid, text, text, jsonb, integer, integer, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_benchmark_task(uuid, text, text, jsonb, integer, integer, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_benchmark_task(uuid, text, text, jsonb, integer, integer, uuid) IS
  'Security wrapper: create a task within a benchmark suite. '
  'Raises "forbidden" if the suite is not owned by the current user.';

-- ─── 10. fn_create_benchmark_invalidation ────────────────────────────────────
-- Record a result-set invalidation (benchmarkRepository.invalidateResult).

CREATE OR REPLACE FUNCTION public.fn_create_benchmark_invalidation(
  p_result_set_id uuid,
  p_reason        text
)
RETURNS TABLE(
  id             uuid,
  result_set_id  uuid,
  reason         text,
  invalidated_by uuid,
  invalidated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'benchmark', 'lensers'
AS $$
  INSERT INTO benchmark.invalidations
    (result_set_id, reason, invalidated_by, invalidated_at)
  VALUES
    (p_result_set_id, p_reason, lensers.get_auth_lenser_id(), now())
  RETURNING id, result_set_id, reason, invalidated_by, invalidated_at;
$$;

ALTER FUNCTION public.fn_create_benchmark_invalidation(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_benchmark_invalidation(uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_benchmark_invalidation(uuid, text) IS
  'Security wrapper: record a benchmark result-set invalidation as the current user.';

-- ─── WORKER-ONLY ─────────────────────────────────────────────────────────────

-- ─── 11. fn_worker_get_vote_risk_data ────────────────────────────────────────
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
