-- =============================================================================
-- pgTAP — Phase BY/BZ: Auth negative tests
-- Owner spoofing, cross-user isolation, and unauthenticated mutation prevention
--
-- Tests:
--   OWNER SPOOFING (4):
--     N1. authenticated cannot INSERT lenses.lenses with another user's lenser_id
--     N2. authenticated cannot INSERT content.threads with another user's lenser_id
--     N3. authenticated cannot INSERT battles.battles with spoofed creator_lenser_id
--     N4. authenticated cannot INSERT lensers.profiles with another user's user_id
--
--   CROSS-USER UPDATE/DELETE ISOLATION (8):
--     N5.  authenticated Bob cannot UPDATE Alice's lens
--     N6.  authenticated Bob cannot DELETE Alice's lens
--     N7.  authenticated Bob cannot UPDATE Alice's thread
--     N8.  authenticated Bob cannot DELETE Alice's thread
--     N9.  authenticated Bob cannot UPDATE Alice's battle (draft)
--     N10. authenticated Bob cannot DELETE a reaction owned by Alice
--     N11. lensers_deny_delete policy: nobody can DELETE a lenser profile
--     N12. authenticated Bob cannot UPDATE Alice's profile
--
--   ANON WRITE PREVENTION (4):
--     N13. anon cannot INSERT into battles.battles
--     N14. anon cannot INSERT into lenses.lenses (grant revoked)
--     N15. anon cannot INSERT into lensers.profiles
--     N16. anon cannot INSERT into content.threads (grant revoked)
-- =============================================================================
BEGIN;

SELECT plan(16);

-- ─── Fixtures ───────────────────────────────────────────────────────────────

-- Alice (owner)
INSERT INTO auth.users (id, email)
VALUES ('75aa0000-0000-0000-0000-000000000001', 'alice-75@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('75bb0000-0000-0000-0000-000000000001',
        '75aa0000-0000-0000-0000-000000000001',
        'alice75', 'Alice 75', 'human')
ON CONFLICT (id) DO NOTHING;

-- Bob (attacker)
INSERT INTO auth.users (id, email)
VALUES ('75aa0000-0000-0000-0000-000000000002', 'bob-75@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('75bb0000-0000-0000-0000-000000000002',
        '75aa0000-0000-0000-0000-000000000002',
        'bob75', 'Bob 75', 'human')
ON CONFLICT (id) DO NOTHING;

-- Alice's pre-existing lens, thread, battle (for update/delete tests)
INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
VALUES ('75cc0000-0000-0000-0000-000000000001',
        '75bb0000-0000-0000-0000-000000000001', 'public', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO content.threads (id, lenser_id, visibility, status)
VALUES ('75dd0000-0000-0000-0000-000000000001',
        '75bb0000-0000-0000-0000-000000000001', 'public', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES (
  '75ee0000-0000-0000-0000-000000000001',
  '75bb0000-0000-0000-0000-000000000001',
  'Alice75 Battle', 'alice75-battle', 'task', 'draft', 2
) ON CONFLICT (id) DO NOTHING;

-- Alice's reaction on her own thread (for cross-user delete isolation test)
-- Must reference a thread visible via reactions INSERT policy (no trigger restriction)
INSERT INTO content.reactions (lenser_id, entity_type, entity_id, reaction)
VALUES ('75bb0000-0000-0000-0000-000000000001', 'thread',
        '75dd0000-0000-0000-0000-000000000001', 'like')
ON CONFLICT (entity_type, entity_id, lenser_id, reaction) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION N: Owner Spoofing
-- ═══════════════════════════════════════════════════════════════════════════

-- N1. Bob cannot INSERT a lens claiming Alice's lenser_id
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT throws_ok(
  $$INSERT INTO lenses.lenses (lenser_id, visibility, status)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'public', 'published')$$,
  '42501',
  NULL,
  'N1: authenticated cannot INSERT lenses.lenses with a spoofed (other-owner) lenser_id'
);

-- N2. Bob cannot INSERT a thread claiming Alice's lenser_id
SELECT throws_ok(
  $$INSERT INTO content.threads (lenser_id, visibility, status)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'public', 'published')$$,
  '42501',
  NULL,
  'N2: authenticated cannot INSERT content.threads with a spoofed (other-owner) lenser_id'
);

-- N3. Bob cannot INSERT a battle claiming Alice's creator_lenser_id
SELECT throws_ok(
  $$INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, status, max_contenders)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'Spoofed', 'spoofed-75', 'task', 'draft', 2)$$,
  '42501',
  NULL,
  'N3: authenticated cannot INSERT battles.battles with a spoofed creator_lenser_id'
);

RESET ROLE;

-- N4. Bob cannot INSERT a lenser profile with Alice's user_id
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT throws_ok(
  $$INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
    VALUES (gen_random_uuid(), '75aa0000-0000-0000-0000-000000000001', 'spoofed75', 'Spoofed', 'human')$$,
  '42501',
  NULL,
  'N4: authenticated cannot INSERT lensers.profiles with another user''s user_id'
);

RESET ROLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION N: Cross-User Update/Delete Isolation
-- ═══════════════════════════════════════════════════════════════════════════

