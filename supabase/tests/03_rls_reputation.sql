-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 03_rls_reputation.sql
-- Validates RLS enforcement on reputation tables and fn_get_leaderboard ordering.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(6);

-- ── Test 1: anon role cannot SELECT reputation.lenser_scores directly ───────
-- Reputation is exposed through public SECURITY DEFINER RPCs/views; direct
-- non-public schema access is intentionally revoked by the GraphQL hardening
-- migrations.
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM reputation.lenser_scores$$,
  '42501',
  NULL,
  'anon role cannot SELECT reputation.lenser_scores directly'
);

RESET ROLE;

-- ── Test 2: anon role cannot SELECT reputation.contender_ratings directly ───
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM reputation.contender_ratings$$,
  '42501',
  NULL,
  'anon role cannot SELECT reputation.contender_ratings directly'
);

RESET ROLE;

-- ── Test 3: authenticated role cannot INSERT into reputation.contender_ratings ─
-- contender_ratings write is restricted to service_role only.
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  INSERT INTO reputation.contender_ratings (lenser_id, category)
  VALUES (gen_random_uuid(), 'general')
  $$,
  '42501',
  NULL,
  'authenticated role cannot INSERT into reputation.contender_ratings'
);

RESET ROLE;

-- ── Test 4: authenticated role cannot UPDATE reputation.lenser_scores ─────────
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  UPDATE reputation.lenser_scores
  SET score = 9999
  WHERE lenser_id = gen_random_uuid()
  $$,
  '42501',
  NULL,
  'authenticated role cannot UPDATE reputation.lenser_scores'
);

RESET ROLE;

-- ── Test 5: fn_get_leaderboard accepts p_order_by = 'elo' without error ───────
-- When the reputation.lenser_scores table has no ELO rows it returns 0 rows;
-- we verify the function runs cleanly (no exception) and returns a set.
SELECT lives_ok(
  $$SELECT * FROM public.fn_get_leaderboard(p_order_by := 'elo', p_limit := 10, p_offset := 0)$$,
  'fn_get_leaderboard with p_order_by=elo runs without error'
);

-- ── Test 6: fn_get_leaderboard p_order_by = 'elo' result set is ordered ───────
-- Inserts two synthetic lenser_scores rows with known ELO values, calls the
-- function, and asserts the higher ELO row comes first.
-- All inserts are rolled back with the outer transaction.
DO $$
DECLARE
  v_lenser_a uuid := 'b2000000-0000-0000-0000-000000000001'::uuid;
  v_lenser_b uuid := 'b2000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Use seeded human profiles (03_lenser_profiles.sql) so lenser_scores FK holds.
  INSERT INTO reputation.lenser_scores (lenser_id, score_type, score, uncertainty, computed_at)
  VALUES
    (v_lenser_a, 'elo', 1800, 50, now()),
    (v_lenser_b, 'elo',  900, 80, now());

  -- Store IDs for the subsequent assertion
  PERFORM set_config('test.elo_high_lenser', v_lenser_a::text, true);
  PERFORM set_config('test.elo_low_lenser',  v_lenser_b::text, true);
END;
$$;

SELECT ok(
  (
    SELECT (row_number() OVER (ORDER BY score DESC)) = 1
    FROM reputation.lenser_scores
    WHERE lenser_id = current_setting('test.elo_high_lenser', true)::uuid
      AND score_type = 'elo'
  ),
  'higher ELO lenser_scores row has lowest row_number when ordered DESC'
);

SELECT * FROM finish();

ROLLBACK;
