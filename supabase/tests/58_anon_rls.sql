-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 58_anon_rls.sql — Phase BQ
--
--   1. anon SELECT on a public battle returns the row
--   2. anon SELECT on a private (draft) battle returns 0 rows
--   3. anon SELECT on a public template returns the row
--   4. anon SELECT on a private template returns 0 rows
--   5. anon INSERT into battles.battles raises (privileges revoked)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

INSERT INTO auth.users (id, email)
VALUES ('11111111-b801-1111-1111-111111111111', 'bq-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('11111111-b801-1111-1111-111111111111',
        '11111111-b801-1111-1111-111111111111', 'bq_owner', 'BQ Owner', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES
  ('aaaa1111-b801-1111-1111-111111111111',
   '11111111-b801-1111-1111-111111111111', 'BQ Public tpl', 'p', true),
  ('aaaa1111-b801-2222-2222-222222222222',
   '11111111-b801-1111-1111-111111111111', 'BQ Private tpl', 'p', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES
  ('bbbb1111-b801-1111-1111-111111111111',
   '11111111-b801-1111-1111-111111111111',
   'BQ Public battle', 'bq-public', 'task', 'open', 2),
  ('bbbb1111-b801-2222-2222-222222222222',
   '11111111-b801-1111-1111-111111111111',
   'BQ Draft battle', 'bq-draft', 'task', 'draft', 2)
ON CONFLICT (id) DO NOTHING;

-- Test 1: anon sees the public battle ----------------------------------------
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM battles.battles
    WHERE id = 'bbbb1111-b801-1111-1111-111111111111'),
  1,
  'anon SELECT on a public (open) battle returns the row'
);

-- Test 2: anon does NOT see the draft battle ---------------------------------
SELECT is(
  (SELECT count(*)::int FROM battles.battles
    WHERE id = 'bbbb1111-b801-2222-2222-222222222222'),
  0,
  'anon SELECT on a draft battle returns 0 rows'
);

-- Test 3: anon sees public template ------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM battles.templates
    WHERE id = 'aaaa1111-b801-1111-1111-111111111111'),
  1,
  'anon SELECT on a public template returns the row'
);

-- Test 4: anon does NOT see private template ---------------------------------
SELECT is(
  (SELECT count(*)::int FROM battles.templates
    WHERE id = 'aaaa1111-b801-2222-2222-222222222222'),
  0,
  'anon SELECT on a private template returns 0 rows'
);

-- Test 5: anon INSERT into battles.battles raises ----------------------------
SELECT throws_ok(
  $$ INSERT INTO battles.battles (
       creator_lenser_id, title, slug, task_prompt, status, max_contenders
     ) VALUES (
       '11111111-b801-1111-1111-111111111111'::uuid,
       'evil battle', 'evil', 'evil', 'draft', 2
     ) $$,
  '42501',
  NULL,
  'anon INSERT into battles.battles raises 42501 (privileges revoked)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
