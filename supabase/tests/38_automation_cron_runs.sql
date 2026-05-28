-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 38_automation_cron_runs.sql (D1 verification)
-- Verifies that automation.cron_runs has RLS enabled, no authenticated
-- SELECT/INSERT, and a service_role-only read policy.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(4);

SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'automation' AND c.relname = 'cron_runs'
  ),
  'automation.cron_runs has RLS enabled (D1)'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'automation' AND tablename = 'cron_runs'
      AND policyname = 'cron_runs_service_only'
  ),
  'cron_runs_service_only policy exists'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'automation.cron_runs', 'SELECT'),
  'authenticated does NOT have SELECT on automation.cron_runs'
);

SELECT ok(
  has_table_privilege('service_role', 'automation.cron_runs', 'SELECT'),
  'service_role HAS SELECT on automation.cron_runs'
);

SELECT * FROM finish();
ROLLBACK;
