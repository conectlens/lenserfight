-- =============================================================================
-- 49. ANALYTICS PHASE 15 SEED DATA
-- =============================================================================
-- Inserts representative rows into the three analytics aggregation tables.
-- Uses deterministic AI lenser UUIDs from 07_ai_lensers.sql:
--   gpt-4o            → c3000000-0000-0000-0000-000000000001
--   claude-sonnet-4-6 → c3000000-0000-0000-0000-000000000002
--   gemini-2.5-flash  → c3000000-0000-0000-0000-000000000003
--
-- Dependencies: 07_ai_lensers.sql, 20260430020000_agent_evaluations.sql,
--               20260807000000_analytics_phase15.sql
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING.
-- =============================================================================

-- ─── analytics.agent_cost_daily ──────────────────────────────────────────────
-- Three rows: one per known demo AI lenser, recent dates, distinct models.

INSERT INTO analytics.agent_cost_daily (
  ai_lenser_id,
  model_key,
  provider,
  period_date,
  total_tokens_in,
  total_tokens_out,
  total_credits,
  run_count
) VALUES
  (
    'c3000000-0000-0000-0000-000000000001',  -- gpt-4o
    'gpt-4o',
    'openai',
    CURRENT_DATE - 1,
    125000,
    42000,
    3.85,
    47
  ),
  (
    'c3000000-0000-0000-0000-000000000002',  -- claude-sonnet-4-6
    'claude-sonnet-4-6',
    'anthropic',
    CURRENT_DATE - 1,
    98000,
    31500,
    2.60,
    33
  ),
  (
    'c3000000-0000-0000-0000-000000000003',  -- gemini-2.5-flash
    'gemini-2.5-flash',
    'google',
    CURRENT_DATE - 1,
    200000,
    67000,
    1.20,
    61
  )
ON CONFLICT (ai_lenser_id, model_key, period_date) DO NOTHING;

-- ─── analytics.eval_quality_daily ────────────────────────────────────────────
-- One row using the first available evaluation linked to a known AI lenser.

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
  e.ai_lenser_id,
  e.id                AS evaluation_id,
  CURRENT_DATE - 1    AS period_date,
  10                  AS run_count,
  8                   AS pass_count,
  50                  AS total_cases,
  41                  AS passed_cases,
  0.81                AS mean_score
FROM agents.evaluations e
WHERE e.ai_lenser_id IS NOT NULL
ORDER BY e.created_at
LIMIT 1
ON CONFLICT (ai_lenser_id, evaluation_id, period_date) DO NOTHING;

-- ─── analytics.workflow_perf_daily ───────────────────────────────────────────
-- One row using the first workflow_run that has a team_run association.

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
  tr.ai_lenser_id,
  wr.workflow_id,
  CURRENT_DATE - 1  AS period_date,
  12                AS run_count,
  1                 AS failed_count,
  1450              AS p50_duration_ms,
  4200              AS p95_duration_ms
FROM agents.team_runs tr
JOIN lenses.workflow_runs wr
  ON wr.id = tr.workflow_run_id
WHERE wr.workflow_id IS NOT NULL
ORDER BY wr.started_at DESC
LIMIT 1
ON CONFLICT (ai_lenser_id, workflow_id, period_date) DO NOTHING;
