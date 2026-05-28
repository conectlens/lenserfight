-- =============================================================================
-- pgTAP — Phase CA: audit.vote_anomalies RLS
-- plan(4): RLS enabled; own-row policy exists; admin policy exists; resolve fn exists
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. RLS is enabled on audit.vote_anomalies
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit'
      AND c.relname = 'vote_anomalies'
  ),
  'RLS is enabled on audit.vote_anomalies'
);

-- 2. own-voter SELECT policy exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c   ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit'
      AND c.relname = 'vote_anomalies'
      AND pol.polname = 'vote_anomalies_own_select'
  ),
  'vote_anomalies_own_select policy exists'
);

-- 3. admin SELECT policy exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c   ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit'
      AND c.relname = 'vote_anomalies'
      AND pol.polname = 'vote_anomalies_admin_select'
  ),
  'vote_anomalies_admin_select policy exists'
);

-- 4. fn_resolve_vote_anomaly exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_resolve_vote_anomaly'
  ),
  'public.fn_resolve_vote_anomaly() exists'
);

SELECT finish();
ROLLBACK;
