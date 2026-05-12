-- =============================================================================
-- pgTAP — Phase BY/BZ: Visibility matrix for public / community / private
--
-- Covers lenses.lenses, content.threads, lensers.profiles, execution.artifacts
-- across anon, owner, and non-owner authenticated roles.
--
-- Design behavior to document:
--   lenses.lenses:
--     anon  → cannot access table directly (grant revoked Phase BY)
--     auth  → sees public + community + own; NOT other-owner private
--   content.threads:
--     anon  → cannot access table directly (grant revoked Phase BY)
--     auth  → sees public + community + own; NOT other-owner private
--   lensers.profiles (profiles_select policy):
--     anon  → cannot access table directly (grant revoked Phase BY)
--     auth  → sees public + community + private (all active profiles)
--             FINDING: 'private' profile is visible to ALL authenticated
--             users per profiles_select policy (not just owner). This is
--             intentional platform design (private = not discoverable, not
--             hidden from authenticated users who know the handle/URL).
--   execution.artifacts:
--     auth/owner   → always sees own artifacts
--     auth/non-owner + visibility=public   → sees it
--     auth/non-owner + visibility=private  → does NOT see it
-- =============================================================================
BEGIN;

SELECT plan(18);

-- ─── Fixtures (run as postgres/service_role) ────────────────────────────────

-- Alice (owner)
INSERT INTO auth.users (id, email)
VALUES ('74aa0000-0000-0000-0000-000000000001', 'alice-74@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type, visibility)
VALUES ('74bb0000-0000-0000-0000-000000000001',
        '74aa0000-0000-0000-0000-000000000001',
        'alice74', 'Alice 74', 'human', 'public')
ON CONFLICT (id) DO NOTHING;

-- Bob (non-owner authenticated viewer)
INSERT INTO auth.users (id, email)
VALUES ('74aa0000-0000-0000-0000-000000000002', 'bob-74@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type, visibility)
VALUES ('74bb0000-0000-0000-0000-000000000002',
        '74aa0000-0000-0000-0000-000000000002',
        'bob74', 'Bob 74', 'human', 'public')
ON CONFLICT (id) DO NOTHING;

-- Alice's lenses
INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
VALUES
  ('74cc0000-0000-0000-0000-000000000001',
   '74bb0000-0000-0000-0000-000000000001', 'public', 'published'),
  ('74cc0000-0000-0000-0000-000000000002',
   '74bb0000-0000-0000-0000-000000000001', 'community', 'published'),
  ('74cc0000-0000-0000-0000-000000000003',
   '74bb0000-0000-0000-0000-000000000001', 'private', 'published'),
  ('74cc0000-0000-0000-0000-000000000004',
   '74bb0000-0000-0000-0000-000000000001', 'public', 'draft')
ON CONFLICT (id) DO NOTHING;

-- Alice's threads
INSERT INTO content.threads (id, lenser_id, visibility, status)
VALUES
  ('74dd0000-0000-0000-0000-000000000001',
   '74bb0000-0000-0000-0000-000000000001', 'public', 'published'),
  ('74dd0000-0000-0000-0000-000000000002',
   '74bb0000-0000-0000-0000-000000000001', 'community', 'published'),
  ('74dd0000-0000-0000-0000-000000000003',
   '74bb0000-0000-0000-0000-000000000001', 'private', 'published')
ON CONFLICT (id) DO NOTHING;

-- Alice's execution chain: request → run → artifacts
INSERT INTO execution.requests (id, requester_lenser_id, origin_type, input_snapshot)
VALUES ('74ee0000-0000-0000-0000-000000000001',
        '74bb0000-0000-0000-0000-000000000001', 'web', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO execution.runs (id, request_id, status)
VALUES ('74ee0000-0000-0000-0000-000000000001',
        '74ee0000-0000-0000-0000-000000000001', 'succeeded')
ON CONFLICT (id) DO NOTHING;

INSERT INTO execution.artifacts (id, run_id, artifact_kind, visibility)
VALUES
  ('74ff0000-0000-0000-0000-000000000001',
   '74ee0000-0000-0000-0000-000000000001', 'text', 'private'),
  ('74ff0000-0000-0000-0000-000000000002',
   '74ee0000-0000-0000-0000-000000000001', 'text', 'public')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A: lenses.lenses visibility
-- ═══════════════════════════════════════════════════════════════════════════

-- A1. anon cannot directly SELECT lenses.lenses (privilege revoked Phase BY)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM lenses.lenses$$,
  '42501',
  NULL,
  'A1: anon direct SELECT on lenses.lenses raises 42501 (privilege revoked)'
);

RESET ROLE;

-- A2. authenticated Bob sees Alice's public+published lens
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000001'),
  1,
  'A2: authenticated non-owner sees public+published lens'
);

-- A3. authenticated Bob sees Alice's community+published lens
SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000002'),
  1,
  'A3: authenticated non-owner sees community+published lens'
);

