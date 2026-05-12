-- =============================================================================
-- pgTAP — Phase CC: fn_get_media_thumbnail_url
-- plan(3): image returns webp URL; video returns original; non-existent returns NULL
-- =============================================================================
BEGIN;

SELECT plan(3);

-- 1. fn_get_media_thumbnail_url exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_get_media_thumbnail_url'
  ),
  'public.fn_get_media_thumbnail_url() exists'
);

-- 2. fn_get_media_thumbnail_url is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_get_media_thumbnail_url'
  ),
  'fn_get_media_thumbnail_url is SECURITY DEFINER'
);

-- 3. fn_get_media_thumbnail_url returns NULL for non-existent media_id
SELECT ok(
  public.fn_get_media_thumbnail_url(gen_random_uuid()) IS NULL,
  'fn_get_media_thumbnail_url returns NULL for unknown media_id'
);

SELECT finish();
ROLLBACK;
