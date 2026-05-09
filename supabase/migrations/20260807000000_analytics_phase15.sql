-- =============================================================================
-- 20260807000000_analytics_phase15.sql
-- -----------------------------------------------------------------------------
-- Phase 15: Advanced Analytics
--
-- Creates the analytics schema with three time-series aggregation tables, RLS
-- policies, three pg_cron-driven aggregation functions, and the public RPC
-- fn_get_agent_analytics_summary.
--
-- Rollback strategy
-- -----------------
-- SELECT cron.unschedule('analytics-daily-rollup');
-- DROP FUNCTION IF EXISTS public.fn_get_agent_analytics_summary(uuid, integer, text, uuid);
-- DROP FUNCTION IF EXISTS analytics.fn_aggregate_workflow_perf_daily(date);
-- DROP FUNCTION IF EXISTS analytics.fn_aggregate_eval_quality_daily(date);
-- DROP FUNCTION IF EXISTS analytics.fn_aggregate_cost_daily(date);
-- DROP TABLE IF EXISTS analytics.workflow_perf_daily;
-- DROP TABLE IF EXISTS analytics.eval_quality_daily;
-- DROP TABLE IF EXISTS analytics.agent_cost_daily;
-- -- Leave schema in place; other future tables may share it.
-- =============================================================================

-- ─── A: Schema bootstrap ─────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS analytics;

REVOKE ALL ON SCHEMA analytics FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA analytics TO authenticated, service_role;

-- ─── B: analytics.agent_cost_daily ───────────────────────────────────────────
-- Time-series: one row per (ai_lenser_id, model_key, period_date).

CREATE TABLE IF NOT EXISTS analytics.agent_cost_daily (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id      uuid        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  model_key         text        NOT NULL,
  provider          text        NOT NULL,
  period_date       date        NOT NULL,
  total_tokens_in   bigint      NOT NULL DEFAULT 0,
  total_tokens_out  bigint      NOT NULL DEFAULT 0,
  total_credits     numeric     NOT NULL DEFAULT 0,
  run_count         integer     NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acd_total_credits_nonneg CHECK (total_credits >= 0),
  CONSTRAINT acd_run_count_nonneg     CHECK (run_count >= 0),
  CONSTRAINT acd_lenser_model_date    UNIQUE (ai_lenser_id, model_key, period_date)
);

CREATE INDEX IF NOT EXISTS acd_lenser_date_idx
  ON analytics.agent_cost_daily (ai_lenser_id, period_date DESC);

-- ─── C: analytics.eval_quality_daily ─────────────────────────────────────────
-- Time-series: one row per (ai_lenser_id, evaluation_id, period_date).

CREATE TABLE IF NOT EXISTS analytics.eval_quality_daily (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id   uuid    NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  evaluation_id  uuid    NOT NULL REFERENCES agents.evaluations(id) ON DELETE CASCADE,
  period_date    date    NOT NULL,
  run_count      integer NOT NULL DEFAULT 0,
  pass_count     integer NOT NULL DEFAULT 0,
  total_cases    integer NOT NULL DEFAULT 0,
  passed_cases   integer NOT NULL DEFAULT 0,
  mean_score     numeric,
  CONSTRAINT eqd_lenser_eval_date UNIQUE (ai_lenser_id, evaluation_id, period_date)
);

CREATE INDEX IF NOT EXISTS eqd_lenser_date_idx
  ON analytics.eval_quality_daily (ai_lenser_id, period_date DESC);

-- ─── D: analytics.workflow_perf_daily ────────────────────────────────────────
-- Time-series: one row per (ai_lenser_id, workflow_id, period_date).

CREATE TABLE IF NOT EXISTS analytics.workflow_perf_daily (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id     uuid    NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  workflow_id      uuid    NOT NULL REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  period_date      date    NOT NULL,
  run_count        integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  p50_duration_ms  integer,
  p95_duration_ms  integer,
  CONSTRAINT wpd_lenser_workflow_date UNIQUE (ai_lenser_id, workflow_id, period_date)
);

CREATE INDEX IF NOT EXISTS wpd_lenser_date_idx
  ON analytics.workflow_perf_daily (ai_lenser_id, period_date DESC);

-- ─── E: RLS on all three tables ──────────────────────────────────────────────

