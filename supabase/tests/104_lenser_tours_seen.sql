-- =============================================================================
-- pgTAP — lenser tours_seen (issue #430)
--
-- Tests:
--   1.  lensers.preferences.tours_seen column exists
--   2.  tours_seen is NOT NULL
--   3.  tours_seen defaults to '{}'::jsonb
--   4.  public.fn_lensers_mark_tour_seen(text) exists
--   5.  fn_lensers_mark_tour_seen is SECURITY DEFINER
--   6.  authenticated role has EXECUTE on fn_lensers_mark_tour_seen
--   7.  anon role cannot EXECUTE fn_lensers_mark_tour_seen
--   8.  marking two tours merges keys without dropping the first
--   9.  re-marking the same tour keeps a single key (timestamp refreshed)
--   10. invalid tour id is rejected
-- =============================================================================
BEGIN;

SELECT plan(10);

-- ─── Fixtures ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email)
VALUES ('104aa000-0000-0000-0000-000000000001', 'tour-104@test.local')
ON CONFLICT (id) DO NOTHING;

-- Profile insert auto-creates the lensers.preferences row via
-- trg_create_default_preferences.
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('104bb000-0000-0000-0000-000000000001',
        '104aa000-0000-0000-0000-000000000001',
        'tour104', 'Tour 104', 'human')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Structural assertions (as migration role)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. tours_seen column exists
SELECT has_column(
  'lensers',
  'preferences',
  'tours_seen',
  'lensers.preferences.tours_seen column should exist'
);

-- 2. tours_seen is NOT NULL
SELECT col_not_null(
  'lensers',
  'preferences',
  'tours_seen',
  'lensers.preferences.tours_seen should be NOT NULL'
);

-- 3. tours_seen defaults to '{}'::jsonb
SELECT col_default_is(
  'lensers',
  'preferences',
  'tours_seen',
  $$'{}'::jsonb$$,
  'lensers.preferences.tours_seen should default to empty jsonb object'
);

-- 4. fn_lensers_mark_tour_seen exists
SELECT has_function(
  'public',
  'fn_lensers_mark_tour_seen',
  ARRAY['text'],
  'public.fn_lensers_mark_tour_seen(text) should exist'
);

-- 5. fn_lensers_mark_tour_seen is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_lensers_mark_tour_seen'
  ),
  'public.fn_lensers_mark_tour_seen should be SECURITY DEFINER'
);

-- 6. authenticated can execute
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.fn_lensers_mark_tour_seen(text)',
    'EXECUTE'
  ),
  'authenticated should have EXECUTE on fn_lensers_mark_tour_seen'
);

-- 7. anon cannot execute (default-privilege grant revoked by migration)
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_lensers_mark_tour_seen(text)',
    'EXECUTE'
  ),
  'anon should NOT have EXECUTE on fn_lensers_mark_tour_seen'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Behavior (authenticated caller, own profile)
-- ═══════════════════════════════════════════════════════════════════════════

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '104aa000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

-- 8. marking two tours merges keys without dropping the first
SELECT public.fn_lensers_mark_tour_seen('web.onboarding');
SELECT public.fn_lensers_mark_tour_seen('battle-intro.v2');

SELECT ok(
  (
    SELECT tours_seen ? 'web.onboarding' AND tours_seen ? 'battle-intro.v2'
      FROM lensers.preferences
     WHERE lenser_id = '104bb000-0000-0000-0000-000000000001'
  ),
  'marking two tours merges keys without dropping the first'
);

-- 9. re-marking the same tour keeps a single key with a timestamp value
SELECT public.fn_lensers_mark_tour_seen('web.onboarding');

SELECT ok(
  (
    SELECT jsonb_typeof(tours_seen -> 'web.onboarding') = 'string'
      FROM lensers.preferences
     WHERE lenser_id = '104bb000-0000-0000-0000-000000000001'
  ),
  're-marking a tour keeps the key with an ISO timestamp string value'
);

-- 10. invalid tour id is rejected
SELECT throws_ok(
  $$SELECT public.fn_lensers_mark_tour_seen('Bad Tour!')$$,
  'P0001',
  'invalid tour id: Bad Tour!',
  'invalid tour id should be rejected'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
