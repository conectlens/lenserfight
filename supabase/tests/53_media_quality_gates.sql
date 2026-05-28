-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 53_media_quality_gates.sql — Phase BK
--
--   1. insert a rule
--   2. conforming image submission passes
--   3. undersized image submission fails with min_width violation
--   4. over-length video submission fails with max_duration violation
--   5. non-owner SELECT on results returns 0 rows
--   6. unknown modality raises 22023
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(6);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b301-1111-1111-111111111111', 'bk-owner@test.local'),
  ('22222222-b301-2222-2222-222222222222', 'bk-other@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email)
VALUES
  ('aaaa3333-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk-c3@test.local'),
  ('aaaa4444-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk-c4@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b301-1111-1111-111111111111',
   '11111111-b301-1111-1111-111111111111', 'bk_owner', 'BK Owner', 'human'),
  ('22222222-b301-2222-2222-222222222222',
   '22222222-b301-2222-2222-222222222222', 'bk_other', 'BK Other', 'human'),
  ('aaaa3333-b301-aaaa-aaaa-aaaaaaaaaaaa',
   'aaaa3333-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk_c3', 'BK C3', 'human'),
  ('aaaa4444-b301-aaaa-aaaa-aaaaaaaaaaaa',
   'aaaa4444-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk_c4', 'BK C4', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-b301-1111-1111-111111111111',
        'BK Template', 'prompt', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status,
  max_contenders, template_id
) VALUES (
  'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-b301-1111-1111-111111111111',
  'BK Battle', 'bk-battle', 'do thing', 'voting',
  2, 'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa'
) ON CONFLICT (id) DO NOTHING;

-- Four contenders so each test scenario can attach to its own
-- (battle, contender) row without violating submissions_battle_contender_unique.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, contender_status
) VALUES
  ('ccccaaaa-b301-cccc-cccc-aaaaaaaaaaaa',
   'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb', 'A',
   'human'::battles.contender_type_enum,
   '11111111-b301-1111-1111-111111111111', 'A', 'accepted'),
  ('ccccaaaa-b301-cccc-cccc-bbbbbbbbbbbb',
   'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb', 'B',
   'human'::battles.contender_type_enum,
   '22222222-b301-2222-2222-222222222222', 'B', 'accepted'),
  ('ccccaaaa-b301-cccc-cccc-cccccccccccc',
   'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb', 'C',
   'human'::battles.contender_type_enum,
   'aaaa3333-b301-aaaa-aaaa-aaaaaaaaaaaa', 'C', 'accepted'),
  ('ccccaaaa-b301-cccc-cccc-dddddddddddd',
   'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb', 'D',
   'human'::battles.contender_type_enum,
   'aaaa4444-b301-aaaa-aaaa-aaaaaaaaaaaa', 'D', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: insert a rule ───────────────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-b301-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
INSERT INTO battles.media_quality_rules (
  template_id, modality, min_width, min_height, max_duration_seconds
) VALUES (
  'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa', 'image', 1024, 1024, NULL
), (
  'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa', 'video', NULL, NULL, 30
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM battles.media_quality_rules
    WHERE template_id = 'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'media_quality_rules accepts the owner-inserted rules'
);

-- ── Test 2: conforming image submission passes ──────────────────────────────
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status,
  content_url, submitted_at, metadata
) VALUES (
  'ddddaaaa-b301-dddd-dddd-aaaaaaaaaaaa',
  'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb',
  'ccccaaaa-b301-cccc-cccc-cccccccccccc',
  'submitted'::battles.submission_status_enum,
  'https://example.test/image.png', now(),
  jsonb_build_object('media',
    jsonb_build_object('modality','image','width',2048,'height',1536))
);

SELECT is(
  (public.fn_check_media_quality('ddddaaaa-b301-dddd-dddd-aaaaaaaaaaaa')).passed,
  true,
  'image meeting min_width/min_height passes the quality gate'
);

-- ── Test 3: undersized image fails with min_width violation ─────────────────
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status,
  content_url, submitted_at, metadata
) VALUES (
  'ddddaaaa-b301-dddd-dddd-bbbbbbbbbbbb',
  'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb',
  'ccccaaaa-b301-cccc-cccc-bbbbbbbbbbbb',
  'submitted'::battles.submission_status_enum,
  'https://example.test/tiny.png', now(),
  jsonb_build_object('media',
    jsonb_build_object('modality','image','width',512,'height',512))
);

SELECT is(
  (public.fn_check_media_quality('ddddaaaa-b301-dddd-dddd-bbbbbbbbbbbb')).passed,
  false,
  'undersized image fails the quality gate'
);

-- Test 4 needs contender D, Test 6 needs contender E — create both up front
-- so submissions can FK to them.
INSERT INTO auth.users (id, email)
VALUES ('aaaa5555-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk-c5@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('aaaa5555-b301-aaaa-aaaa-aaaaaaaaaaaa',
        'aaaa5555-b301-aaaa-aaaa-aaaaaaaaaaaa', 'bk_c5', 'BK C5', 'human')
ON CONFLICT (id) DO NOTHING;
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, contender_status
) VALUES
  ('ccccaaaa-b301-cccc-cccc-eeeeeeeeeeee',
   'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb', 'E',
   'human'::battles.contender_type_enum,
   'aaaa5555-b301-aaaa-aaaa-aaaaaaaaaaaa', 'E', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- ── Test 4: over-length video fails ─────────────────────────────────────────
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status,
  content_url, submitted_at, metadata
) VALUES (
  'ddddaaaa-b301-dddd-dddd-cccccccccccc',
  'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb',
  'ccccaaaa-b301-cccc-cccc-dddddddddddd',
  'submitted'::battles.submission_status_enum,
  'https://example.test/long.mp4', now(),
  jsonb_build_object('media',
    jsonb_build_object('modality','video','duration_seconds',120))
);

SELECT is(
  (public.fn_check_media_quality('ddddaaaa-b301-dddd-dddd-cccccccccccc')).passed,
  false,
  'over-length video fails the quality gate'
);

-- ── Test 5: non-owner SELECT on results returns 0 rows ──────────────────────
-- An unrelated user — neither battle creator nor any contender's ref — sees
-- no results. BK Other is contender B's ref, so they CAN see results for
-- their own submissions; we use a fully-unrelated stranger here.
INSERT INTO auth.users (id, email)
VALUES ('99999999-b301-9999-9999-999999999999', 'bk-stranger@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('99999999-b301-9999-9999-999999999999',
        '99999999-b301-9999-9999-999999999999', 'bk_stranger', 'BK Stranger', 'human')
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"99999999-b301-9999-9999-999999999999","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM battles.media_quality_results),
  0,
  'unrelated user sees zero media_quality_results rows'
);

-- ── Test 6: unknown modality raises 22023 ───────────────────────────────────
RESET ROLE;
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status,
  content_url, submitted_at, metadata
) VALUES (
  'ddddaaaa-b301-dddd-dddd-eeeeeeeeeeee',
  'bbbb1111-b301-bbbb-bbbb-bbbbbbbbbbbb',
  'ccccaaaa-b301-cccc-cccc-eeeeeeeeeeee',
  'submitted'::battles.submission_status_enum,
  'https://example.test/x.blob', now(),
  jsonb_build_object('media', jsonb_build_object('modality','hologram'))
);

SELECT throws_ok(
  $$ SELECT public.fn_check_media_quality(
       'ddddaaaa-b301-dddd-dddd-eeeeeeeeeeee'::uuid) $$,
  '22023',
  NULL,
  'unknown modality raises 22023 (data_exception)'
);

SELECT * FROM finish();
ROLLBACK;