ALTER TABLE analytics.agent_cost_daily    ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.eval_quality_daily  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.workflow_perf_daily ENABLE ROW LEVEL SECURITY;

-- agent_cost_daily: owner-only SELECT
DROP POLICY IF EXISTS acd_owner_read ON analytics.agent_cost_daily;
CREATE POLICY acd_owner_read ON analytics.agent_cost_daily
  FOR SELECT
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

-- eval_quality_daily: owner-only SELECT
DROP POLICY IF EXISTS eqd_owner_read ON analytics.eval_quality_daily;
CREATE POLICY eqd_owner_read ON analytics.eval_quality_daily
  FOR SELECT
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

-- workflow_perf_daily: owner-only SELECT
DROP POLICY IF EXISTS wpd_owner_read ON analytics.workflow_perf_daily;
CREATE POLICY wpd_owner_read ON analytics.workflow_perf_daily
  FOR SELECT
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id));

-- Grants
GRANT SELECT ON analytics.agent_cost_daily    TO authenticated;
GRANT SELECT ON analytics.eval_quality_daily  TO authenticated;
GRANT SELECT ON analytics.workflow_perf_daily TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.agent_cost_daily    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.eval_quality_daily  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.workflow_perf_daily TO service_role;

-- ─── F: pg_cron aggregation functions (SECURITY DEFINER) ─────────────────────

