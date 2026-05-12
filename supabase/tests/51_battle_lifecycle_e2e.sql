-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 51_battle_lifecycle_e2e.sql — Phase BI
--
-- End-to-end battle lifecycle:
--   1. create a battle from a template
--   2. enroll contender A
--   3. enroll contender B
--   4. submit text entry from contender A
--   5. submit text entry from contender B
--   6. cast vote from voter #1
--   7. cast vote from voter #2 for a different contender
--   8. close voting + finalize triggers winner computation
--   9. winner_contender_id is set after finalize
--  10. re-voting from voter #1 raises duplicate (uq_votes_battle_voter)
--
-- Mirrors the path scripts/e2e-battle.sh exercises through the CLI.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(10);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b101-1111-1111-111111111111', 'bi-owner@test.local'),
  ('22222222-b101-2222-2222-222222222222', 'bi-bob@test.local'),
  ('33333333-b101-3333-3333-333333333333', 'bi-voter1@test.local'),
  ('44444444-b101-4444-4444-444444444444', 'bi-voter2@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b101-1111-1111-111111111111',
   '11111111-b101-1111-1111-111111111111', 'bi_owner', 'BI Owner', 'human'),
  ('22222222-b101-2222-2222-222222222222',
   '22222222-b101-2222-2222-222222222222', 'bi_bob',   'BI Bob',   'human'),
  ('33333333-b101-3333-3333-333333333333',
   '33333333-b101-3333-3333-333333333333', 'bi_voter1','BI Voter 1','human'),
  ('44444444-b101-4444-4444-444444444444',
   '44444444-b101-4444-4444-444444444444', 'bi_voter2','BI Voter 2','human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('99999999-b101-9999-9999-999999999991',
        '11111111-b101-1111-1111-111111111111',
        'BI Template', 'do the thing', true)
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: create battle from template ─────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-b101-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-b101-9999-9999-999999999991'::uuid,
            'BI Lifecycle Battle',
            'bi-lifecycle');
  PERFORM set_config('lf_test.battle_id', v_id::text, true);
END $$;

RESET ROLE;
SELECT isnt(
  current_setting('lf_test.battle_id', true),
  NULL,
  'fn_battles_create_from_template returns a battle id'
);

-- ── Test 2 & 3: enroll contenders A and B (direct insert via service role) ──
-- Direct insert is the service-role enrollment path; the production CLI uses
-- fn_battles_join for self-enrollment but the lifecycle proof is the same.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01',
  current_setting('lf_test.battle_id')::uuid, 'A',
  'human'::battles.contender_type_enum,
  '11111111-b101-1111-1111-111111111111',
  'BI Owner', 'direct', 'accepted', now()
), (
  '5b5b5b5b-b101-5b5b-5b5b-5b5b5b5b5b02',
  current_setting('lf_test.battle_id')::uuid, 'B',
  'human'::battles.contender_type_enum,
  '22222222-b101-2222-2222-222222222222',
  'BI Bob', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_id')::uuid
      AND slot = 'A'),
  1,
  'contender A is enrolled in the battle'
);

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_id')::uuid
      AND slot = 'B'),
  1,
  'contender B is enrolled in the battle'
);

-- Prepare battle for voting: status must be 'voting' so fn_submit_vote works.
-- We seed minimal submissions, then transition the battle directly.
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status, content_text, submitted_at
) VALUES (
  '5cccccca-b101-5ccc-5ccc-5ccc5ccc5c01',
  current_setting('lf_test.battle_id')::uuid,
  '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01',
  'submitted'::battles.submission_status_enum,
  'Submission A text', now()
), (
  '5cccccca-b101-5ccc-5ccc-5ccc5ccc5c02',
  current_setting('lf_test.battle_id')::uuid,
  '5b5b5b5b-b101-5b5b-5b5b-5b5b5b5b5b02',
  'submitted'::battles.submission_status_enum,
  'Submission B text', now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM battles.submissions
    WHERE battle_id = current_setting('lf_test.battle_id')::uuid),
  2,
  'submissions are recorded for both contenders'
);

-- Step the battle through draft → open → voting so the status-transition
-- trigger is happy. We bypass per-step SECURITY DEFINER RPCs (creator-only)
-- because pgTAP runs as superuser between the JWT toggles.
UPDATE battles.battles
   SET status = 'open' WHERE id = current_setting('lf_test.battle_id')::uuid;
UPDATE battles.battles
   SET status = 'voting',
       voting_opens_at  = now() - interval '1 minute',
       voting_closes_at = now() + interval '1 hour'
 WHERE id = current_setting('lf_test.battle_id')::uuid;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_id')::uuid),
  'voting',
  'battle transitioned to voting status'
);

-- ── Test 6 & 7: cast votes from two distinct voters ─────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"33333333-b101-3333-3333-333333333333","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT public.fn_submit_vote(
  current_setting('lf_test.battle_id')::uuid,
  '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01'::uuid,
  'contender_a'::battles.vote_value_enum,
  false,
  'voter1: I like A'
);
RESET ROLE;

SET LOCAL "request.jwt.claims" TO '{"sub":"44444444-b101-4444-4444-444444444444","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT public.fn_submit_vote(
  current_setting('lf_test.battle_id')::uuid,
  '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01'::uuid,
  'contender_a'::battles.vote_value_enum,
  false,
  'voter2: I also like A'
);
RESET ROLE;

SELECT is(
  (SELECT total_vote_count FROM battles.battles
    WHERE id = current_setting('lf_test.battle_id')::uuid),
  2,
  'total_vote_count = 2 after two votes'
);

SELECT is(
  (SELECT raw_vote_count FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.battle_id')::uuid
      AND contender_id = '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01'),
  2,
  'aggregate for contender A reflects two votes'
);

-- ── Test 10 (run before finalize): re-vote raises duplicate ───────────────
-- Battle is still in 'voting' here; the second vote re-uses the SAME
-- (battle, voter, contender) tuple so the NOT-DEFERRED
-- votes_unique_voter_per_contender constraint fires immediately. The other
-- uq_votes_battle_voter constraint is DEFERRABLE INITIALLY DEFERRED — only
-- caught at COMMIT — which is why we don't rely on it inside the test
-- transaction.
SET LOCAL "request.jwt.claims" TO '{"sub":"33333333-b101-3333-3333-333333333333","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $$ SELECT public.fn_submit_vote(
         %L::uuid,
         '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01'::uuid,
         'contender_a'::battles.vote_value_enum,
         false,
         'voter1: trying again — same contender'
       ) $$,
    current_setting('lf_test.battle_id')
  ),
  '23505',
  NULL,
  'duplicate vote from same voter raises 23505 (unique violation)'
);

RESET ROLE;

-- ── Test 8 & 9: finalize → winner_contender_id computed ─────────────────────
-- Step voting → scoring (status-transition trigger requires the intermediate
-- state) then call fn_battles_finalize which moves scoring → closed and
-- stamps winner_contender_id.
UPDATE battles.battles
   SET status = 'scoring'
 WHERE id = current_setting('lf_test.battle_id')::uuid;

SELECT public.fn_battles_finalize(current_setting('lf_test.battle_id')::uuid);

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_id')::uuid),
  'closed',
  'battle status is closed after finalize'
);

SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.battle_id')::uuid),
  '5a5a5a5a-b101-5a5a-5a5a-5a5a5a5a5a01'::uuid,
  'winner_contender_id is set to the leading contender (A)'
);

SELECT * FROM finish();
ROLLBACK;
