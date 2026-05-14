-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 59_battles_create_rate_limit.sql — Phase BV / J1 v2
--
-- Per-lenser rate limit on public.fn_battles_create (20 per rolling hour).
--
--   1. A normal create returns a UUID.
--   2. The 21st create within the 1-hour window raises battle_rate_limit_exceeded.
--   3. A different user is unaffected — the counter is per-lenser, not global.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b501-1111-1111-111111111111', 'bv-creator-a@test.local'),
  ('22222222-b501-2222-2222-222222222222', 'bv-creator-b@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b501-1111-1111-111111111111',
   '11111111-b501-1111-1111-111111111111', 'bv_creator_a', 'BV Creator A', 'human'),
  ('22222222-b501-2222-2222-222222222222',
   '22222222-b501-2222-2222-222222222222', 'bv_creator_b', 'BV Creator B', 'human')
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: a normal create returns a UUID ──────────────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub":"11111111-b501-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT isnt(
  public.fn_battles_create('BV Battle 1', 'bv-battle-1', 'task'),
  NULL,
  'first battle: fn_battles_create returns a non-null UUID'
);

-- ── Test 2: 21st create raises battle_rate_limit_exceeded ───────────────────
-- The J1 v2 cap is 20 per rolling hour; the 21st call raises.
DO $$
DECLARE i integer;
BEGIN
  FOR i IN 2..20 LOOP
    PERFORM public.fn_battles_create(
      'BV Battle ' || i,
      'bv-battle-' || i,
      'task'
    );
  END LOOP;
END $$;

SELECT throws_ok(
  $$ SELECT public.fn_battles_create('BV Battle 21', 'bv-battle-21', 'task') $$,
  NULL,                          -- any SQLSTATE
  'battle_rate_limit_exceeded',  -- message substring
  '21st create within 1 hour raises battle_rate_limit_exceeded'
);

-- ── Test 3: a different user is unaffected ──────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"22222222-b501-2222-2222-222222222222","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT isnt(
  public.fn_battles_create('BV Other Battle', 'bv-other-battle', 'task'),
  NULL,
  'different user can still create — rate limit is per-lenser, not global'
);

SELECT * FROM finish();
ROLLBACK;
