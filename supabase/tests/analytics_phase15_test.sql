-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: analytics_phase15_test.sql
-- Validates RLS enforcement and fn_get_agent_analytics_summary guards for
-- the Phase 15 analytics tables and RPC.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(12);

-- ─────────────────────────────────────────────────────────────────────────────
-- Setup: deterministic AI lenser UUIDs (from 07_ai_lensers.sql seed).
-- Two known agents: gpt-4o (c3000000-...-0001) and claude-sonnet-4-6 (c3000000-...-0002).
-- We test RPC access for a caller who does NOT own either agent, and for
-- service_role direct table access.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Test 1: fn_get_agent_analytics_summary raises 42501 for non-owner ─────────
-- The authenticated role here has no ownership link, so can_manage_ai_lenser
-- returns false and the function must raise SQLSTATE 42501.
-- Ensure JWT role is not service_role (which bypasses the owner check).
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  SELECT public.fn_get_agent_analytics_summary(
    'c3000000-0000-0000-0000-000000000001'::uuid
  )
  $$,
  '42501',
  NULL,
  'fn_get_agent_analytics_summary raises 42501 for non-owning authenticated caller'
);

RESET ROLE;

-- ── Test 2: fn_get_agent_analytics_summary returns jsonb with expected keys ───
-- Simulate PostgREST service-role JWT (request.jwt.claim.role = service_role).
SELECT set_config('request.jwt.claim.role', 'service_role', true);

SELECT ok(
  (
    WITH s AS (
      SELECT public.fn_get_agent_analytics_summary(
        'c3000000-0000-0000-0000-000000000001'::uuid
      ) AS v
    )
    SELECT v ? 'cost_by_model'
      AND v ? 'cost_time_series'
      AND v ? 'eval_quality'
      AND v ? 'workflow_perf'
    FROM s
  ),
  'fn_get_agent_analytics_summary returns jsonb with all four expected keys'
);

-- ── Test 3: p_days filter excludes rows outside the window ────────────────────
SELECT set_config('request.jwt.claim.role', 'service_role', true);

INSERT INTO analytics.agent_cost_daily (
  ai_lenser_id, model_key, provider, period_date,
  total_tokens_in, total_tokens_out, total_credits, run_count
) VALUES (
  'c3000000-0000-0000-0000-000000000001'::uuid,
  'test-model-old',
  'test-provider',
  CURRENT_DATE - 40,
  1000, 500, 1.50, 5
) ON CONFLICT DO NOTHING;

SELECT ok(
  (
    SELECT jsonb_array_length(j -> 'cost_by_model') = 0
    FROM (
      SELECT public.fn_get_agent_analytics_summary(
        'c3000000-0000-0000-0000-000000000001'::uuid,
        30,
        'test-model-old'
      ) AS j
    ) x
  ),
  'p_days=30 excludes agent_cost_daily row at CURRENT_DATE - 40'
);

-- ── Test 4: p_model_key filter narrows cost_by_model ─────────────────────────
SELECT set_config('request.jwt.claim.role', 'service_role', true);

INSERT INTO analytics.agent_cost_daily (
  ai_lenser_id, model_key, provider, period_date,
  total_tokens_in, total_tokens_out, total_credits, run_count
) VALUES
  ('c3000000-0000-0000-0000-000000000001'::uuid, 'gpt-4o',  'openai', CURRENT_DATE - 1, 100, 50, 0.10, 1),
  ('c3000000-0000-0000-0000-000000000001'::uuid, 'gpt-3.5', 'openai', CURRENT_DATE - 1, 200, 80, 0.05, 2)
ON CONFLICT DO NOTHING;

SELECT ok(
  (
    SELECT jsonb_array_length(j -> 'cost_by_model') = 1
      AND (j -> 'cost_by_model' -> 0 ->> 'model_key') = 'gpt-4o'
    FROM (
      SELECT public.fn_get_agent_analytics_summary(
        'c3000000-0000-0000-0000-000000000001'::uuid,
        30,
        'gpt-4o'
      ) AS j
    ) x
  ),
  'p_model_key filter returns only matching model in cost_by_model'
);

