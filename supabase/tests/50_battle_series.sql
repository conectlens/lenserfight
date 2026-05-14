-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 50_battle_series.sql — Phase BH coverage.
--
--   1. fn_create_battle_series creates a series + round 1 battle
--   2. fn_advance_series increments current_round
--   3. fn_advance_series on the final round stamps status='complete'
--   4. fn_get_series returns every round row for the owner
--   5. non-owner advance raises 42501
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa', 'bh-owner@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-b801-bbbb-bbbb-bbbbbbbbbbbb', 'bh-other@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa', 'bh_owner', 'BH Owner', 'human'),
  ('bbbbbbbb-b801-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-b801-bbbb-bbbb-bbbbbbbbbbbb', 'bh_other', 'BH Other', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('11111111-b801-1111-1111-111111111111',
        'aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa',
        'BH Template', 'do the thing', true)
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- ── Test 1: create_series populates round 1 ─────────────────────────────────
SELECT public.fn_create_battle_series(
  '11111111-b801-1111-1111-111111111111'::uuid,
  'BH Series',
  2
);

RESET ROLE;

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM battles.series WHERE title = 'BH Series'
   ORDER BY created_at DESC LIMIT 1;
  PERFORM set_config('lf_test.series_id', v_id::text, true);
END $$;

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM battles.series_rounds
    WHERE series_id = current_setting('lf_test.series_id')::uuid),
  1,
  'create_series inserts a round 1 series_rounds row'
);

-- ── Test 2: advance_series increments current_round ─────────────────────────
-- Simulate a winner on round 1 by writing to battles.battles.winner_contender_id
-- We need a contender first. Stamp the battle with a fake contender we create.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id, display_name
)
SELECT 'dddddddd-b801-dddd-dddd-dddddddddddd', sr.battle_id, 'A',
       'human'::battles.contender_type_enum,
       'aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa', 'BH Owner'
  FROM battles.series_rounds sr
 WHERE sr.series_id = current_setting('lf_test.series_id')::uuid
   AND sr.round_number = 1
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
   SET winner_contender_id = 'dddddddd-b801-dddd-dddd-dddddddddddd'
 WHERE id = (
   SELECT battle_id FROM battles.series_rounds
    WHERE series_id = current_setting('lf_test.series_id')::uuid
      AND round_number = 1
 );

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (public.fn_advance_series(current_setting('lf_test.series_id')::uuid)).current_round,
  2,
  'advance_series increments current_round to 2 after winner declared'
);

-- ── Test 3: advance on final round stamps complete ──────────────────────────
-- We need a winner for round 2 too.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id, display_name
)
SELECT 'dddddddd-b802-dddd-dddd-dddddddddddd', sr.battle_id, 'A',
       'human'::battles.contender_type_enum,
       'aaaaaaaa-b801-aaaa-aaaa-aaaaaaaaaaaa', 'BH Owner'
  FROM battles.series_rounds sr
 WHERE sr.series_id = current_setting('lf_test.series_id')::uuid
   AND sr.round_number = 2
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
   SET winner_contender_id = 'dddddddd-b802-dddd-dddd-dddddddddddd'
 WHERE id = (
   SELECT battle_id FROM battles.series_rounds
    WHERE series_id = current_setting('lf_test.series_id')::uuid
      AND round_number = 2
 );

SELECT is(
  (public.fn_advance_series(current_setting('lf_test.series_id')::uuid)).status,
  'complete',
  'advance_series on the final round marks the series complete'
);

-- ── Test 4: fn_get_series returns every round ───────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.fn_get_series(current_setting('lf_test.series_id')::uuid)),
  2,
  'fn_get_series returns one row per round'
);

-- ── Test 5: non-owner advance raises 42501 ──────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-b801-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $$ SELECT public.fn_advance_series(%L::uuid) $$,
    current_setting('lf_test.series_id')
  ),
  '42501',
  'series_not_owned',
  'non-owner advance raises 42501'
);

SELECT * FROM finish();
ROLLBACK;