-- N5. Bob cannot UPDATE Alice's lens (RLS silently returns 0 updated rows)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

-- Execute the UPDATE and then verify Alice's lens is unchanged
DO $$
BEGIN
  UPDATE lenses.lenses SET visibility = 'private'
    WHERE id = '75cc0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT visibility::text FROM lenses.lenses
    WHERE id = '75cc0000-0000-0000-0000-000000000001'),
  'public',
  'N5: Bob''s UPDATE on Alice''s lens is silently ignored (RLS blocks it)'
);

-- N6. Bob cannot DELETE Alice's lens (RLS silently returns 0 deleted rows)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  DELETE FROM lenses.lenses WHERE id = '75cc0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM lenses.lenses WHERE id = '75cc0000-0000-0000-0000-000000000001'),
  1,
  'N6: Bob''s DELETE on Alice''s lens is silently ignored (lens still exists)'
);

-- N7. Bob cannot UPDATE Alice's thread
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  UPDATE content.threads SET visibility = 'private'
    WHERE id = '75dd0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT visibility::text FROM content.threads WHERE id = '75dd0000-0000-0000-0000-000000000001'),
  'public',
  'N7: Bob''s UPDATE on Alice''s thread is silently ignored'
);

-- N8. Bob cannot DELETE Alice's thread
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  DELETE FROM content.threads WHERE id = '75dd0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM content.threads WHERE id = '75dd0000-0000-0000-0000-000000000001'),
  1,
  'N8: Bob''s DELETE on Alice''s thread is silently ignored (thread still exists)'
);

-- N9. Bob cannot UPDATE Alice's draft battle (owner + status=draft required)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  UPDATE battles.battles SET title = 'Hijacked'
    WHERE id = '75ee0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT title FROM battles.battles WHERE id = '75ee0000-0000-0000-0000-000000000001'),
  'Alice75 Battle',
  'N9: Bob''s UPDATE on Alice''s draft battle is silently ignored'
);

-- N10. Bob cannot DELETE Alice's reaction
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  DELETE FROM content.reactions
    WHERE lenser_id = '75bb0000-0000-0000-0000-000000000001'
      AND entity_type = 'thread'
      AND entity_id   = '75dd0000-0000-0000-0000-000000000001'
      AND reaction    = 'like';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM content.reactions
    WHERE lenser_id = '75bb0000-0000-0000-0000-000000000001'
      AND entity_type = 'thread'
      AND entity_id   = '75dd0000-0000-0000-0000-000000000001'
      AND reaction    = 'like'),
  1,
  'N10: Bob''s DELETE on Alice''s reaction is silently ignored'
);

-- N11. lensers_deny_delete: nobody (not even owner) can DELETE a lenser profile.
-- The USING(false) policy silently returns 0 rows rather than raising 42501;
-- we verify the profile still exists after the attempted DELETE.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  DELETE FROM lensers.profiles WHERE id = '75bb0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM lensers.profiles WHERE id = '75bb0000-0000-0000-0000-000000000001'),
  1,
  'N11: lensers_deny_delete (USING false) silently blocks DELETE — profile still exists'
);

-- N12. Bob cannot UPDATE Alice's profile (profiles_owner_update requires user_id=auth.uid())
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '75aa0000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

DO $$
BEGIN
  UPDATE lensers.profiles SET display_name = 'Hacked'
    WHERE id = '75bb0000-0000-0000-0000-000000000001';
END;
$$;

RESET ROLE;

SELECT is(
  (SELECT display_name FROM lensers.profiles WHERE id = '75bb0000-0000-0000-0000-000000000001'),
  'Alice 75',
  'N12: Bob''s UPDATE on Alice''s profile is silently ignored'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION N: Anon Write Prevention
-- ═══════════════════════════════════════════════════════════════════════════

-- N13. anon cannot INSERT into battles.battles (explicit REVOKE)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, status, max_contenders)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'Anon Battle', 'anon75', 'task', 'draft', 2)$$,
  '42501',
  NULL,
  'N13: anon cannot INSERT into battles.battles'
);

-- N14. anon cannot INSERT into lenses.lenses (grant revoked Phase BY)
SELECT throws_ok(
  $$INSERT INTO lenses.lenses (lenser_id, visibility, status)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'public', 'published')$$,
  '42501',
  NULL,
  'N14: anon cannot INSERT into lenses.lenses (privilege revoked)'
);

-- N15. anon cannot INSERT into lensers.profiles (explicit REVOKE)
SELECT throws_ok(
  $$INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
    VALUES (gen_random_uuid(), '75aa0000-0000-0000-0000-000000000001', 'anonprofile', 'Anon', 'human')$$,
  '42501',
  NULL,
  'N15: anon cannot INSERT into lensers.profiles'
);

-- N16. anon cannot INSERT into content.threads (grant revoked Phase BY)
SELECT throws_ok(
  $$INSERT INTO content.threads (lenser_id, visibility, status)
    VALUES ('75bb0000-0000-0000-0000-000000000001', 'public', 'published')$$,
  '42501',
  NULL,
  'N16: anon cannot INSERT into content.threads (privilege revoked)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
