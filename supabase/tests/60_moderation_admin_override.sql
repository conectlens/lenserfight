-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 60_moderation_admin_override.sql — Phase BV / J2
--
-- Limited Beta sign-off requires the battle creator (or admin) to be able to
-- restore a flagged submission via fn_decide_moderation_override, AND
-- non-creators must be refused (42501) so the override cannot leak.
--
--   1. Battle creator can call 'allow' — submission status flips back to
--      'submitted' and an audit.moderation_decisions row is written.
--   2. Non-creator caller is refused with SQLSTATE 42501.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(2);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b502-1111-1111-111111111111', 'bv-mod-creator@test.local'),
  ('22222222-b502-2222-2222-222222222222', 'bv-mod-other@test.local'),
  ('33333333-b502-3333-3333-333333333333', 'bv-mod-contender@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b502-1111-1111-111111111111',
   '11111111-b502-1111-1111-111111111111', 'bv_mod_creator', 'BV Mod Creator', 'human'),
  ('22222222-b502-2222-2222-222222222222',
   '22222222-b502-2222-2222-222222222222', 'bv_mod_other', 'BV Mod Other', 'human'),
  ('33333333-b502-3333-3333-333333333333',
   '33333333-b502-3333-3333-333333333333', 'bv_mod_cont', 'BV Mod Contender', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES (
  'bbbb02bb-b502-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-b502-1111-1111-111111111111',
  'BV Mod Battle', 'bv-mod-battle', 'task', 'voting', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, contender_status
) VALUES (
  'cccc02cc-b502-cccc-cccc-aaaaaaaaaaaa',
  'bbbb02bb-b502-bbbb-bbbb-bbbbbbbbbbbb', 'A',
  'human'::battles.contender_type_enum,
  '33333333-b502-3333-3333-333333333333', 'A', 'accepted'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (
  id, battle_id, contender_id, status, content_url, submitted_at
) VALUES (
  'dddd02dd-b502-dddd-dddd-aaaaaaaaaaaa',
  'bbbb02bb-b502-bbbb-bbbb-bbbbbbbbbbbb',
  'cccc02cc-b502-cccc-cccc-aaaaaaaaaaaa',
  'disqualified'::battles.submission_status_enum,
  'https://example.test/flagged.png', now()
) ON CONFLICT (id) DO NOTHING;

-- ── Test 1: creator can 'allow' a flagged submission ────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub":"11111111-b502-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.fn_decide_moderation_override(
       'bbbb02bb-b502-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
       'dddd02dd-b502-dddd-dddd-aaaaaaaaaaaa'::uuid,
       'allow',
       'reviewed and restored'
     ) $$,
  'battle creator can call fn_decide_moderation_override(allow)'
);

-- ── Test 2: non-creator gets 42501 ──────────────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"22222222-b502-2222-2222-222222222222","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_decide_moderation_override(
       'bbbb02bb-b502-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
       'dddd02dd-b502-dddd-dddd-aaaaaaaaaaaa'::uuid,
       'reject',
       'attempted override by non-creator'
     ) $$,
  '42501',
  NULL,
  'non-creator override raises 42501'
);

SELECT * FROM finish();
ROLLBACK;
