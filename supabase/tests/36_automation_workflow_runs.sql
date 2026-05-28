-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 36_automation_workflow_runs.sql
-- Workflow run lifecycle: start, idempotency TTL, rate limit, anon rejection,
-- budget-cancel cascade, stale-run reclaim.
--
--   * fn_start_workflow_run idempotency_key — second call same key returns
--     first run id, no new row inserted.
--   * fn_start_workflow_run idempotency TTL (D4) — expired key behaves like
--     a fresh key (new run materialized).
--   * fn_start_workflow_run anon rejection (D2) — anon caller raises 42501.
--   * fn_cancel_workflow_run_over_budget — sets run cancelled, cascades to
--     in-flight node_results, emits run.cancelled event, preserves prior
--     error_message on already-failed nodes (D3 verification).
--   * fn_claim_stale_workflow_run — heartbeat older than threshold → row
--     transitions to status='recovered'.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(12);

-- ── Fixture: one workflow with a single node ──────────────────────────────
DO $$
DECLARE
  v_wf_id uuid := gen_random_uuid();
  v_node_id uuid := gen_random_uuid();
  v_lens_id uuid;
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf_id, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 36 wf', 'public');

  SELECT id INTO v_lens_id FROM lenses.lenses
   WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid
   LIMIT 1;

  INSERT INTO lenses.workflow_nodes (
    id, workflow_id, lens_id, position_x, position_y, label
  ) VALUES (v_node_id, v_wf_id, v_lens_id, 0, 0, 'n1');

  -- Second node — needed for the budget-cancel cascade test (asserts that
  -- only the in-flight node moves to cancelled while the already-failed
  -- node keeps its original error_message).
  INSERT INTO lenses.workflow_nodes (
    id, workflow_id, lens_id, position_x, position_y, label
  ) VALUES (gen_random_uuid(), v_wf_id, v_lens_id, 1, 0, 'n2');

  PERFORM set_config('app.pgtap36.wf_id', v_wf_id::text, true);
  PERFORM set_config('app.pgtap36.node_id', v_node_id::text, true);
END $$;

-- ── Test 1: idempotency short-circuit returns existing run_id ─────────────
-- Caller: postgres role (service-role-like, bypasses rate limit & RLS).
DO $$
DECLARE
  v_first uuid; v_second uuid;
  v_wf uuid := current_setting('app.pgtap36.wf_id')::uuid;
BEGIN
  v_first := public.fn_start_workflow_run(
    v_wf, '{}'::jsonb, NULL::text, 'pgtap-idempo-1'::text);
  v_second := public.fn_start_workflow_run(
    v_wf, '{}'::jsonb, NULL::text, 'pgtap-idempo-1'::text);

  PERFORM set_config('app.pgtap36.first', v_first::text, true);
  PERFORM set_config('app.pgtap36.second', v_second::text, true);
END $$;

SELECT is(
  current_setting('app.pgtap36.first')::uuid,
  current_setting('app.pgtap36.second')::uuid,
  'idempotency_key reused returns the original run_id'
);

SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_runs
   WHERE workflow_id = current_setting('app.pgtap36.wf_id')::uuid
     AND idempotency_key = 'pgtap-idempo-1'),
  1,
  'still only one workflow_runs row for that idempotency_key'
);

-- ── Test 2 (D4): expired idempotency_key behaves as fresh ─────────────────
-- Backdate the existing run's expires_at, then call again.
UPDATE lenses.workflow_runs
SET    idempotency_expires_at = now() - interval '1 hour'
WHERE  id = current_setting('app.pgtap36.first')::uuid;

DO $$
DECLARE
  v_fresh uuid;
  v_wf uuid := current_setting('app.pgtap36.wf_id')::uuid;
BEGIN
  v_fresh := public.fn_start_workflow_run(
    v_wf, '{}'::jsonb, NULL::text, 'pgtap-idempo-1'::text);
  PERFORM set_config('app.pgtap36.fresh', v_fresh::text, true);
END $$;

SELECT isnt(
  current_setting('app.pgtap36.fresh')::uuid,
  current_setting('app.pgtap36.first')::uuid,
  'expired idempotency_key produces a NEW run_id (D4)'
);

SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_runs
   WHERE workflow_id = current_setting('app.pgtap36.wf_id')::uuid
     AND idempotency_key = 'pgtap-idempo-1'),
  2,
  'two distinct workflow_runs now exist for the reused (expired) key'
);

