-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 103_workflow_schedule_cron_validation.sql
-- Locks the CRON field-count contract of public.fn_upsert_workflow_schedule.
--
-- The dispatcher (lenses.fn_cron_matches_now) matches at minute granularity, so
-- sub-minute (6-field / "seconds") CRON expressions cannot be honored. The RPC
-- enforces this by splitting the trimmed expression on whitespace and rejecting
-- anything that is not exactly 5 fields (SQLSTATE 22023). This regression test
-- pins both the reject path and the accept path so the guard cannot silently
-- regress:
--
--   1. A 6-field expression ('*/30 * * * * *') raises 22023 "Invalid CRON…".
--   2. A valid 5-field expression ('*/5 * * * *') passes the CRON-format check
--      and does not raise (is_active=false to isolate the format check from the
--      cycle-detection / approval-bypass branches).
--
-- Auth mirrors 34_automation_authz.sql: the call is made as the seeded owner
-- (@lenserfight, auth sub a1…0001 → lenser b2…0001) so the ownership gate is
-- satisfied and execution reaches the CRON validation.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(2);

-- ── Auth context: authenticate as the seeded owner (Alice / @lenserfight) ────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub','a1000000-0000-0000-0000-000000000001',
                    'role','authenticated')::text, true);

-- ── Test 1: 6-field (sub-minute) expression is rejected with SQLSTATE 22023 ──
SELECT throws_ok(
  $$
  SELECT public.fn_upsert_workflow_schedule(
    p_workflow_id := (
      SELECT id FROM lenses.workflows
      WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1
    ),
    p_schedule_id := NULL,
    p_cron_expr   := '*/30 * * * * *',
    p_is_active   := false
  )
  $$,
  '22023',
  NULL,
  'fn_upsert_workflow_schedule rejects a 6-field (sub-minute) CRON expression (22023)'
);

-- ── Test 2: valid 5-field expression passes the CRON-format check ────────────
SELECT lives_ok(
  $$
  SELECT public.fn_upsert_workflow_schedule(
    p_workflow_id := (
      SELECT id FROM lenses.workflows
      WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1
    ),
    p_schedule_id := NULL,
    p_cron_expr   := '*/5 * * * *',
    p_is_active   := false
  )
  $$,
  'fn_upsert_workflow_schedule accepts a valid 5-field CRON expression'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
