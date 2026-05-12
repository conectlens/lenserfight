-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 59_battles_create_rate_limit.sql — Phase BV / J1
--
-- The per-lenser rate limit on public.fn_battles_create is the gate that
-- protects the cloud battles arena from runaway creation. Limited Beta sign-off
-- requires:
--
--   1. A normal create returns a UUID and inserts a row.
--   2. The 6th create within a 24-hour window raises battle_rate_limit_exceeded.
--   3. A different user is unaffected — the counter is per-lenser, not global.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-bv01-1111-1111-111111111111', 'bv-creator-a@test.local'),
  ('22222222-bv01-2222-2222-222222222222', 'bv-creator-b@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-bv01-1111-1111-111111111111',
   '11111111-bv01-1111-1111-111111111111', 'bv_creator_a', 'BV Creator A', 'human'),
  ('22222222-bv01-2222-2222-222222222222',
   '22222222-bv01-2222-2222-222222222222', 'bv_creator_b', 'BV Creator B', 'human')
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: a normal create returns a UUID ──────────────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub":"11111111-bv01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT isnt(
  public.fn_battles_create('BV Battle 1', 'bv-battle-1', 'task'),
  NULL,
  'first battle: fn_battles_create returns a non-null UUID'
);

-- ── Test 2: 6th create raises battle_rate_limit_exceeded ────────────────────
-- The Phase J1 cap is 5 per rolling 24h window; the 6th call raises.
DO $$
BEGIN
  PERFORM public.fn_battles_create('BV Battle 2', 'bv-battle-2', 'task');
  PERFORM public.fn_battles_create('BV Battle 3', 'bv-battle-3', 'task');
  PERFORM public.fn_battles_create('BV Battle 4', 'bv-battle-4', 'task');
  PERFORM public.fn_battles_create('BV Battle 5', 'bv-battle-5', 'task');
END $$;

SELECT throws_ok(
  $$ SELECT public.fn_battles_create('BV Battle 6', 'bv-battle-6', 'task') $$,
  NULL,                          -- any error message
  'battle_rate_limit_exceeded',  -- substring match
  '6th create within 24h raises battle_rate_limit_exceeded'
);

-- ── Test 3: a different user is unaffected ──────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"22222222-bv01-2222-2222-222222222222","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT isnt(
  public.fn_battles_create('BV Other Battle', 'bv-other-battle', 'task'),
  NULL,
  'different user can still create — rate limit is per-lenser, not global'
);

SELECT * FROM finish();
ROLLBACK;
