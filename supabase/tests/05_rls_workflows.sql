-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 05_rls_workflows.sql
-- Validates RLS enforcement on lenses.workflows.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(4);

-- ── Fixture: use seeded Alice profile + auth user (02_auth_users / 03_lenser_profiles)
-- profile id b2000000-…-0001, user_id a1000000-…-0001

-- ── Test 1: authenticated owner can INSERT into lenses.workflows ───────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'a1000000-0000-0000-0000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT lives_ok(
  $$
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'Owned workflow',
    'Created by the authenticated profile owner',
    'public'
  )
  $$,
  'authenticated owner can INSERT into lenses.workflows'
);

-- ── Test 2: authenticated user cannot spoof a different lenser_id ──────────
SELECT throws_ok(
  $$
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (
    'b2000000-0000-0000-0000-000000000002'::uuid,
    'Spoofed workflow',
    NULL,
    'public'
  )
  $$,
  '42501',
  NULL,
  'authenticated user cannot spoof a different lenser_id'
);

RESET ROLE;

-- ── Test 3: anon cannot INSERT into lenses.workflows ────────────────────────
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'Anon workflow',
    NULL,
    'public'
  )
  $$,
  '42501',
  NULL,
  'anon cannot INSERT into lenses.workflows'
);

RESET ROLE;

-- ── Test 4: owner insert policy exists on lenses.workflows ─────────────────
SELECT ok(
  EXISTS(
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lenses'
      AND tablename = 'workflows'
      AND policyname = 'workflows_owner_insert'
      AND cmd = 'INSERT'
  ),
  'workflows_owner_insert policy exists'
);

SELECT * FROM finish();

ROLLBACK;