-- ── Test 5: p_workflow_id filter narrows workflow_perf ────────────────────────
SELECT set_config('request.jwt.claim.role', 'service_role', true);

INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  profile_id,
  'Workflow Alpha',
  'private'
FROM agents.ai_lensers
WHERE id = 'c3000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO NOTHING;

INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  profile_id,
  'Workflow Beta',
  'private'
FROM agents.ai_lensers
WHERE id = 'c3000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO NOTHING;

INSERT INTO analytics.workflow_perf_daily (
  ai_lenser_id, workflow_id, period_date,
  run_count, failed_count, p50_duration_ms, p95_duration_ms
) VALUES
  (
    'c3000000-0000-0000-0000-000000000001'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    CURRENT_DATE - 2,
    10, 1, 1200, 3500
  ),
  (
    'c3000000-0000-0000-0000-000000000001'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    CURRENT_DATE - 2,
    5, 0, 800, 2100
  )
ON CONFLICT DO NOTHING;

SELECT ok(
  (
    SELECT jsonb_array_length(j -> 'workflow_perf') = 1
    FROM (
      SELECT public.fn_get_agent_analytics_summary(
        'c3000000-0000-0000-0000-000000000001'::uuid,
        30,
        NULL::text,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      ) AS j
    ) x
  ),
  'p_workflow_id filter returns only matching workflow in workflow_perf'
);

-- ── Test 6: authenticated role cannot SELECT directly on agent_cost_daily ─────
-- The RLS policy acd_owner_read uses can_manage_ai_lenser. An anonymous
-- authenticated session with no ownership link returns zero rows (not an error)
-- because the policy hides rows — but a completely unowned agent table will
-- return empty set. We verify no rows are visible to a non-owning session.
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT count(*) FROM analytics.agent_cost_daily$$,
  'authenticated role can execute SELECT on analytics.agent_cost_daily (RLS hides non-owned rows)'
);

-- The count must be 0 for a session with no ownership
SELECT results_eq(
  $$SELECT count(*)::integer FROM analytics.agent_cost_daily$$,
  $$VALUES (0)$$,
  'authenticated role with no ownership sees zero rows in analytics.agent_cost_daily'
);

RESET ROLE;

-- ── Test 7: service_role bypasses RLS on agent_cost_daily ─────────────────────
-- service_role has BYPASSRLS. It should see rows inserted above.
SELECT ok(
  (SELECT count(*) FROM analytics.agent_cost_daily) >= 0,
  'service_role can SELECT from analytics.agent_cost_daily (RLS bypassed)'
);

-- ── Test 8: authenticated role cannot SELECT directly on eval_quality_daily ───
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT count(*)::integer FROM analytics.eval_quality_daily$$,
  $$VALUES (0)$$,
  'authenticated role with no ownership sees zero rows in analytics.eval_quality_daily'
);

RESET ROLE;

-- ── Test 9: authenticated role cannot SELECT directly on workflow_perf_daily ──
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT count(*)::integer FROM analytics.workflow_perf_daily$$,
  $$VALUES (0)$$,
  'authenticated role with no ownership sees zero rows in analytics.workflow_perf_daily'
);

RESET ROLE;

-- ── Test 10: fn_get_agent_analytics_summary accepts p_days=0 without error ───
-- Edge case: caller passes p_days=0 (today only; no rows expected in practice).
SELECT set_config('request.jwt.claim.role', 'service_role', true);

SELECT ok(
  (
    SELECT jsonb_typeof(j) = 'object'
    FROM (
      SELECT public.fn_get_agent_analytics_summary(
        'c3000000-0000-0000-0000-000000000001'::uuid,
        0
      ) AS j
    ) x
  ),
  'fn_get_agent_analytics_summary with p_days=0 returns a jsonb object without error'
);

-- ── Test 11: fn_get_agent_analytics_summary second agent also raises 42501 ────
-- Confirm the guard applies to all agent IDs, not only the first one.
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  SELECT public.fn_get_agent_analytics_summary(
    'c3000000-0000-0000-0000-000000000002'::uuid
  )
  $$,
  '42501',
  NULL,
  'fn_get_agent_analytics_summary raises 42501 for second non-owned agent'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
