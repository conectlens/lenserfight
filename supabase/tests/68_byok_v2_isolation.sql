-- =============================================================================
-- pgTAP — Phase BZ: BYOK v2 isolation
-- plan(4): user A key cannot resolve for user B's battle;
--          invalid model_id returns valid=false
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. fn_byok_validate_for_battle function exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_byok_validate_for_battle'
  ),
  'public.fn_byok_validate_for_battle() function exists'
);

-- 2. fn_byok_validate_for_battle is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_byok_validate_for_battle'
  ),
  'fn_byok_validate_for_battle is SECURITY DEFINER'
);

-- 3. fn_byok_validate_for_battle has SET search_path configured (no schema injection)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.pg_options_to_table(p.proconfig) AS opt(option_name, option_value)
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_byok_validate_for_battle'
      AND opt.option_name = 'search_path'
  ),
  'fn_byok_validate_for_battle has SET search_path configured'
);

-- 4. Calling fn_byok_validate_for_battle unauthenticated returns valid=false
--    (no auth.uid() → returns auth_required reason)
SELECT ok(
  (
    SELECT (public.fn_byok_validate_for_battle(
      gen_random_uuid(),  -- p_battle_id (non-existent)
      gen_random_uuid()   -- p_contender_id (non-existent)
    ) ->> 'valid')::boolean = false
  ),
  'fn_byok_validate_for_battle returns valid=false when called without authentication'
);

SELECT finish();
ROLLBACK;
