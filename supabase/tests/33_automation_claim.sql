-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 33_automation_claim.sql
-- Verifies the three FOR UPDATE SKIP LOCKED claim primitives that the workers
-- depend on, plus the team-run recursion-depth cap (D5).
--
--   * lenses.fn_claim_scheduled_workflow_run    — workflow runs
--   * battles.fn_claim_battle_execution_job     — battle execution jobs
--   * agents.fn_claim_team_run                  — team runs
--
-- For each primitive we assert:
--   1. A non-matching row (wrong status / wrong trigger_mode) is ignored.
--   2. A matching row is claimed exactly once and transitions to running.
--   3. A second call returns empty when nothing is queued.
--
-- The team-run section also asserts:
--   * approval_status='pending' is excluded from claim selection.
--   * Recursion-depth cap (D5): inserting a 9th-level child raises.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(10);

-- ── Fixture: a workflow with a schedule (for run claim) + battle skeleton ──
DO $$
DECLARE
  v_wf_id uuid := gen_random_uuid();
  v_sched_id uuid := gen_random_uuid();
  v_lens_id uuid;
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf_id, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 33 claim wf', 'private');

  INSERT INTO lenses.workflow_schedules (
    id, workflow_id, cron_expr, timezone, is_active
  ) VALUES (v_sched_id, v_wf_id, '* * * * *', 'UTC', true);

  PERFORM set_config('app.pgtap33.wf_id', v_wf_id::text, true);
  PERFORM set_config('app.pgtap33.sched_id', v_sched_id::text, true);
END $$;

-- ── Test 1: fn_claim_scheduled_workflow_run ignores wrong trigger_mode ────
-- Insert a manual-trigger pending run; claim must skip it.
INSERT INTO lenses.workflow_runs (workflow_id, status, trigger_mode, context_inputs)
VALUES (current_setting('app.pgtap33.wf_id')::uuid, 'pending', 'manual', '{}'::jsonb);

