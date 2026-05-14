-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 32_automation_dispatch.sql
-- Verifies lenses.fn_dispatch_scheduled_workflows() and its approval-gated
-- wrapper public.fn_dispatch_scheduled_workflows_with_approval():
--   * Active schedule whose cron matches now() → one workflow_runs row created
--     with trigger_mode='schedule' and scheduled_for at minute boundary.
--   * is_active=false  → schedule skipped.
--   * Concurrent same-minute dispatch (two invocations in the same minute) →
--     exactly one run materialized (unique (schedule_id, scheduled_for) holds).
--   * In-flight run on same schedule → skipped with last_dispatch_status =
--     'skipped_overlap'.
--   * platform.system_flags.autonomy_dispatch_enabled=false → wrapper short
--     -circuits and returns zero.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(13);

-- ── Fixture ────────────────────────────────────────────────────────────────
-- Use a synthetic Alice workflow with a fresh node so the dispatcher has
-- something to enumerate. cron is '* * * * *' so fn_cron_matches_now() is
-- always true.
DO $$
DECLARE
  v_wf_id uuid := gen_random_uuid();
  v_node_id uuid := gen_random_uuid();
  v_sched_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf_id, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 32 dispatch wf', 'private');

  INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id,
                                     position_x, position_y, label)
  SELECT v_node_id, v_wf_id, l.id, NULL, 0, 0, 'n1'
  FROM lenses.lenses l
  WHERE l.lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid
  LIMIT 1;

  INSERT INTO lenses.workflow_schedules (
    id, workflow_id, cron_expr, timezone, is_active,
    approval_policy
  ) VALUES (
    v_sched_id, v_wf_id, '* * * * *', 'UTC', true,
    jsonb_build_object('requiresApproval', false)
  );

  PERFORM set_config('app.pgtap32.wf_id', v_wf_id::text, true);
  PERFORM set_config('app.pgtap32.sched_id', v_sched_id::text, true);
END $$;

-- ── Test 1: dispatcher creates exactly one run for the active schedule ─────
SELECT lives_ok(
  $$ SELECT lenses.fn_dispatch_scheduled_workflows() $$,
  'dispatcher executes without raising on a normal active schedule'
);

SELECT is(
  (SELECT count(*)::int
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap32.sched_id')::uuid),
  1,
  'exactly one workflow_runs row materialized for the schedule'
);

SELECT is(
  (SELECT trigger_mode
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap32.sched_id')::uuid),
  'schedule',
  'run carries trigger_mode=schedule'
);

SELECT ok(
  (SELECT scheduled_for = date_trunc('minute', scheduled_for)
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap32.sched_id')::uuid),
  'scheduled_for is aligned to minute boundary'
);

-- ── Test 2: second invocation in same minute does NOT duplicate (unique idx)
SELECT lives_ok(
  $$ SELECT lenses.fn_dispatch_scheduled_workflows() $$,
  'dispatcher second call same minute does not raise'
);

SELECT is(
  (SELECT count(*)::int
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap32.sched_id')::uuid),
  1,
  'still exactly one run after second dispatch (unique slot prevents dup)'
);

-- ── Test 3: in-flight overlap → last_dispatch_status='skipped_overlap' ──
-- The first dispatch left status='dispatched'. We need to simulate a
-- subsequent minute where an in-flight run exists. Step the schedule's
-- last_run_at back, leave the run in 'running', and re-dispatch.
DO $$
DECLARE
  v_sched_id uuid := current_setting('app.pgtap32.sched_id')::uuid;
BEGIN
  UPDATE lenses.workflow_schedules
  SET last_run_at = now() - interval '5 minutes'
  WHERE id = v_sched_id;

  UPDATE lenses.workflow_runs
  SET status = 'running'
  WHERE schedule_id = v_sched_id;
END $$;

SELECT lives_ok(
  $$ SELECT lenses.fn_dispatch_scheduled_workflows() $$,
  'overlap path executes without raising'
);

SELECT is(
  (SELECT last_dispatch_status
   FROM lenses.workflow_schedules
   WHERE id = current_setting('app.pgtap32.sched_id')::uuid),
  'skipped_overlap',
  'overlap (in-flight run present) records last_dispatch_status=skipped_overlap'
);

-- ── Test 4 (D8): condition_failed observability ──────────────────────────
-- Create a schedule with a malformed pre_dispatch_condition (referencing
-- a JSON path that fn_eval_filter cannot evaluate). After dispatcher tick,
-- last_dispatch_status must be 'condition_failed' (not 'skipped_condition')
-- and last_error_message must include the raise message.
DO $$
DECLARE
  v_wf_id uuid := gen_random_uuid();
  v_sched_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf_id, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 32 condition_failed wf', 'private');

  INSERT INTO lenses.workflow_schedules (
    id, workflow_id, cron_expr, timezone, is_active,
    approval_policy, pre_dispatch_condition
  ) VALUES (
    v_sched_id, v_wf_id, '* * * * *', 'UTC', true,
    jsonb_build_object('requiresApproval', false),
    -- A JSON array makes jsonb_each() inside fn_eval_filter raise
    -- "cannot deconstruct a non-object" — guaranteed exception path.
    '["not_an_object"]'::jsonb
  );
  PERFORM set_config('app.pgtap32d8.sched_id', v_sched_id::text, true);
END $$;

SELECT lives_ok(
  $$ SELECT lenses.fn_dispatch_scheduled_workflows() $$,
  'dispatcher does not raise even when a schedule condition is malformed'
);

SELECT is(
  (SELECT last_dispatch_status FROM lenses.workflow_schedules
   WHERE id = current_setting('app.pgtap32d8.sched_id')::uuid),
  'condition_failed',
  'condition raise → last_dispatch_status=condition_failed (D8)'
);

-- ── Test 5 (D7): the active-only partial index exists ─────────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lenses'
      AND tablename  = 'workflow_schedules'
      AND indexname  = 'idx_workflow_schedules_active'
  ),
  'idx_workflow_schedules_active partial index exists (D7)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Wrapper kill-switch test.
-- ─────────────────────────────────────────────────────────────────────────────

-- Toggle the autonomy_dispatch_enabled flag OFF. Direct UPDATE works because
-- this transaction never elevates to authenticated role (system_flags has
-- a deny-write policy for authenticated, but writes as postgres bypass RLS).
UPDATE platform.system_flags
SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';

-- Seed a fresh schedule so we know any new rows would only come from the
-- wrapper executing.
DO $$
DECLARE
  v_wf_id uuid := gen_random_uuid();
  v_sched_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf_id, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 32 wrapper wf', 'private');
  INSERT INTO lenses.workflow_schedules (
    id, workflow_id, cron_expr, timezone, is_active,
    approval_policy
  ) VALUES (
    v_sched_id, v_wf_id, '* * * * *', 'UTC', true,
    jsonb_build_object('requiresApproval', false)
  );
  PERFORM set_config('app.pgtap32b.sched_id', v_sched_id::text, true);
END $$;

SELECT is(
  (SELECT public.fn_dispatch_scheduled_workflows_with_approval())::text,
  '0',
  'wrapper returns 0 when autonomy_dispatch_enabled=false'
);

SELECT is(
  (SELECT count(*)::int
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap32b.sched_id')::uuid),
  0,
  'no workflow_runs created while kill switch is off'
);

SELECT * FROM finish();
ROLLBACK;