-- A4. authenticated Bob does NOT see Alice's private lens
SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000003'),
  0,
  'A4: authenticated non-owner cannot see private lens'
);

-- A5. authenticated Bob does NOT see Alice's public+draft lens
SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000004'),
  0,
  'A5: authenticated non-owner cannot see public+draft (unpublished) lens'
);

RESET ROLE;

-- A6. Alice (owner) sees own private lens
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000003'),
  1,
  'A6: owner sees own private lens via authenticated_select lenser_id clause'
);

-- A7. Alice (owner) sees own public+draft lens
SELECT is(
  (SELECT count(*)::int FROM lenses.lenses
    WHERE id = '74cc0000-0000-0000-0000-000000000004'),
  1,
  'A7: owner sees own draft (unpublished) lens via authenticated_select lenser_id clause'
);

RESET ROLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B: content.threads visibility
-- ═══════════════════════════════════════════════════════════════════════════

-- B1. anon cannot directly SELECT content.threads (privilege revoked Phase BY)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM content.threads$$,
  '42501',
  NULL,
  'B1: anon direct SELECT on content.threads raises 42501 (privilege revoked)'
);

RESET ROLE;

-- B2. authenticated Bob sees Alice's public+published thread
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM content.threads
    WHERE id = '74dd0000-0000-0000-0000-000000000001'),
  1,
  'B2: authenticated non-owner sees public+published thread'
);

-- B3. authenticated Bob sees Alice's community+published thread
SELECT is(
  (SELECT count(*)::int FROM content.threads
    WHERE id = '74dd0000-0000-0000-0000-000000000002'),
  1,
  'B3: authenticated non-owner sees community+published thread'
);

-- B4. authenticated Bob does NOT see Alice's private thread
SELECT is(
  (SELECT count(*)::int FROM content.threads
    WHERE id = '74dd0000-0000-0000-0000-000000000003'),
  0,
  'B4: authenticated non-owner cannot see private thread'
);

RESET ROLE;

-- B5. Alice (owner) sees own private thread
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM content.threads
    WHERE id = '74dd0000-0000-0000-0000-000000000003'),
  1,
  'B5: owner sees own private thread via threads_select owner clause'
);

RESET ROLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C: lensers.profiles visibility
-- ═══════════════════════════════════════════════════════════════════════════

-- C1. anon cannot directly SELECT lensers.profiles (privilege revoked Phase BY)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM lensers.profiles$$,
  '42501',
  NULL,
  'C1: anon direct SELECT on lensers.profiles raises 42501 (privilege revoked)'
);

RESET ROLE;

-- C2. authenticated Bob sees Alice's public profile
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
    WHERE id = '74bb0000-0000-0000-0000-000000000001'
      AND visibility = 'public'),
  1,
  'C2: authenticated non-owner sees public profile'
);

RESET ROLE;

-- Update Alice profile to community visibility
UPDATE lensers.profiles SET visibility = 'community'
  WHERE id = '74bb0000-0000-0000-0000-000000000001';

-- C3. authenticated Bob sees Alice's community profile
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
    WHERE id = '74bb0000-0000-0000-0000-000000000001'
      AND visibility = 'community'),
  1,
  'C3: authenticated non-owner sees community profile'
);

RESET ROLE;

-- Update Alice profile to private visibility
UPDATE lensers.profiles SET visibility = 'private'
  WHERE id = '74bb0000-0000-0000-0000-000000000001';

-- C4. authenticated Bob sees Alice's PRIVATE profile
-- FINDING: profiles_select allows any authenticated user to read private profiles.
-- Platform intent: 'private' = not discoverable via search, not fully hidden.
-- fn_search_lensers enforces private=self-only at RPC level.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
    WHERE id = '74bb0000-0000-0000-0000-000000000001'
      AND visibility = 'private'),
  1,
  'C4: authenticated non-owner CAN see private profile (by design: private=not discoverable, not hidden)'
);

RESET ROLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION D: execution.artifacts visibility
-- ═══════════════════════════════════════════════════════════════════════════

-- D1. authenticated Bob sees Alice's PUBLIC artifact
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '74aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM execution.artifacts
    WHERE id = '74ff0000-0000-0000-0000-000000000002'),
  1,
  'D1: authenticated non-owner sees public artifact (visibility=public)'
);

-- D2. authenticated Bob does NOT see Alice's PRIVATE artifact
SELECT is(
  (SELECT count(*)::int FROM execution.artifacts
    WHERE id = '74ff0000-0000-0000-0000-000000000001'),
  0,
  'D2: authenticated non-owner cannot see private artifact (visibility=private)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
