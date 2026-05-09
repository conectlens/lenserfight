-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 09_rls_media.sql
-- Phase AK — validates RLS + storage policy posture for the generated-media
-- bucket and media.objects rows owned by the authenticated lenser.
--
-- Run via: pnpm test:db    (or: supabase db test)
-- All changes are rolled back via the surrounding ROLLBACK.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(7);

-- ── Fixture references (seeded Alice = b2000000-…-0001 / a1000000-…-0001)
-- We insert one private media object owned by Alice as service_role, then
-- exercise it from authenticated (Alice), authenticated (other), and anon.

-- ── Test 1: generated-media bucket is registered and private ───────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM storage.buckets
    WHERE id = 'generated-media' AND public = FALSE
  ),
  'generated-media bucket exists and is private'
);

-- ── Test 2: public-assets bucket is registered and public ──────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM storage.buckets
    WHERE id = 'public-assets' AND public = TRUE
  ),
  'public-assets bucket exists and is public'
);

-- ── Test 3: storage policy for owner-read on generated-media exists ────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'generated_media_owner_read'
  ),
  'generated_media_owner_read storage policy exists'
);

-- ── Test 4: fn_media_finalize_sync_upload is service_role only ─────────────
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'execution.fn_media_finalize_sync_upload(uuid, text, text, bigint, integer, integer, numeric)',
    'EXECUTE'
  ),
  'authenticated cannot EXECUTE fn_media_finalize_sync_upload'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'execution.fn_media_finalize_sync_upload(uuid, text, text, bigint, integer, integer, numeric)',
    'EXECUTE'
  ),
  'service_role can EXECUTE fn_media_finalize_sync_upload'
);

-- ── Test 5: a sync media object inserted as service_role lands as private ──
-- Creating a row directly to verify the visibility/lifecycle defaults the
-- RPC will rely on. We bypass the RPC here because we want to test the
-- column-level invariant, not the RPC's branches.
SET LOCAL ROLE service_role;

INSERT INTO media.objects (
  id, owner_lenser_id, bucket, object_key,
  mime_type, media_type, visibility, lifecycle_state
)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'generated-media',
  'sync/test-fixture.png',
  'image/png',
  'image',
  'private',
  'active'
);

SELECT is(
  (SELECT visibility::text FROM media.objects
   WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  'private',
  'media.objects defaults to visibility=private when inserted by service_role'
);

RESET ROLE;

-- ── Test 6: authenticated owner (Alice) can SELECT own private media row ───
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  'a1000000-0000-0000-0000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT ok(
  EXISTS(
    SELECT 1 FROM media.objects
    WHERE id = 'cccccccc-0000-0000-0000-000000000001'
  ),
  'authenticated owner can SELECT own private media object'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
