-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 45_battle_media_upload.sql — Phase BC coverage.
--
--   1. submit_media sets media_url, mime_type, output_modality, status=submitted
--   2. returned row has media_url == input
--   3. non-contender caller throws 42501 (contender_not_owned)
--   4. invalid modality throws 22023
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(4);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa', 'bc-contender@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bc01-bbbb-bbbb-bbbbbbbbbbbb', 'bc-other@test.local')
ON CONFLICT (id) DO NOTHING;

-- Minimal profile rows so the join through contender_entity_map.profile_id works.
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa', 'bc_contender', 'BC Contender', 'human'),
  ('bbbbbbbb-bc01-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bc01-bbbb-bbbb-bbbbbbbbbbbb', 'bc_other',     'BC Other',     'human')
ON CONFLICT (id) DO NOTHING;

-- Battle + contender (the contender's contender_entity_map.profile_id is the owner).
INSERT INTO battles.battles (id, slug, title, task_prompt, status, battle_type, voter_eligibility, creator_lenser_id)
VALUES (
  'cccccccc-bc01-cccc-cccc-cccccccccccc',
  'bc-test-battle',
  'BC Test Battle',
  'render an image',
  'open'::battles.battle_status_enum,
  'human_vs_human_open_votes'::battles.battle_type_enum,
  'open'::battles.voter_eligibility_enum,
  'aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO NOTHING;

-- Insert contender row directly; the AFTER INSERT trigger auto-populates
-- contender_entity_map from contender_ref_id + contender_type.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id, display_name
) VALUES (
  'dddddddd-bc01-dddd-dddd-dddddddddddd',
  'cccccccc-bc01-cccc-cccc-cccccccccccc',
  'A',
  'human'::battles.contender_type_enum,
  'aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa',
  'BC Contender'
)
ON CONFLICT (id) DO NOTHING;

-- ── Run as the owner ────────────────────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- Test 1: submit_media sets the columns.
SELECT public.fn_battles_submit_media(
  'cccccccc-bc01-cccc-cccc-cccccccccccc'::uuid,
  'dddddddd-bc01-dddd-dddd-dddddddddddd'::uuid,
  'https://example.com/media/file.png',
  'image/png',
  'image'
);

RESET ROLE;
SELECT is(
  (SELECT status::text FROM battles.submissions
     WHERE contender_id = 'dddddddd-bc01-dddd-dddd-dddddddddddd'::uuid),
  'submitted',
  'submit_media sets status to submitted'
);

-- Test 2: returned row has the correct media_url.
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (public.fn_battles_submit_media(
     'cccccccc-bc01-cccc-cccc-cccccccccccc'::uuid,
     'dddddddd-bc01-dddd-dddd-dddddddddddd'::uuid,
     'https://example.com/media/v2.png',
     'image/png',
     'image'
   )).media_url,
  'https://example.com/media/v2.png',
  'submit_media returns the updated row with new media_url'
);

-- Test 3: non-contender caller raises 42501 (contender_not_owned).
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bc01-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_battles_submit_media(
       'cccccccc-bc01-cccc-cccc-cccccccccccc'::uuid,
       'dddddddd-bc01-dddd-dddd-dddddddddddd'::uuid,
       'https://example.com/media/intruder.png',
       'image/png',
       'image'
     ) $$,
  '42501',
  'contender_not_owned',
  'non-contender caller is rejected with 42501'
);

-- Test 4: invalid modality raises 22023.
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bc01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_battles_submit_media(
       'cccccccc-bc01-cccc-cccc-cccccccccccc'::uuid,
       'dddddddd-bc01-dddd-dddd-dddddddddddd'::uuid,
       'https://example.com/media/bogus.bin',
       'application/octet-stream',
       'text'
     ) $$,
  '22023',
  NULL,
  'invalid output modality raises 22023'
);

SELECT * FROM finish();
ROLLBACK;
