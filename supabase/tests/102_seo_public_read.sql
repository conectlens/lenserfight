-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 102_seo_public_read.sql — SEO anon-safe sitemap list functions
--
--   1. all 7 fn_list_public_*/fn_list_recent_public functions exist
--   2. all 7 are SECURITY DEFINER
--   3. anon has EXECUTE on all 7
--   4. fn_list_public_rays lists a public tag
--   5. fn_list_public_rays excludes a private tag
--   6. fn_list_public_lensers lists an active public-visibility profile
--   7. fn_list_public_lensers excludes a private-visibility profile
--   8. fn_list_recent_public includes a freshly created public ray
--   9. fn_list_recent_public excludes a private ray
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(9);

-- The seven SEO list functions, referenced by name in several assertions.
CREATE TEMP TABLE _seo_fns (name text) ON COMMIT DROP;
INSERT INTO _seo_fns (name) VALUES
  ('fn_list_public_lenses'),
  ('fn_list_public_battles'),
  ('fn_list_public_lensers'),
  ('fn_list_public_workflows'),
  ('fn_list_public_threads'),
  ('fn_list_public_rays'),
  ('fn_list_recent_public');

-- 1. All seven functions exist in public.
SELECT is(
  (SELECT count(*)::int
   FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (SELECT name FROM _seo_fns)),
  7,
  'all 7 SEO list functions exist in public'
);

-- 2. All seven are SECURITY DEFINER.
SELECT is(
  (SELECT count(*)::int
   FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (SELECT name FROM _seo_fns)
     AND p.prosecdef),
  7,
  'all 7 SEO list functions are SECURITY DEFINER'
);

-- 3. anon can EXECUTE all seven.
SELECT is(
  (SELECT count(*)::int
   FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (SELECT name FROM _seo_fns)
     AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  7,
  'anon has EXECUTE on all 7 SEO list functions'
);

-- ── Fixtures: a public ray + a private ray ────────────────────────────────────
INSERT INTO content.tags (id, name, slug, visibility, created_at)
VALUES
  ('c0000000-5e0a-0000-0000-000000000001', 'SEO Public Ray',  'seo-public-ray-102',  'public'::content.tag_visibility_enum,  now()),
  ('c0000000-5e0a-0000-0000-000000000002', 'SEO Private Ray', 'seo-private-ray-102', 'private'::content.tag_visibility_enum, now())
ON CONFLICT (id) DO NOTHING;

-- 4. public ray is listed
SELECT ok(
  EXISTS (SELECT 1 FROM public.fn_list_public_rays() WHERE entity_key = 'seo-public-ray-102'),
  'fn_list_public_rays lists the public ray'
);

-- 5. private ray is excluded
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.fn_list_public_rays() WHERE entity_key = 'seo-private-ray-102'),
  'fn_list_public_rays excludes the private ray'
);

-- ── Fixtures: an active public profile + an active private profile ────────────
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-5e0a-0000-0000-000000000001', 'seo-pub@test.local'),
  ('a0000000-5e0a-0000-0000-000000000002', 'seo-priv@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type, visibility, status)
VALUES
  ('a0000000-5e0a-0000-0000-000000000001', 'a0000000-5e0a-0000-0000-000000000001',
   'seo_public_lenser_102', 'SEO Public Lenser', 'human',
   'public'::lensers.lenser_visibility, 'active'),
  ('a0000000-5e0a-0000-0000-000000000002', 'a0000000-5e0a-0000-0000-000000000002',
   'seo_private_lenser_102', 'SEO Private Lenser', 'human',
   'private'::lensers.lenser_visibility, 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. active public-visibility profile is listed
SELECT ok(
  EXISTS (SELECT 1 FROM public.fn_list_public_lensers() WHERE entity_key = 'seo_public_lenser_102'),
  'fn_list_public_lensers lists the active public profile'
);

-- 7. private-visibility profile is excluded
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.fn_list_public_lensers() WHERE entity_key = 'seo_private_lenser_102'),
  'fn_list_public_lensers excludes the private profile'
);

-- 8. recent shard includes the fresh public ray (created within the window)
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.fn_list_recent_public(now() - interval '1 hour')
    WHERE kind = 'ray' AND entity_key = 'seo-public-ray-102'
  ),
  'fn_list_recent_public includes the freshly created public ray'
);

-- 9. recent shard excludes the private ray
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.fn_list_recent_public(now() - interval '1 hour')
    WHERE entity_key = 'seo-private-ray-102'
  ),
  'fn_list_recent_public excludes the private ray'
);

SELECT finish();
ROLLBACK;
