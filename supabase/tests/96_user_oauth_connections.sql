-- =============================================================================
-- pgTAP — user_oauth_connections schema and RPC coverage
-- Migration 20280101000000 + 20280101000001.
-- =============================================================================
BEGIN;

SELECT plan(15);

-- ── Table exists ─────────────────────────────────────────────────────────────

-- 1. table exists
SELECT has_table(
  'public',
  'user_oauth_connections',
  'public.user_oauth_connections table should exist'
);

-- ── Constraints ──────────────────────────────────────────────────────────────

-- 2. unique constraint on (lenser_id, ref)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_oauth_connections'
      AND c.contype = 'u'
      AND c.conname = 'uoc_unique_ref_per_lenser'
  ),
  'uoc_unique_ref_per_lenser unique constraint should exist'
);

-- 3. provider CHECK constraint exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_oauth_connections'
      AND c.contype = 'c'
      AND c.conname = 'uoc_provider_check'
  ),
  'uoc_provider_check constraint should exist'
);

-- 4. capability CHECK constraint exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_oauth_connections'
      AND c.contype = 'c'
      AND c.conname = 'uoc_capability_check'
  ),
  'uoc_capability_check constraint should exist'
);

-- ── RPC existence ─────────────────────────────────────────────────────────────

-- 5. fn_oauth_list_connections exists
SELECT has_function(
  'public',
  'fn_oauth_list_connections',
  'public.fn_oauth_list_connections() should exist'
);

-- 6. fn_oauth_upsert_connection exists
SELECT has_function(
  'public',
  'fn_oauth_upsert_connection',
  'public.fn_oauth_upsert_connection(...) should exist'
);

-- 7. fn_oauth_revoke_connection exists
SELECT has_function(
  'public',
  'fn_oauth_revoke_connection',
  'public.fn_oauth_revoke_connection(uuid) should exist'
);

-- 8. fn_oauth_resolve_connection exists
SELECT has_function(
  'public',
  'fn_oauth_resolve_connection',
  'public.fn_oauth_resolve_connection(...) should exist'
);

-- 9. fn_oauth_get_connection_for_refresh exists
SELECT has_function(
  'public',
  'fn_oauth_get_connection_for_refresh',
  'public.fn_oauth_get_connection_for_refresh(...) should exist'
);

-- ── All five RPCs are SECURITY DEFINER ───────────────────────────────────────

-- 10. fn_oauth_list_connections is SECURITY DEFINER
SELECT ok(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_oauth_list_connections'
   LIMIT 1),
  'fn_oauth_list_connections should be SECURITY DEFINER'
);

-- 11. fn_oauth_upsert_connection is SECURITY DEFINER
SELECT ok(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_oauth_upsert_connection'
   LIMIT 1),
  'fn_oauth_upsert_connection should be SECURITY DEFINER'
);

-- 12. fn_oauth_revoke_connection is SECURITY DEFINER
SELECT ok(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_oauth_revoke_connection'
   LIMIT 1),
  'fn_oauth_revoke_connection should be SECURITY DEFINER'
);

-- 13. fn_oauth_resolve_connection is SECURITY DEFINER
SELECT ok(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_oauth_resolve_connection'
   LIMIT 1),
  'fn_oauth_resolve_connection should be SECURITY DEFINER'
);

-- 14. fn_oauth_get_connection_for_refresh is SECURITY DEFINER
SELECT ok(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_oauth_get_connection_for_refresh'
   LIMIT 1),
  'fn_oauth_get_connection_for_refresh should be SECURITY DEFINER'
);

-- ── service_role-only RPCs must NOT be granted to authenticated ──────────────

-- 15. anon cannot SELECT from user_oauth_connections
SELECT ok(
  NOT has_table_privilege('anon', 'public.user_oauth_connections', 'SELECT'),
  'anon must NOT have SELECT on public.user_oauth_connections'
);

SELECT * FROM finish();
ROLLBACK;
