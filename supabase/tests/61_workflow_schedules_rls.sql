-- =============================================================================
-- pgTAP — Phase 61: lenses.workflow_schedules RLS / column shape
-- =============================================================================
-- Workflow schedules are owner-scoped: a lenser must only see their own
-- schedules. The dispatcher (fn_dispatch_scheduled_workflows) runs as
-- SECURITY DEFINER and bypasses RLS; the row-level surface for anon /
-- authenticated / service_role is gated to the postgres role + RPC
-- definers. No direct table grants exist for the four canonical roles.
--
-- This file pins:
--   * RLS enabled on the table
--   * NOT NULL column shape
--   * default flags
--   * no direct DML grants leak to anon / authenticated
-- =============================================================================
BEGIN;

SELECT plan(7);

-- 1. table present
SELECT has_table(
  'lenses', 'workflow_schedules',
  'lenses.workflow_schedules must exist'
);

-- 2. RLS enabled
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'lenses' AND c.relname = 'workflow_schedules'),
  'RLS must be enabled on lenses.workflow_schedules'
);

-- 3. workflow_id NOT NULL
SELECT col_not_null(
  'lenses', 'workflow_schedules', 'workflow_id',
  'workflow_id must be NOT NULL'
);

-- 4. cron_expr NOT NULL
SELECT col_not_null(
  'lenses', 'workflow_schedules', 'cron_expr',
  'cron_expr must be NOT NULL'
);

-- 5. is_active default true
SELECT col_default_is(
  'lenses'::name, 'workflow_schedules'::name, 'is_active'::name, true,
  'is_active default must be true'
);

-- 6. anon has zero DML privileges
SELECT ok(
  NOT has_table_privilege('anon', 'lenses.workflow_schedules', 'INSERT')
  AND NOT has_table_privilege('anon', 'lenses.workflow_schedules', 'UPDATE')
  AND NOT has_table_privilege('anon', 'lenses.workflow_schedules', 'DELETE'),
  'anon must NOT have any DML on workflow_schedules'
);

-- 7. authenticated also has zero DML (writes only via RPC)
SELECT ok(
  NOT has_table_privilege('authenticated', 'lenses.workflow_schedules', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'lenses.workflow_schedules', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'lenses.workflow_schedules', 'DELETE'),
  'authenticated must NOT have direct DML on workflow_schedules (RPC-only)'
);

SELECT * FROM finish();
ROLLBACK;