-- ── Test 3 (D2): anon caller rejected ─────────────────────────────────────
-- Make the workflow public so the auth check passes; then assert anon role
-- still cannot create a run (rate limit cannot be enforced).
UPDATE lenses.workflows SET visibility = 'public'
WHERE id = current_setting('app.pgtap36.wf_id')::uuid;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role', 'anon', true);

SELECT throws_ok(
  $$ SELECT public.fn_start_workflow_run(
       current_setting('app.pgtap36.wf_id')::uuid,
       '{}'::jsonb, NULL::text, NULL::text)
  $$,
  '42501',
  NULL,
  'anon caller cannot start a workflow run (D2 rate-limit bypass guard)'
);

RESET ROLE;

-- ── Test 4: fn_cancel_workflow_run_over_budget cascade + event ────────────
DO $$
DECLARE
  v_run_id   uuid;
  v_wf       uuid := current_setting('app.pgtap36.wf_id')::uuid;
  v_node_a   uuid := current_setting('app.pgtap36.node_id')::uuid;
  v_node_b   uuid;
BEGIN
  -- Resolve the second node we seeded in the fixture.
  SELECT id INTO v_node_b FROM lenses.workflow_nodes
   WHERE workflow_id = v_wf AND id <> v_node_a LIMIT 1;

  -- Create a fresh run with a tight budget already exceeded by spent.
  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode,
    budget_credits, spent_credits
  ) VALUES (v_wf, 'running', 'manual', 100, 90)
  RETURNING id INTO v_run_id;

  -- Two node_results: one running (will be cascade-cancelled), one already
  -- failed (must keep its original error_message — D3 verification).
  INSERT INTO lenses.workflow_node_results (
    run_id, node_id, status, error_message
  ) VALUES (v_run_id, v_node_a, 'running', NULL);

  INSERT INTO lenses.workflow_node_results (
    run_id, node_id, status, error_message
  ) VALUES (v_run_id, v_node_b, 'failed', 'provider_timeout');

  PERFORM set_config('app.pgtap36.budget_run', v_run_id::text, true);
END $$;

SELECT is(
  public.fn_cancel_workflow_run_over_budget(
    current_setting('app.pgtap36.budget_run')::uuid,
    50  -- pending: 90 + 50 = 140 > 100 budget
  ),
  true,
  'fn_cancel_workflow_run_over_budget returns true when over budget'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap36.budget_run')::uuid),
  'cancelled',
  'run transitioned to cancelled'
);

SELECT is(
  (SELECT status FROM lenses.workflow_node_results
   WHERE run_id = current_setting('app.pgtap36.budget_run')::uuid
     AND error_message IS DISTINCT FROM 'provider_timeout'
   LIMIT 1),
  'cancelled',
  'in-flight node cascaded to cancelled'
);

-- D3 verification: the previously failed node KEPT its original error_message.
SELECT is(
  (SELECT error_message FROM lenses.workflow_node_results
   WHERE run_id = current_setting('app.pgtap36.budget_run')::uuid
     AND error_message = 'provider_timeout'),
  'provider_timeout',
  'previously failed node retains its prior error_message (D3 verified)'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM lenses.workflow_run_events
    WHERE run_id = current_setting('app.pgtap36.budget_run')::uuid
      AND type = 'run.cancelled'
  ),
  'run.cancelled event was emitted'
);

-- ── Test 5: fn_claim_stale_workflow_run recovers a stale run ──────────────
DO $$
DECLARE
  v_run_id uuid;
  v_wf uuid := current_setting('app.pgtap36.wf_id')::uuid;
BEGIN
  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode,
    run_worker_id, heartbeat_at, started_at
  ) VALUES (
    v_wf, 'running', 'manual',
    'dead-worker', now() - interval '10 minutes', now() - interval '15 minutes'
  ) RETURNING id INTO v_run_id;
  PERFORM set_config('app.pgtap36.stale_run', v_run_id::text, true);
END $$;

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.fn_claim_stale_workflow_run(
      'new-worker', 60000, 1
    ) WHERE run_id = current_setting('app.pgtap36.stale_run')::uuid
  ),
  'fn_claim_stale_workflow_run reclaims a heartbeat-stale run'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap36.stale_run')::uuid),
  'recovered',
  'reclaimed run transitioned to status=recovered'
);

SELECT * FROM finish();
ROLLBACK;