-- F1: Cost aggregation from ai.key_usage_log
--     Joins via lenser_id (profiles FK) → agents.ai_lensers.profile_id.
CREATE OR REPLACE FUNCTION analytics.fn_aggregate_cost_daily(
  p_date date DEFAULT CURRENT_DATE - 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, agents, lenses, ai, public
AS $$
BEGIN
  INSERT INTO analytics.agent_cost_daily (
    ai_lenser_id,
    model_key,
    provider,
    period_date,
    total_tokens_in,
    total_tokens_out,
    total_credits,
    run_count,
    updated_at
  )
  SELECT
    al.id                                   AS ai_lenser_id,
    COALESCE(kul.model_key, '')             AS model_key,
    COALESCE(kul.provider, '')              AS provider,
    date_trunc('day', kul.created_at)::date AS period_date,
    SUM(COALESCE(kul.token_input, 0))       AS total_tokens_in,
    SUM(COALESCE(kul.token_output, 0))      AS total_tokens_out,
    SUM(COALESCE(kul.credit_cost, 0))       AS total_credits,
    COUNT(kul.id)                           AS run_count,
    now()                                   AS updated_at
  FROM ai.key_usage_log kul
  JOIN agents.ai_lensers al ON al.profile_id = kul.lenser_id
  WHERE date_trunc('day', kul.created_at)::date = p_date
    AND kul.model_key IS NOT NULL
    AND kul.provider  IS NOT NULL
  GROUP BY
    al.id,
    kul.model_key,
    kul.provider,
    date_trunc('day', kul.created_at)::date
  ON CONFLICT (ai_lenser_id, model_key, period_date) DO UPDATE SET
    total_tokens_in  = EXCLUDED.total_tokens_in,
    total_tokens_out = EXCLUDED.total_tokens_out,
    total_credits    = EXCLUDED.total_credits,
    run_count        = EXCLUDED.run_count,
    updated_at       = EXCLUDED.updated_at;
END;
$$;

ALTER FUNCTION analytics.fn_aggregate_cost_daily(date) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION analytics.fn_aggregate_cost_daily(date) TO service_role;

-- F2: Eval quality aggregation
CREATE OR REPLACE FUNCTION analytics.fn_aggregate_eval_quality_daily(
  p_date date DEFAULT CURRENT_DATE - 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, agents, lenses, ai, public
AS $$
BEGIN
  INSERT INTO analytics.eval_quality_daily (
    ai_lenser_id,
    evaluation_id,
    period_date,
    run_count,
    pass_count,
    total_cases,
    passed_cases,
    mean_score
  )
  SELECT
    e.ai_lenser_id                                                    AS ai_lenser_id,
    er.evaluation_id                                                  AS evaluation_id,
    date_trunc('day', er.started_at)::date                           AS period_date,
    COUNT(DISTINCT er.id)                                             AS run_count,
    COUNT(DISTINCT er.id) FILTER (WHERE er.score >= 0.7)             AS pass_count,
    COUNT(ecr.id)                                                     AS total_cases,
    COUNT(ecr.id) FILTER (WHERE ecr.score >= 0.7)                    AS passed_cases,
    AVG(er.score)                                                     AS mean_score
  FROM agents.evaluation_runs er
  JOIN agents.evaluations e
    ON e.id = er.evaluation_id
  LEFT JOIN agents.evaluation_case_results ecr
    ON ecr.evaluation_run_id = er.id
  WHERE date_trunc('day', er.started_at)::date = p_date
    AND e.ai_lenser_id IS NOT NULL
  GROUP BY
    e.ai_lenser_id,
    er.evaluation_id,
    date_trunc('day', er.started_at)::date
  ON CONFLICT (ai_lenser_id, evaluation_id, period_date) DO UPDATE SET
    run_count    = EXCLUDED.run_count,
    pass_count   = EXCLUDED.pass_count,
    total_cases  = EXCLUDED.total_cases,
    passed_cases = EXCLUDED.passed_cases,
    mean_score   = EXCLUDED.mean_score;
END;
$$;

ALTER FUNCTION analytics.fn_aggregate_eval_quality_daily(date) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION analytics.fn_aggregate_eval_quality_daily(date) TO service_role;

-- F3: Workflow performance aggregation
--     Uses agents.team_runs as the ownership bridge (team_run.ai_lenser_id).
--     Duration is derived from lenses.workflow_runs.started_at / completed_at
--     so we do not depend on node_results timestamps for the run-level P50/P95.
CREATE OR REPLACE FUNCTION analytics.fn_aggregate_workflow_perf_daily(
  p_date date DEFAULT CURRENT_DATE - 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, agents, lenses, ai, public
AS $$
BEGIN
  INSERT INTO analytics.workflow_perf_daily (
    ai_lenser_id,
    workflow_id,
    period_date,
    run_count,
    failed_count,
    p50_duration_ms,
    p95_duration_ms
  )
  SELECT
    tr.ai_lenser_id                                                AS ai_lenser_id,
    wr.workflow_id                                                 AS workflow_id,
    date_trunc('day', wr.started_at)::date                       AS period_date,
    COUNT(DISTINCT wr.id)                                          AS run_count,
    COUNT(DISTINCT wr.id) FILTER (WHERE wr.status = 'failed')    AS failed_count,
    percentile_cont(0.50) WITHIN GROUP (
      ORDER BY
        EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at)) * 1000
    )::integer                                                     AS p50_duration_ms,
    percentile_cont(0.95) WITHIN GROUP (
      ORDER BY
        EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at)) * 1000
    )::integer                                                     AS p95_duration_ms
  FROM agents.team_runs tr
  JOIN lenses.workflow_runs wr
    ON wr.id = tr.workflow_run_id
  WHERE date_trunc('day', wr.started_at)::date = p_date
    AND wr.workflow_id   IS NOT NULL
    AND wr.started_at    IS NOT NULL
    AND wr.completed_at  IS NOT NULL
  GROUP BY
    tr.ai_lenser_id,
    wr.workflow_id,
    date_trunc('day', wr.started_at)::date
  ON CONFLICT (ai_lenser_id, workflow_id, period_date) DO UPDATE SET
    run_count       = EXCLUDED.run_count,
    failed_count    = EXCLUDED.failed_count,
    p50_duration_ms = EXCLUDED.p50_duration_ms,
    p95_duration_ms = EXCLUDED.p95_duration_ms;
END;
$$;

ALTER FUNCTION analytics.fn_aggregate_workflow_perf_daily(date) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION analytics.fn_aggregate_workflow_perf_daily(date) TO service_role;

-- ─── G: pg_cron job registration ─────────────────────────────────────────────

SELECT cron.schedule(
  'analytics-daily-rollup',
  '5 0 * * *',
  $$
    SELECT analytics.fn_aggregate_cost_daily();
    SELECT analytics.fn_aggregate_eval_quality_daily();
    SELECT analytics.fn_aggregate_workflow_perf_daily();
  $$
);

-- ─── H: public.fn_get_agent_analytics_summary RPC ────────────────────────────

