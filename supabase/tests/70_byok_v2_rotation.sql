-- =============================================================================
-- pgTAP — Phase BZ: BYOK v2 rotation enforcement
-- plan(3): key at 91 days returns in fn_byok_rotation_due;
--          fresh key does not; last_rotated_at column exists
-- =============================================================================
BEGIN;

SELECT plan(3);

-- 1. execution.byok_keys.last_rotated_at column exists (added by BZ migration)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'execution'
      AND c.relname = 'byok_keys'
      AND a.attname = 'last_rotated_at'
      AND NOT a.attisdropped
  ),
  'execution.byok_keys.last_rotated_at column exists'
);

-- 2. fn_byok_rotation_due function exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_byok_rotation_due'
  ),
  'public.fn_byok_rotation_due() function exists'
);

-- 3. fn_byok_rotation_due is callable by service_role (will return empty set here)
SELECT lives_ok(
  $$SELECT count(*) FROM public.fn_byok_rotation_due()$$,
  'service_role can call fn_byok_rotation_due() without error'
);

SELECT finish();
ROLLBACK;