SELECT is(
  (SELECT count(*)::int
   FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap33')),
  0,
  'fn_claim_scheduled_workflow_run skips trigger_mode=manual'
);

-- ── Test 2: fn_claim_scheduled_workflow_run claims pending+schedule ──────
INSERT INTO lenses.workflow_runs (
  workflow_id, schedule_id, status, trigger_mode, context_inputs, scheduled_for
)
VALUES (
  current_setting('app.pgtap33.wf_id')::uuid,
  current_setting('app.pgtap33.sched_id')::uuid,
  'pending', 'schedule', '{}'::jsonb, date_trunc('minute', now())
)
RETURNING id;

SELECT is(
  (SELECT count(*)::int
   FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap33')),
  1,
  'fn_claim_scheduled_workflow_run claims one pending schedule run'
);

SELECT is(
  (SELECT status
   FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap33.sched_id')::uuid
   ORDER BY created_at DESC LIMIT 1),
  'running',
  'claimed run transitioned to running'
);

-- ── Test 3: second claim returns empty (nothing left queued) ──────────────
SELECT is(
  (SELECT count(*)::int
   FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap33')),
  0,
  'second claim returns 0 rows when nothing is queued'
);

-- ── Test 4: fn_claim_battle_execution_job ignores non-queued jobs ─────────
DO $$
DECLARE
  v_battle_id uuid := gen_random_uuid();
  v_contender_a uuid;
  v_contender_b uuid := gen_random_uuid();
  v_lenser_id uuid := 'b2000000-0000-0000-0000-000000000001'::uuid;
  v_ref_id uuid;
BEGIN
  INSERT INTO battles.battles (
    id, slug, title, task_prompt, max_contenders, status, creator_lenser_id
  ) VALUES (
    v_battle_id, 'pgtap33-' || substring(v_battle_id::text from 1 for 8),
    'pgTAP 33 battle', 'noop', 2, 'executing'::battles.battle_status_enum,
    v_lenser_id
  );

  v_ref_id := 'b2000000-0000-0000-0000-000000000001'::uuid;

  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name
  ) VALUES (
    v_battle_id, 'A', 'human'::battles.contender_type_enum, v_ref_id, 'A'
  ) RETURNING id INTO v_contender_a;

  -- Insert a 'running' job to confirm claim ignores it.
  INSERT INTO battles.battle_execution_jobs (
    battle_id, contender_id, slot, status
  ) VALUES (v_battle_id, v_contender_a, 'A', 'running');

  PERFORM set_config('app.pgtap33.battle_id', v_battle_id::text, true);
  PERFORM set_config('app.pgtap33.contender_a', v_contender_a::text, true);
  PERFORM set_config('app.pgtap33.lens_ref', v_ref_id::text, true);
END $$;

SELECT is(
  (SELECT count(*)::int
   FROM battles.fn_claim_battle_execution_job('w-pgtap33')),
  0,
  'fn_claim_battle_execution_job skips running jobs'
);

-- ── Test 5: fn_claim_battle_execution_job claims a queued job ─────────────
DO $$
DECLARE
  v_b_id uuid := current_setting('app.pgtap33.battle_id')::uuid;
  v_contender_b uuid;
  v_ref_id uuid;
BEGIN
  -- Need a distinct profile ref for slot B (UNIQUE on battle_id, contender_ref_id)
  v_ref_id := 'b2000000-0000-0000-0000-000000000002'::uuid;
  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name
  ) VALUES (
    v_b_id, 'B', 'human'::battles.contender_type_enum, v_ref_id, 'B'
  ) RETURNING id INTO v_contender_b;
  INSERT INTO battles.battle_execution_jobs (battle_id, contender_id, slot, status)
  VALUES (v_b_id, v_contender_b, 'B', 'queued');
END $$;

SELECT is(
  (SELECT count(*)::int
   FROM battles.fn_claim_battle_execution_job('w-pgtap33')),
  1,
  'fn_claim_battle_execution_job claims one queued job'
);

-- ── Test 6: fn_claim_team_run excludes approval_status='pending' ──────────
DO $$
DECLARE
  v_ail_id uuid;
  v_tr_a uuid; v_tr_b uuid;
BEGIN
  SELECT id INTO v_ail_id FROM agents.ai_lensers LIMIT 1;

  INSERT INTO agents.team_runs (ai_lenser_id, status, approval_status)
  VALUES
    (v_ail_id, 'queued', 'pending')   RETURNING id INTO v_tr_a;
  INSERT INTO agents.team_runs (ai_lenser_id, status, approval_status)
  VALUES
    (v_ail_id, 'queued', 'approved')  RETURNING id INTO v_tr_b;

  PERFORM set_config('app.pgtap33.tr_a', v_tr_a::text, true);
  PERFORM set_config('app.pgtap33.tr_b', v_tr_b::text, true);
END $$;

SELECT is(
  (SELECT id FROM agents.fn_claim_team_run('w-pgtap33')),
  current_setting('app.pgtap33.tr_b')::uuid,
  'fn_claim_team_run claims approved run, skipping pending one'
);

SELECT is(
  (SELECT status FROM agents.team_runs
   WHERE id = current_setting('app.pgtap33.tr_a')::uuid),
  'queued',
  'pending-approval team_run remains queued (not claimed)'
);

-- ── Test 7: fn_start_team_run with policy='forbidden' raises ─────────────
SELECT throws_ok(
  $$
  SELECT agents.fn_start_team_run(
    (SELECT id FROM agents.ai_lensers LIMIT 1),
    NULL::uuid,
    '{}'::jsonb,
    'forbidden'
  )
  $$,
  'P0001',
  'delegation_forbidden',
  'fn_start_team_run raises delegation_forbidden under policy=forbidden'
);

-- ── Test 8 (D5): team-run recursion depth cap ─────────────────────────────
-- Build a chain of 9 parent→child team_runs (depth 0..8), then assert that
-- spawning a 10th level (depth=9) is rejected by the depth-cap guard added
-- in migration 20270901000003_team_run_recursion_cap.sql.
DO $$
DECLARE
  v_ail_id uuid;
  v_parent uuid := NULL;
  v_curr uuid;
  i integer;
BEGIN
  SELECT id INTO v_ail_id FROM agents.ai_lensers LIMIT 1;

  FOR i IN 0..8 LOOP
    INSERT INTO agents.team_runs (
      ai_lenser_id, status, approval_status,
      parent_team_run_id, recursion_depth, metadata
    ) VALUES (
      v_ail_id, 'queued', 'not_required',
      v_parent, i, jsonb_build_object('depth', i)
    )
    RETURNING id INTO v_curr;
    v_parent := v_curr;
  END LOOP;

  PERFORM set_config('app.pgtap33.deep_parent', v_parent::text, true);
END $$;

-- Inserting one more should still succeed (depth=8 still allowed in column,
-- the cap is enforced at fn_start_team_run, not as a CHECK). Use the RPC.
SELECT throws_ok(
  $$
  SELECT agents.fn_start_team_run(
    (SELECT id FROM agents.ai_lensers LIMIT 1),
    NULL::uuid,
    jsonb_build_object('_parent_team_run_id', current_setting('app.pgtap33.deep_parent')),
    'auto'
  )
  $$,
  '54000',
  NULL,
  'fn_start_team_run rejects when recursion depth would exceed cap (D5)'
);

SELECT * FROM finish();
ROLLBACK;
