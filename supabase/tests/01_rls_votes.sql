-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 01_rls_votes.sql
-- Validates RLS enforcement and fn_submit_vote guards on battles.votes.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

-- ── Test 1: authenticated role cannot INSERT directly into battles.votes ─────
-- Migration A2 dropped the "Non-contenders can vote" INSERT policy.
-- Any direct INSERT by the authenticated role must be refused (SQLSTATE 42501).
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  INSERT INTO battles.votes (battle_id, voter_lenser_id, vote_value, voted_contender_id, is_draw)
  VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'contender_a',
    gen_random_uuid(),
    false
  )
  $$,
  '42501',
  NULL,
  'authenticated role cannot INSERT directly into battles.votes'
);

-- Reset to postgres for remaining tests
RESET ROLE;

-- ── Test 2: fn_submit_vote raises battle_not_in_voting_phase ─────────────────
-- A battle UUID that does not exist cannot be in voting phase.
-- The function raises RAISE EXCEPTION 'battle_not_in_voting_phase: …' → P0001.
SELECT throws_ok(
  $$
  SELECT public.fn_submit_vote(
    p_battle_id          := '00000000-0000-0000-0000-000000000001'::uuid,
    p_voted_contender_id := '00000000-0000-0000-0000-000000000002'::uuid,
    p_vote_value         := 'contender_a'::battles.vote_value_enum
  )
  $$,
  'P0001',
  'battle_not_in_voting_phase%',
  'fn_submit_vote raises battle_not_in_voting_phase for non-existent battle'
);

-- ── Test 3: service_role can SELECT from reputation.vote_risk_scores ──────────
-- vote_risk_scores RLS allows service_role full access.
SELECT lives_ok(
  $$SELECT count(*) FROM reputation.vote_risk_scores$$,
  'service_role can SELECT from reputation.vote_risk_scores'
);

-- ── Test 4: authenticated role cannot SELECT from reputation.vote_risk_scores ─
-- vote_risk_scores is restricted to service_role only (anti-fraud data).
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT count(*) FROM reputation.vote_risk_scores$$,
  '42501',
  NULL,
  'authenticated role cannot SELECT from reputation.vote_risk_scores'
);

RESET ROLE;

-- ── Test 5: battles.vote_aggregates has no INSERT policy for authenticated ────
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
  INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count)
  VALUES (gen_random_uuid(), gen_random_uuid(), 1, 1, 0)
  $$,
  '42501',
  NULL,
  'authenticated role cannot INSERT directly into battles.vote_aggregates'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
