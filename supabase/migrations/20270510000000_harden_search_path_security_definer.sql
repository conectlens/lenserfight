-- Phase Z1: Harden SECURITY DEFINER functions against search_path hijack.
-- Critical findings from supabase-security-auditor:
--   * public.fn_submit_vote               (schema.sql ~24227)
--   * battles.fn_check_vote_rate_limit    (schema.sql ~4649)
-- Mechanism: ALTER FUNCTION ... SET search_path = '' forces every reference
-- inside the function body to be schema-qualified. This blocks the attack
-- where a low-privilege role plants a same-named object earlier in the
-- search_path and the SECURITY DEFINER function transparently uses it.
--
-- This migration is idempotent: it skips functions that don't exist and
-- never overwrites bodies. It only sets the search_path GUC on the function.
-- Rollback: ALTER FUNCTION ... RESET search_path;

DO $$
DECLARE
  fn record;
  -- Functions known to need hardening from the audit. Extend as needed.
  targets text[] := ARRAY[
    'public.fn_submit_vote',
    'battles.fn_check_vote_rate_limit'
  ];
  qualname text;
BEGIN
  FOREACH qualname IN ARRAY targets LOOP
    FOR fn IN
      SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname || '.' || p.proname = qualname
        AND p.prosecdef = true
    LOOP
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = '''';',
        fn.nspname, fn.proname, fn.args
      );
      RAISE NOTICE 'Hardened search_path on %.%(%)', fn.nspname, fn.proname, fn.args;
    END LOOP;
  END LOOP;
END $$;

-- Sweep: warn (do not modify) any other SECURITY DEFINER function in
-- non-system schemas that lacks an explicit search_path setting.
DO $$
DECLARE
  fn record;
  cnt int := 0;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname NOT IN ('pg_catalog','information_schema','pgsodium','vault','extensions','graphql','graphql_public','realtime','storage','supabase_functions','net')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    cnt := cnt + 1;
    RAISE WARNING 'SECURITY DEFINER without search_path: %.%(%) — review for hijack risk', fn.nspname, fn.proname, fn.args;
  END LOOP;
  IF cnt > 0 THEN
    RAISE NOTICE '% SECURITY DEFINER function(s) still lack an explicit search_path. Triage in a follow-up migration.', cnt;
  END IF;
END $$;
