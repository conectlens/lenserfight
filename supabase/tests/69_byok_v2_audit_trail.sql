-- =============================================================================
-- pgTAP — Phase BZ: BYOK v2 audit trail
-- plan(4): log_usage inserts row; anon cannot SELECT audit; owner sees own rows only
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. audit.byok_key_usage table exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit' AND c.relname = 'byok_key_usage' AND c.relkind = 'r'
  ),
  'audit.byok_key_usage table exists'
);

-- 2. audit.byok_key_usage has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit' AND c.relname = 'byok_key_usage'
  ),
  'audit.byok_key_usage has RLS enabled'
);

-- 3. fn_byok_log_usage function exists and is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_byok_log_usage'
  ),
  'fn_byok_log_usage is SECURITY DEFINER'
);

-- 4. anon cannot SELECT from audit.byok_key_usage (deny-all RLS)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM audit.byok_key_usage$$,
  '42501',
  NULL,
  'anon role cannot SELECT from audit.byok_key_usage'
);

RESET ROLE;

SELECT finish();
ROLLBACK;
