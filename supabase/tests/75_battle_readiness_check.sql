-- =============================================================================
-- pgTAP — Phase CB: Battle readiness check
-- plan(5): function exists; returns ready=false for unknown; blockers list;
--          check_readiness is SECURITY DEFINER; auto_promote fn exists
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. fn_battles_check_readiness exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_check_readiness'
  ),
  'public.fn_battles_check_readiness() exists'
);

-- 2. fn_battles_check_readiness is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_check_readiness'
  ),
  'fn_battles_check_readiness is SECURITY DEFINER'
);

-- 3. fn_battles_check_readiness returns ready=false for unknown battle
SELECT ok(
  (
    SELECT (public.fn_battles_check_readiness(gen_random_uuid()) ->> 'ready')::boolean = false
  ),
  'fn_battles_check_readiness returns ready=false for unknown battle_id'
);

-- 4. fn_battles_check_readiness returns blockers array for unknown battle
SELECT ok(
  (
    SELECT jsonb_array_length(public.fn_battles_check_readiness(gen_random_uuid()) -> 'blockers') > 0
  ),
  'fn_battles_check_readiness includes non-empty blockers for unknown battle'
);

-- 5. fn_battles_auto_promote exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_auto_promote'
  ),
  'public.fn_battles_auto_promote() exists'
);

SELECT finish();
ROLLBACK;
