-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 46_battle_template_authoring.sql — Phase BD coverage.
--
--   1. create_template returns the inserted row
--   2. update_template applies a partial patch (title only)
--   3. delete_template sets deleted_at
--   4. deleted template is excluded from fn_list_public_battle_templates
--   5. non-owner update raises 42501 (template_not_owned)
--   6. non-owner delete raises 42501 (template_not_owned)
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(7);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa', 'bd-owner@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bd01-bbbb-bbbb-bbbbbbbbbbbb', 'bd-other@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa', 'bd_owner', 'BD Owner', 'human'),
  ('bbbbbbbb-bd01-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bd01-bbbb-bbbb-bbbbbbbbbbbb', 'bd_other', 'BD Other', 'human')
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- ── Test 1: create returns inserted row ─────────────────────────────────────
SELECT is(
  (public.fn_battles_create_template(
     'BD Test Template',
     'short desc',
     'do the thing',
     'creative',
     2,
     true
   )).title,
  'BD Test Template',
  'create_template returns the inserted row'
);

-- Grab the id of the row we just created and stash it in a GUC so the
-- subsequent assertions can read it back with current_setting().
RESET ROLE;
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id
    FROM battles.templates
   WHERE title = 'BD Test Template'
     AND creator_lenser_id = 'aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa'
   LIMIT 1;
  PERFORM set_config('lf_test.template_id', v_id::text, true);
END $$;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- ── Test 2: update applies a partial patch ──────────────────────────────────
SELECT is(
  (public.fn_battles_update_template(
     current_setting('lf_test.template_id')::uuid,
     'BD Renamed', NULL, NULL, NULL, NULL, NULL
   )).title,
  'BD Renamed',
  'update_template patches only the provided field'
);

-- description should be unchanged
SELECT is(
  (SELECT description FROM battles.templates
    WHERE id = current_setting('lf_test.template_id')::uuid),
  'short desc',
  'update_template leaves untouched fields alone'
);

-- ── Test 3: delete sets deleted_at ──────────────────────────────────────────
SELECT public.fn_battles_delete_template(
  current_setting('lf_test.template_id')::uuid
);

RESET ROLE;
SELECT isnt(
  (SELECT deleted_at FROM battles.templates
    WHERE id = current_setting('lf_test.template_id')::uuid)::text,
  NULL,
  'delete_template stamps deleted_at'
);

-- ── Test 4: deleted template excluded from public list ──────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int
     FROM public.fn_list_public_battle_templates(NULL, 100)
    WHERE id = current_setting('lf_test.template_id')::uuid),
  0,
  'deleted templates do not appear in fn_list_public_battle_templates'
);

-- ── Test 5: non-owner update raises 42501 ───────────────────────────────────
-- First re-create a fresh template for the cross-user tests.
SELECT public.fn_battles_create_template(
  'BD Other Template', 'desc', 'prompt', 'gaming', 2, true
);
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id
    FROM battles.templates
   WHERE title = 'BD Other Template'
     AND creator_lenser_id = 'aaaaaaaa-bd01-aaaa-aaaa-aaaaaaaaaaaa'
   ORDER BY created_at DESC LIMIT 1;
  PERFORM set_config('lf_test.template_id_2', v_id::text, true);
END $$;

RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bd01-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  format(
    $$ SELECT public.fn_battles_update_template(%L::uuid, 'Hack', NULL, NULL, NULL, NULL, NULL) $$,
    current_setting('lf_test.template_id_2')
  ),
  '42501',
  'template_not_owned',
  'non-owner update raises 42501'
);

-- ── Test 6: non-owner delete raises 42501 ───────────────────────────────────
SELECT throws_ok(
  format(
    $$ SELECT public.fn_battles_delete_template(%L::uuid) $$,
    current_setting('lf_test.template_id_2')
  ),
  '42501',
  'template_not_owned',
  'non-owner delete raises 42501'
);

SELECT * FROM finish();
ROLLBACK;
