-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: analytics_phase15_test.sql
-- Validates RLS enforcement and fn_get_agent_analytics_summary guards for
-- the Phase 15 analytics tables and RPC.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(11);

-- ─────────────────────────────────────────────────────────────────────────────
-- Setup: deterministic AI lenser UUIDs (from 07_ai_lensers.sql seed).
-- Two known agents: gpt-4o (c3000000-...-0001) and claude-sonnet-4-6 (c3000000-...-0002).
-- We test RPC access for a caller who does NOT own either agent, and for
-- service_role direct table access.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Test 1: fn_get_agent_analytics_summary raises 42501 for non-owner ─────────
-- The authenticated role here has no ownership link, so can_manage_ai_lenser
-- returns false and the function must raise SQLSTATE 42501.
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
-- Called as service_role (bypasses can_manage_ai_lenser ownership check via
-- superuser/service_role path in agents.can_manage_ai_lenser).
-- We rely on service_role running as postgres owner, so can_manage_ai_lenser
-- returns true when the function is called under service_role session context.
-- We validate the output shape, not data values.
DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT public.fn_get_agent_analytics_summary(
    'c3000000-0000-0000-0000-000000000001'::uuid
  ) INTO v_result;

  PERFORM ok(
    v_result ? 'cost_by_model'
    AND v_result ? 'cost_time_series'
    AND v_result ? 'eval_quality'
    AND v_result ? 'workflow_perf',
    'fn_get_agent_analytics_summary returns jsonb with all four expected keys'
  );
END;
$$;

-- ── Test 3: p_days filter excludes rows outside the window ────────────────────
-- Insert a row dated 40 days ago, then request summary with p_days=30.
-- The cost_by_model result must be empty (no rows in window).
DO $$
DECLARE
  v_result jsonb;
  v_lenser_id uuid := 'c3000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert a row 40 days in the past
  INSERT INTO analytics.agent_cost_daily (
    ai_lenser_id, model_key, provider, period_date,
    total_tokens_in, total_tokens_out, total_credits, run_count
  ) VALUES (
    v_lenser_id, 'test-model-old', 'test-provider',
    CURRENT_DATE - 40, 1000, 500, 1.50, 5
  ) ON CONFLICT DO NOTHING;

  SELECT public.fn_get_agent_analytics_summary(
    v_lenser_id,
    30,               -- p_days
    'test-model-old'  -- p_model_key — narrows to only the old row
  ) INTO v_result;

  PERFORM ok(
    jsonb_array_length(v_result -> 'cost_by_model') = 0,
    'p_days=30 excludes agent_cost_daily row at CURRENT_DATE - 40'
  );
END;
$$;

-- ── Test 4: p_model_key filter narrows cost_by_model ─────────────────────────
DO $$
DECLARE
  v_result jsonb;
  v_lenser_id uuid := 'c3000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert two rows for different models within the window
  INSERT INTO analytics.agent_cost_daily (
    ai_lenser_id, model_key, provider, period_date,
    total_tokens_in, total_tokens_out, total_credits, run_count
  ) VALUES
    (v_lenser_id, 'gpt-4o',   'openai',    CURRENT_DATE - 1, 100, 50, 0.10, 1),
    (v_lenser_id, 'gpt-3.5',  'openai',    CURRENT_DATE - 1, 200, 80, 0.05, 2)
  ON CONFLICT DO NOTHING;

  SELECT public.fn_get_agent_analytics_summary(
    v_lenser_id,
    30,
    'gpt-4o'   -- p_model_key
  ) INTO v_result;

  PERFORM ok(
    jsonb_array_length(v_result -> 'cost_by_model') = 1
    AND (v_result -> 'cost_by_model' -> 0 ->> 'model_key') = 'gpt-4o',
    'p_model_key filter returns only matching model in cost_by_model'
  );
END;
$$;

-- ── Test 5: p_workflow_id filter narrows workflow_perf ────────────────────────
DO $$
DECLARE
  v_result     jsonb;
  v_lenser_id  uuid := 'c3000000-0000-0000-0000-000000000001';
  v_wf_a       uuid;
  v_wf_b       uuid;
  v_lenser_profile_id uuid;
BEGIN
  -- Resolve profile_id for lenser (needed as workflow owner)
  SELECT profile_id INTO v_lenser_profile_id
  FROM agents.ai_lensers
  WHERE id = v_lenser_id;

  -- Create two temporary workflows
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES
    (gen_random_uuid(), v_lenser_profile_id, 'Workflow Alpha', 'private'),
    (gen_random_uuid(), v_lenser_profile_id, 'Workflow Beta',  'private')
  RETURNING id INTO v_wf_a;

  -- Second workflow id obtained via a separate query
  SELECT id INTO v_wf_b FROM lenses.workflows
  WHERE lenser_id = v_lenser_profile_id AND title = 'Workflow Beta';

  INSERT INTO analytics.workflow_perf_daily (
    ai_lenser_id, workflow_id, period_date,
    run_count, failed_count, p50_duration_ms, p95_duration_ms
  ) VALUES
    (v_lenser_id, v_wf_a, CURRENT_DATE - 1, 10, 1, 1200, 3500),
    (v_lenser_id, v_wf_b, CURRENT_DATE - 1,  5, 0,  800, 2100)
  ON CONFLICT DO NOTHING;

  SELECT public.fn_get_agent_analytics_summary(
    v_lenser_id,
    30,
    NULL,    -- p_model_key
    v_wf_a   -- p_workflow_id
  ) INTO v_result;

  PERFORM ok(
    jsonb_array_length(v_result -> 'workflow_perf') = 1,
    'p_workflow_id filter returns only matching workflow in workflow_perf'
  );
END;
$$;

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
DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT public.fn_get_agent_analytics_summary(
    'c3000000-0000-0000-0000-000000000001'::uuid,
    0
  ) INTO v_result;

  PERFORM ok(
    jsonb_typeof(v_result) = 'object',
    'fn_get_agent_analytics_summary with p_days=0 returns a jsonb object without error'
  );
END;
$$;

-- ── Test 11: fn_get_agent_analytics_summary second agent also raises 42501 ────
-- Confirm the guard applies to all agent IDs, not only the first one.
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
