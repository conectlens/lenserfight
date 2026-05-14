-- =============================================================================
-- pgTAP — Phase CI: Profile social XP events + profile completion score
-- plan(4): fn_xp_on_follow exists; trigger exists;
--          fn_profile_completion_score(empty) = 0;
--          fn_profile_completion_score(bio + avatar) > 0
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. fn_xp_on_follow trigger function exists in lensers schema
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lensers'
      AND p.proname = 'fn_xp_on_follow'
  ),
  'lensers.fn_xp_on_follow trigger function exists'
);

-- 2. trg_xp_on_follow trigger is registered on lensers.relationships
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema      = 'lensers'
      AND event_object_table  = 'relationships'
      AND trigger_name        = 'trg_xp_on_follow'
  ),
  'trg_xp_on_follow trigger exists on lensers.relationships'
);

-- 3. fn_profile_completion_score returns 0 for a non-existent lenser
SELECT is(
  public.fn_profile_completion_score('00000000-0000-0000-0000-000000000000'::uuid),
  0,
  'fn_profile_completion_score returns 0 for unknown lenser_id'
);

-- 4. fn_profile_completion_score returns > 0 for a profile with bio + avatar
--    (use a temp profile with known data; roll back at the end of the transaction)
INSERT INTO auth.users (id, email)
VALUES ('81818181-0000-0000-0000-000000000001', 'pgchk-completion@test.local')
ON CONFLICT (id) DO NOTHING;

-- Minimal insert into lensers.profiles — only fields required by check constraints
INSERT INTO lensers.profiles (id, user_id, handle, display_name, bio, avatar_url)
VALUES (
  '81818181-0000-0000-0000-000000000002',
  '81818181-0000-0000-0000-000000000001',
  'test_pgchk_completion',
  'Test pgTAP User',
  'Hello world bio',
  'https://example.com/avatar.png'
)
ON CONFLICT DO NOTHING;

SELECT ok(
  public.fn_profile_completion_score('81818181-0000-0000-0000-000000000002') > 0,
  'fn_profile_completion_score > 0 for profile with bio + avatar'
);

SELECT * FROM finish();
ROLLBACK;
