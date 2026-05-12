-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 58_anon_rls.sql — Phase BQ / updated Phase BY
--
-- Phase BY migrations (20271122, 20271123) revoked direct anon SELECT from
-- all non-public schema tables. Anon battle discovery now routes through
-- public-schema SECURITY DEFINER RPCs (fn_browse_battles, etc.).
--
-- Tests:
--   1. anon SELECT on battles.battles raises 42501 (privilege revoked)
--   2. anon SELECT on battles.templates raises 42501 (privilege revoked)
--   3. anon SELECT on lensers.profiles raises 42501 (privilege revoked)
--   4. anon INSERT into battles.battles raises 42501 (privilege revoked)
--   5. anon can call fn_browse_battles (public-schema SECURITY DEFINER)
--   6. fn_browse_battles returns open battle, not draft
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(6);

-- Fixtures (service_role inserts) --------------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('11111111-b801-1111-1111-111111111111', 'bq-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('11111111-b801-1111-1111-111111111111',
        '11111111-b801-1111-1111-111111111111', 'bq_owner', 'BQ Owner', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES
  ('bbbb1111-b801-1111-1111-111111111111',
   '11111111-b801-1111-1111-111111111111',
   'BQ Open battle', 'bq-open', 'task', 'open', 2),
  ('bbbb1111-b801-2222-2222-222222222222',
   '11111111-b801-1111-1111-111111111111',
   'BQ Draft battle', 'bq-draft', 'task', 'draft', 2)
ON CONFLICT (id) DO NOTHING;

-- Test 1: anon cannot directly SELECT battles.battles (privilege revoked) ----
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM battles.battles$$,
  '42501',
  NULL,
  'anon direct SELECT on battles.battles raises 42501 (privilege revoked in Phase BY)'
);

-- Test 2: anon cannot directly SELECT battles.templates ----------------------
SELECT throws_ok(
  $$SELECT count(*) FROM battles.templates$$,
  '42501',
  NULL,
  'anon direct SELECT on battles.templates raises 42501 (privilege revoked in Phase BY)'
);

-- Test 3: anon cannot directly SELECT lensers.profiles -----------------------
SELECT throws_ok(
  $$SELECT count(*) FROM lensers.profiles$$,
  '42501',
  NULL,
  'anon direct SELECT on lensers.profiles raises 42501 (privilege revoked in Phase BY)'
);

-- Test 4: anon INSERT into battles.battles raises ----------------------------
SELECT throws_ok(
  $$ INSERT INTO battles.battles (
       creator_lenser_id, title, slug, task_prompt, status, max_contenders
     ) VALUES (
       '11111111-b801-1111-1111-111111111111'::uuid,
       'evil battle', 'bq-evil', 'evil', 'draft', 2
     ) $$,
  '42501',
  NULL,
  'anon INSERT into battles.battles raises 42501 (privileges revoked)'
);

RESET ROLE;

-- Tests 5-6: anon accesses battles via public SECURITY DEFINER RPC -----------
SET LOCAL ROLE anon;

SELECT lives_ok(
  $$SELECT id FROM public.fn_browse_battles(NULL, NULL, NULL, NULL, NULL, 10)$$,
  'anon can call fn_browse_battles (public SECURITY DEFINER RPC)'
);

SELECT ok(
  (SELECT id FROM public.fn_browse_battles(NULL, NULL, NULL, NULL, NULL, 100)
    WHERE id = 'bbbb1111-b801-1111-1111-111111111111'::uuid) IS NOT NULL,
  'fn_browse_battles returns the open battle for anon'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