DROP FUNCTION IF EXISTS public.fn_get_agent_analytics_summary(uuid, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.fn_get_agent_analytics_summary(
  p_ai_lenser_id uuid,
  p_days         integer DEFAULT 30,
  p_model_key    text    DEFAULT NULL,
  p_workflow_id  uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics, agents, lenses
AS $$
DECLARE
  v_cost_by_model    jsonb;
  v_cost_time_series jsonb;
  v_eval_quality     jsonb;
  v_workflow_perf    jsonb;
BEGIN
  -- Ownership guard: raises 42501 for unauthorized callers.
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'Insufficient privilege'
      USING ERRCODE = '42501';
  END IF;

  -- Cost by model breakdown
  SELECT jsonb_agg(row_to_json(t)) INTO v_cost_by_model
  FROM (
    SELECT
      model_key,
      provider,
      SUM(total_credits)    AS total_credits,
      SUM(total_tokens_in)  AS total_tokens_in,
      SUM(total_tokens_out) AS total_tokens_out,
      SUM(run_count)        AS run_count
    FROM analytics.agent_cost_daily
    WHERE ai_lenser_id = p_ai_lenser_id
      AND period_date  >= CURRENT_DATE - p_days
      AND (p_model_key IS NULL OR model_key = p_model_key)
    GROUP BY model_key, provider
    ORDER BY SUM(total_credits) DESC
  ) t;

  -- Cost time series (daily totals)
  SELECT jsonb_agg(row_to_json(t)) INTO v_cost_time_series
  FROM (
    SELECT
      period_date,
      SUM(total_credits) AS total_credits
    FROM analytics.agent_cost_daily
    WHERE ai_lenser_id = p_ai_lenser_id
      AND period_date  >= CURRENT_DATE - p_days
      AND (p_model_key IS NULL OR model_key = p_model_key)
    GROUP BY period_date
    ORDER BY period_date
  ) t;

  -- Eval quality per evaluation per day
  SELECT jsonb_agg(row_to_json(t)) INTO v_eval_quality
  FROM (
    SELECT
      eqd.period_date,
      e.name                                            AS evaluation_name,
      eqd.pass_count::float / NULLIF(eqd.run_count, 0) AS pass_rate,
      eqd.mean_score
    FROM analytics.eval_quality_daily eqd
    JOIN agents.evaluations e ON e.id = eqd.evaluation_id
    WHERE eqd.ai_lenser_id = p_ai_lenser_id
      AND eqd.period_date  >= CURRENT_DATE - p_days
    ORDER BY eqd.period_date
  ) t;

  -- Workflow performance per workflow per day
  SELECT jsonb_agg(row_to_json(t)) INTO v_workflow_perf
  FROM (
    SELECT
      wpd.period_date,
      wf.title                                              AS workflow_title,
      wpd.p50_duration_ms,
      wpd.p95_duration_ms,
      wpd.failed_count::float / NULLIF(wpd.run_count, 0)   AS failure_rate
    FROM analytics.workflow_perf_daily wpd
    JOIN lenses.workflows wf ON wf.id = wpd.workflow_id
    WHERE wpd.ai_lenser_id = p_ai_lenser_id
      AND wpd.period_date  >= CURRENT_DATE - p_days
      AND (p_workflow_id IS NULL OR wpd.workflow_id = p_workflow_id)
    ORDER BY wpd.period_date
  ) t;

  RETURN jsonb_build_object(
    'cost_by_model',    COALESCE(v_cost_by_model,    '[]'::jsonb),
    'cost_time_series', COALESCE(v_cost_time_series, '[]'::jsonb),
    'eval_quality',     COALESCE(v_eval_quality,     '[]'::jsonb),
    'workflow_perf',    COALESCE(v_workflow_perf,    '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid) IS
  'Owner-only analytics summary for an AI lenser. '
  'Returns cost_by_model, cost_time_series, eval_quality, and workflow_perf '
  'aggregated over the last p_days days. '
  'Optional p_model_key and p_workflow_id narrow cost and workflow results. '
  'Authorization via agents.can_manage_ai_lenser — raises 42501 for non-owners. '
  'Reads only from analytics.* pre-aggregated tables; never touches raw logs.';
