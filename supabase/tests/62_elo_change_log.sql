-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 62_elo_change_log.sql — Phase BV / O3
--
-- Every ELO change must be reflected in reputation.elo_battle_log so disputes
-- can be resolved without replaying matches. Limited Beta sign-off checks:
--
--   1. fn_compute_elo_after_battle on a closed battle writes a row to
--      reputation.elo_battle_log keyed on battle_id.
--   2. The row records both winner/loser score_before and score_after so the
--      delta is auditable.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(2);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b504-1111-1111-111111111111', 'bv-elo-creator@test.local'),
  ('22222222-b504-2222-2222-222222222222', 'bv-elo-winner@test.local'),
  ('33333333-b504-3333-3333-333333333333', 'bv-elo-loser@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b504-1111-1111-111111111111',
   '11111111-b504-1111-1111-111111111111', 'bv_elo_creator', 'BV ELO Creator', 'human'),
  ('22222222-b504-2222-2222-222222222222',
   '22222222-b504-2222-2222-222222222222', 'bv_elo_winner', 'BV ELO Winner', 'human'),
  ('33333333-b504-3333-3333-333333333333',
   '33333333-b504-3333-3333-333333333333', 'bv_elo_loser', 'BV ELO Loser', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES (
  'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-b504-1111-1111-111111111111',
  'BV ELO Battle', 'bv-elo-battle', 'task', 'closed', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, contender_status
) VALUES
  ('cccc04cc-b504-cccc-cccc-aaaaaaaaaaaa',
   'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb', 'A',
   'human'::battles.contender_type_enum,
   '22222222-b504-2222-2222-222222222222', 'A', 'accepted'),
  ('cccc04cc-b504-cccc-cccc-bbbbbbbbbbbb',
   'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb', 'B',
   'human'::battles.contender_type_enum,
   '33333333-b504-3333-3333-333333333333', 'B', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- Mark the winner.
UPDATE battles.battles
   SET winner_contender_id = 'cccc04cc-b504-cccc-cccc-aaaaaaaaaaaa',
       finalized_at        = now()
 WHERE id = 'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb';

-- ── Drive the ELO compute (service-role context). ──────────────────────────
SELECT public.fn_compute_elo_after_battle(
  'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb'::uuid
);

-- ── Test 1: a log row exists for the battle ────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM reputation.elo_battle_log
    WHERE battle_id = 'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'reputation.elo_battle_log has exactly one row after compute'
);

-- ── Test 2: before/after deltas are present and ordered ────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM reputation.elo_battle_log
     WHERE battle_id = 'bbbb04bb-b504-bbbb-bbbb-bbbbbbbbbbbb'
       AND winner_score_before IS NOT NULL
       AND winner_score_after  IS NOT NULL
       AND winner_score_after  > winner_score_before
       AND loser_score_before  IS NOT NULL
       AND loser_score_after   IS NOT NULL
       AND loser_score_after   < loser_score_before
  ),
  'log row records score_before/after deltas (winner up, loser down)'
);

SELECT * FROM finish();
ROLLBACK;
