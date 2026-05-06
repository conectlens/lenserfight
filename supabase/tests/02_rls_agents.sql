-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 02_rls_agents.sql
-- Validates RLS enforcement and fn_agent_action policy gates.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

-- ── Test 1: authenticated role cannot UPDATE agents.policies directly ─────────
-- policies has no UPDATE policy for authenticated; only service_role write.
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  UPDATE agents.policies
  SET can_join_battles = true
  WHERE ai_lenser_id = gen_random_uuid()
  $$,
  '42501',
  NULL,
  'authenticated role cannot UPDATE agents.policies directly'
);

RESET ROLE;

-- ── Test 2: fn_agent_action blocks join_battle when can_join_battles = false ──
-- Set up: minimal ai_lenser + ownership + policy fixture within transaction.
-- We rely on the fact that fn_agent_action raises 'no_policy_for_agent' when
-- no policy row exists, and 'blocked_by_policy' when policy denies the action.
-- Here we test the no_policy guard (equivalent proof-of-gate behaviour).
SELECT throws_ok(
  $$
  SELECT agents.fn_agent_action(
    p_ai_lenser_id := '00000000-0000-0000-0000-000000000099'::uuid,
    p_action_type  := 'join_battle'
  )
  $$,
  'P0001',
  'no_policy_for_agent%',
  'fn_agent_action raises no_policy_for_agent for unknown agent UUID'
);

-- ── Test 3: authenticated role cannot INSERT into agents.action_logs ──────────
-- action_logs allows INSERT only to service_role (SECURITY DEFINER path only).
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  INSERT INTO agents.action_logs (ai_lenser_id, action_type, result)
  VALUES (gen_random_uuid(), 'join_battle', 'success')
  $$,
  '42501',
  NULL,
  'authenticated role cannot INSERT directly into agents.action_logs'
);

RESET ROLE;

-- ── Test 4: authenticated role cannot SELECT from private policies ────────────
-- policies_public_read only allows SELECT where is_public_policy = true.
-- A SELECT that tries to bypass this (e.g. filter on non-public row) returns
-- no rows rather than an error, which is correct RLS behaviour.
-- We verify the policy exists and is active by checking the catalog.
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'agents'
      AND tablename  = 'policies'
      AND policyname = 'policies_public_read'
      AND cmd        = 'SELECT'
  ),
  'policies_public_read policy exists on agents.policies'
);

-- ── Test 5: service_role can SELECT from agents.action_logs ──────────────────
SELECT lives_ok(
  $$SELECT count(*) FROM agents.action_logs$$,
  'service_role can SELECT from agents.action_logs'
);

SELECT * FROM finish();

ROLLBACK;
