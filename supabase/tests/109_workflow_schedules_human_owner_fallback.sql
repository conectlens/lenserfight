-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 109_workflow_schedules_human_owner_fallback.sql (issue #480)
--
--   1. fn_upsert_workflow_schedule + fn_get_workflow_schedules round-trip
--      while acting inside the workflow owner's own agent workspace
--      (active_lenser_id = agent's profile_id) — previously
--      fn_get_workflow_schedules returned [] here because it only checked
--      the active session lenser, not the resolved human owner.
--   2. The direct human owner (no workspace switch) still sees the same
--      schedule — the human-owner fallback doesn't regress the existing
--      direct-ownership path.
--   3. A non-owner caller still sees no schedules for this workflow
--      (security boundary preserved).
--
-- Uses the 08_lenser_family seed fixture: Alice (b2...0001, auth a1...0001)
-- owns AI lenser LENSO (profile_id d4...0001) and already owns a seeded
-- workflow (per 103_workflow_schedule_cron_validation.sql).
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(3);

-- ─── Fixture setup ──────────────────────────────────────────────────────────
UPDATE lensers.profiles SET status = 'active' WHERE id = 'b2000000-0000-0000-0000-000000000001'::uuid;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

-- Switch Alice's active workspace to her agent (LENSO's profile id) before
-- creating the schedule, so both the write and the read below happen from
-- inside the agent workspace.
INSERT INTO lensers.preferences (lenser_id, active_lenser_id)
VALUES ('b2000000-0000-0000-0000-000000000001'::uuid, 'd4000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (lenser_id) DO UPDATE SET active_lenser_id = EXCLUDED.active_lenser_id;

SELECT public.fn_upsert_workflow_schedule(
  p_workflow_id := (
    SELECT id FROM lenses.workflows
    WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1
  ),
  p_schedule_id := NULL,
  p_cron_expr   := '0 8 * * MON',
  p_is_active   := false
);

-- ── Test 1: read succeeds while still acting inside the agent workspace ────
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.fn_get_workflow_schedules(
      (SELECT id FROM lenses.workflows WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1)
    ) s
    WHERE s.cron_expr = '0 8 * * MON'
  ),
  'fn_get_workflow_schedules sees a schedule just created while acting as the agent'
);

-- ── Test 2: direct human owner (no workspace switch) still sees it ─────────
UPDATE lensers.preferences SET active_lenser_id = NULL WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid;

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.fn_get_workflow_schedules(
      (SELECT id FROM lenses.workflows WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1)
    ) s
    WHERE s.cron_expr = '0 8 * * MON'
  ),
  'fn_get_workflow_schedules: direct human owner (no workspace switch) still sees the schedule'
);

-- ── Test 3: non-owner still sees no schedules for this workflow ────────────
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT is(
  (SELECT count(*)::int FROM public.fn_get_workflow_schedules(
    (SELECT id FROM lenses.workflows WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1)
  )),
  0,
  'fn_get_workflow_schedules: non-owner caller sees no schedules for this workflow'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
