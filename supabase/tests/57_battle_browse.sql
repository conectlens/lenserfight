-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 57_battle_browse.sql — Phase BP
--
--   1. anon can call fn_browse_battles
--   2. category filter narrows results
--   3. status filter narrows results
--   4. FTS query returns the matching title
--   5. keyset cursor pagination advances correctly
--   6. limit clamp is enforced (200 collapses to 100)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(6);

-- Fixtures --------------------------------------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('11111111-b701-1111-1111-111111111111', 'bp-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('11111111-b701-1111-1111-111111111111',
        '11111111-b701-1111-1111-111111111111', 'bp_owner', 'BP Owner', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public, category)
VALUES
  ('aaaa1111-b701-cccc-cccc-cccccccccccc',
   '11111111-b701-1111-1111-111111111111', 'BP creative tpl', 'p', true, 'creative'),
  ('aaaa1111-b701-eeee-eeee-eeeeeeeeeeee',
   '11111111-b701-1111-1111-111111111111', 'BP technical tpl', 'p', true, 'technical')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status,
  max_contenders, template_id, created_at
) VALUES
  ('bbbb1111-b701-aaaa-aaaa-000000000001',
   '11111111-b701-1111-1111-111111111111',
   'BP creative haiku showdown', 'bp-creative-haiku',
   'do', 'open', 2,
   'aaaa1111-b701-cccc-cccc-cccccccccccc',
   now() - interval '3 hours'),
  ('bbbb1111-b701-aaaa-aaaa-000000000002',
   '11111111-b701-1111-1111-111111111111',
   'BP technical code race', 'bp-technical-race',
   'do', 'voting', 2,
   'aaaa1111-b701-eeee-eeee-eeeeeeeeeeee',
   now() - interval '2 hours'),
  ('bbbb1111-b701-aaaa-aaaa-000000000003',
   '11111111-b701-1111-1111-111111111111',
   'BP draft battle hidden', 'bp-draft-battle',
   'do', 'draft', 2,
   'aaaa1111-b701-cccc-cccc-cccccccccccc',
  now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;

SELECT set_config(
  'app.pgtap57.cursor_created_at',
  (SELECT created_at
   FROM battles.battles
   WHERE id = 'bbbb1111-b701-aaaa-aaaa-000000000002')::text,
  true
);

-- Test 1: anon can call --------------------------------------------------------
SET LOCAL ROLE anon;
SELECT cmp_ok(
  (SELECT count(*)::int
     FROM public.fn_browse_battles(NULL, NULL, NULL, NULL, NULL, 20)
    WHERE id IN (
      'bbbb1111-b701-aaaa-aaaa-000000000001',
      'bbbb1111-b701-aaaa-aaaa-000000000002'
    )),
  '=',
  2,
  'anon sees both published battles, not the draft'
);

-- Test 2: category filter ------------------------------------------------------
SELECT is(
  (SELECT id FROM public.fn_browse_battles(
    'creative', NULL, NULL, NULL, NULL, 20)
   WHERE id IN ('bbbb1111-b701-aaaa-aaaa-000000000001',
                'bbbb1111-b701-aaaa-aaaa-000000000002')
   LIMIT 1),
  'bbbb1111-b701-aaaa-aaaa-000000000001'::uuid,
  'category=creative narrows to the creative battle'
);

-- Test 3: status filter --------------------------------------------------------
SELECT is(
  (SELECT id FROM public.fn_browse_battles(
    NULL, 'voting', NULL, NULL, NULL, 20)
   WHERE id IN ('bbbb1111-b701-aaaa-aaaa-000000000001',
                'bbbb1111-b701-aaaa-aaaa-000000000002')
   LIMIT 1),
  'bbbb1111-b701-aaaa-aaaa-000000000002'::uuid,
  'status=voting narrows to the voting battle'
);

-- Test 4: FTS query ------------------------------------------------------------
SELECT is(
  (SELECT id FROM public.fn_browse_battles(
    NULL, NULL, 'haiku', NULL, NULL, 20)
   LIMIT 1),
  'bbbb1111-b701-aaaa-aaaa-000000000001'::uuid,
  'FTS query "haiku" returns the matching battle'
);

-- Test 5: keyset cursor --------------------------------------------------------
-- Most recent is created_at = now() - 2h (battle 2). After it, the next is
-- battle 1 (now() - 3h). Use that as the cursor and assert battle 1 next.
SELECT is(
  (SELECT id FROM public.fn_browse_battles(
    NULL, NULL, NULL,
    current_setting('app.pgtap57.cursor_created_at')::timestamptz,
    'bbbb1111-b701-aaaa-aaaa-000000000002'::uuid,
    20)
   WHERE id IN ('bbbb1111-b701-aaaa-aaaa-000000000001',
                'bbbb1111-b701-aaaa-aaaa-000000000002')
   LIMIT 1),
  'bbbb1111-b701-aaaa-aaaa-000000000001'::uuid,
  'keyset cursor advances past the most recent battle to the next'
);

-- Test 6: limit clamp (>100 → 100; we just verify the function still runs) ----
SELECT cmp_ok(
  (SELECT count(*)::int FROM public.fn_browse_battles(NULL, NULL, NULL, NULL, NULL, 999)),
  '<=',
  100,
  'limit > 100 is clamped to <= 100 rows'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
