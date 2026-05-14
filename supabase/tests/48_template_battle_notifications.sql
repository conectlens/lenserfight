-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 48_template_battle_notifications.sql — Phase BF coverage.
--
--   1. status → 'open' on a template-sourced battle creates a
--      'template_battle_open' notification for the creator
--   2. status → 'published' creates a 'template_battle_published' notification
--   3. status changes on a battle WITHOUT a template_id create no notification
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa', 'bf-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa', 'bf_owner', 'BF Owner', 'human')
ON CONFLICT (id) DO NOTHING;

-- Source template
INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('11111111-bf01-1111-1111-111111111111',
        'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa',
        'BF Template', 'do the thing', true)
ON CONFLICT (id) DO NOTHING;

-- Two battles: one from template, one ad-hoc.
INSERT INTO battles.battles (id, slug, title, task_prompt, status, battle_type, voter_eligibility, creator_lenser_id, template_id)
VALUES (
  'cccccccc-bf01-cccc-cccc-cccccccccccc',
  'bf-template-battle',
  'BF Template Battle',
  'do the thing',
  'draft'::battles.battle_status_enum,
  'human_vs_human_open_votes'::battles.battle_type_enum,
  'open'::battles.voter_eligibility_enum,
  'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-bf01-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (id, slug, title, task_prompt, status, battle_type, voter_eligibility, creator_lenser_id)
VALUES (
  'cccccccc-bf02-cccc-cccc-cccccccccccc',
  'bf-adhoc-battle',
  'BF Ad-hoc Battle',
  'do the thing',
  'draft'::battles.battle_status_enum,
  'human_vs_human_open_votes'::battles.battle_type_enum,
  'open'::battles.voter_eligibility_enum,
  'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: status → 'open' fires template_battle_open ──────────────────────
UPDATE battles.battles
   SET status = 'open'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf01-cccc-cccc-cccccccccccc';

SELECT is(
  (SELECT count(*)::int FROM public.notifications
    WHERE lenser_id = 'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa'
      AND type = 'template_battle_open'
      AND metadata->>'battle_id' = 'cccccccc-bf01-cccc-cccc-cccccccccccc'),
  1,
  'status → open fires a template_battle_open notification'
);

-- ── Test 2: status → 'published' fires template_battle_published ────────────
UPDATE battles.battles
   SET status = 'voting'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf01-cccc-cccc-cccccccccccc';

UPDATE battles.battles
   SET status = 'scoring'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf01-cccc-cccc-cccccccccccc';

UPDATE battles.battles
   SET status = 'closed'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf01-cccc-cccc-cccccccccccc';

UPDATE battles.battles
   SET status = 'published'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf01-cccc-cccc-cccccccccccc';

SELECT is(
  (SELECT count(*)::int FROM public.notifications
    WHERE lenser_id = 'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa'
      AND type = 'template_battle_published'
      AND metadata->>'battle_id' = 'cccccccc-bf01-cccc-cccc-cccccccccccc'),
  1,
  'status → published fires a template_battle_published notification'
);

-- ── Test 3: ad-hoc battle (no template_id) → no notification ───────────────
UPDATE battles.battles
   SET status = 'open'::battles.battle_status_enum
 WHERE id = 'cccccccc-bf02-cccc-cccc-cccccccccccc';

SELECT is(
  (SELECT count(*)::int FROM public.notifications
    WHERE lenser_id = 'aaaaaaaa-bf01-aaaa-aaaa-aaaaaaaaaaaa'
      AND metadata->>'battle_id' = 'cccccccc-bf02-cccc-cccc-cccccccccccc'),
  0,
  'ad-hoc battle with NULL template_id never produces a notification'
);

SELECT * FROM finish();
ROLLBACK;
