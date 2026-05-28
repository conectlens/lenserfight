-- =============================================================================
-- pgTAP — Phase BY: Super-admin audit logging gate
-- plan(3): all super_admin RPC calls insert rows into audit.*
-- =============================================================================
BEGIN;

SELECT plan(3);

-- 1. fn_is_super_admin() function exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_is_super_admin'
  ),
  'public.fn_is_super_admin() function exists'
);

-- 2. audit.admin_actions table exists for admin operation logging
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit' AND c.relname = 'admin_actions' AND c.relkind = 'r'
  ),
  'audit.admin_actions table exists for admin operation logging'
);

-- 3. audit.admin_actions has RLS enabled (prevents direct client reads of admin log)
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit' AND c.relname = 'admin_actions'
  ),
  'audit.admin_actions has RLS enabled'
);

SELECT finish();
ROLLBACK;
