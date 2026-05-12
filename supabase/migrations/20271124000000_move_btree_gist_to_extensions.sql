-- =============================================================================
-- Move btree_gist out of the public schema
-- =============================================================================
-- Resolves Supabase linter warning 0014 extension_in_public.
--
-- btree_gist was installed in `public` by the original community schema
-- (20260329120000_community_base_schema.sql) and is consumed by exactly one
-- object: the exclusion constraint `excl_no_overlapping_active_seasons` on
-- `xp.seasons`, which uses `gist (app_id WITH =, tstzrange(...) WITH &&)`.
-- The `app_id WITH =` clause needs the operator class that btree_gist provides
-- for `uuid`.
--
-- `ALTER EXTENSION ... SET SCHEMA` rewrites every dependent object's catalog
-- reference in place, so the exclusion constraint and its supporting index
-- keep working without a rebuild. The Supabase `extensions` schema is the
-- conventional home for relocated extensions and is already on the API
-- `extra_search_path`, so unqualified operator lookups continue to resolve.
--
-- Rollback (manual, if ever needed):
--   ALTER EXTENSION btree_gist SET SCHEMA public;
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'btree_gist'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION btree_gist SET SCHEMA extensions';
  END IF;
END $$;
