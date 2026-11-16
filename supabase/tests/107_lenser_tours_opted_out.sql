-- =============================================================================
-- pgTAP — lenser tours_opted_out global flag (issue #483)
--
-- Tests:
--   1.  lensers.preferences.tours_opted_out column exists
--   2.  tours_opted_out is NOT NULL
--   3.  tours_opted_out defaults to false
--   4.  public.fn_lensers_set_tours_opted_out(boolean) exists
--   5.  fn_lensers_set_tours_opted_out is SECURITY DEFINER
--   6.  authenticated role has EXECUTE on fn_lensers_set_tours_opted_out
--   7.  anon role cannot EXECUTE fn_lensers_set_tours_opted_out
--   8.  setting the flag to true persists it
--   9.  setting the flag back to false reverses it
-- =============================================================================
BEGIN;

SELECT plan(9);

-- ─── Fixtures ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email)
VALUES ('106aa000-0000-0000-0000-000000000001', 'tour-106@test.local')
ON CONFLICT (id) DO NOTHING;

-- Profile insert auto-creates the lensers.preferences row via
-- trg_create_default_preferences.
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('106bb000-0000-0000-0000-000000000001',
        '106aa000-0000-0000-0000-000000000001',
        'tour106', 'Tour 106', 'human')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Structural assertions (as migration role)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. tours_opted_out column exists
SELECT has_column(
  'lensers',
  'preferences',
  'tours_opted_out',
  'lensers.preferences.tours_opted_out column should exist'
);

-- 2. tours_opted_out is NOT NULL
SELECT col_not_null(
  'lensers',
  'preferences',
  'tours_opted_out',
  'lensers.preferences.tours_opted_out should be NOT NULL'
);

-- 3. tours_opted_out defaults to false
SELECT col_default_is(
  'lensers',
  'preferences',
  'tours_opted_out',
  'false',
  'lensers.preferences.tours_opted_out should default to false'
);

-- 4. fn_lensers_set_tours_opted_out exists
SELECT has_function(
  'public',
  'fn_lensers_set_tours_opted_out',
  ARRAY['boolean'],
  'public.fn_lensers_set_tours_opted_out(boolean) should exist'
);

-- 5. fn_lensers_set_tours_opted_out is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_lensers_set_tours_opted_out'
  ),
  'public.fn_lensers_set_tours_opted_out should be SECURITY DEFINER'
);

-- 6. authenticated can execute
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.fn_lensers_set_tours_opted_out(boolean)',
    'EXECUTE'
  ),
  'authenticated should have EXECUTE on fn_lensers_set_tours_opted_out'
);

-- 7. anon cannot execute (default-privilege grant revoked by migration)
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_lensers_set_tours_opted_out(boolean)',
    'EXECUTE'
  ),
  'anon should NOT have EXECUTE on fn_lensers_set_tours_opted_out'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Behavior (authenticated caller, own profile)
-- ═══════════════════════════════════════════════════════════════════════════

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '106aa000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

-- 8. setting the flag to true persists it
SELECT public.fn_lensers_set_tours_opted_out(true);

SELECT ok(
  (
    SELECT tours_opted_out
      FROM lensers.preferences
     WHERE lenser_id = '106bb000-0000-0000-0000-000000000001'
  ),
  'setting tours_opted_out to true persists it'
);

-- 9. setting the flag back to false reverses it
SELECT public.fn_lensers_set_tours_opted_out(false);

SELECT ok(
  NOT (
    SELECT tours_opted_out
      FROM lensers.preferences
     WHERE lenser_id = '106bb000-0000-0000-0000-000000000001'
  ),
  'setting tours_opted_out back to false reverses it'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
