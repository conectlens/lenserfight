-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 105_workflow_run_durability.sql
--
-- Covers migrations 20270608000001 (executor routing) and 20270608000002
-- (heartbeat + adoption + reap backstop).
--
-- The bug: lenses.fn_start_workflow_run never named a trigger_mode, so the
-- column default 'manual' applied, and the only claimer filtered
-- trigger_mode IN ('schedule','api'). A human-started run was therefore
-- claimable by nobody and sat at status='pending' with a full set of pending
-- node_results forever. The browser tab that started it was the sole executor,
-- and closing that tab abandoned the run silently.
--
-- The fix splits WHO TRIGGERED (trigger_mode) from WHO EXECUTES (executor), and
-- makes `executor` the only thing any claimer looks at.
--
-- Assertions below, in order:
--   Structural            1-7
--   Executor routing      8-13
--   Claim predicate      14-17
--   Client heartbeat     18-22
--   Stale-claim adoption 23-25
--   Reap backstop        26-32
--   Kill switch          33-34
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(34);

-- ── Structural ──────────────────────────────────────────────────────────────

SELECT has_column('lenses', 'workflow_runs', 'executor',
  'lenses.workflow_runs has an executor column');

SELECT col_not_null('lenses', 'workflow_runs', 'executor',
  'workflow_runs.executor is NOT NULL');

SELECT col_default_is('lenses', 'workflow_runs', 'executor', 'worker',
  'workflow_runs.executor defaults to worker (durable unless told otherwise)');

SELECT has_function('public', 'fn_heartbeat_client_workflow_run', ARRAY['uuid'],
  'public.fn_heartbeat_client_workflow_run(uuid) exists');

SELECT has_function('public', 'fn_reap_abandoned_workflow_runs', ARRAY['integer', 'integer'],
  'public.fn_reap_abandoned_workflow_runs(integer,integer) exists');

SELECT has_function('public', 'fn_worker_get_completed_node_results', ARRAY['uuid'],
  'public.fn_worker_get_completed_node_results(uuid) exists');

-- PGRST203 regression guard: PostgREST refuses to route an ambiguous overload.
SELECT is(
  (SELECT count(*)::int
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_start_workflow_run'),
  1,
  'public.fn_start_workflow_run still has exactly one overload'
);

-- ── Fixture: a workflow owned by seed lenser b2000000-…-01, plus 2 nodes ─────
DO $$
DECLARE
  v_wf uuid := gen_random_uuid();
  v_n1 uuid := gen_random_uuid();
  v_n2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 105 durability wf', 'private');

  INSERT INTO lenses.workflow_nodes (id, workflow_id, position_x, position_y, label)
  VALUES (v_n1, v_wf, 0, 0, 'n1'), (v_n2, v_wf, 1, 0, 'n2');

  PERFORM set_config('app.pgtap105.wf', v_wf::text, true);
  PERFORM set_config('app.pgtap105.n1', v_n1::text, true);
  PERFORM set_config('app.pgtap105.n2', v_n2::text, true);
END $$;

-- Act as the workflow's owner for the SECURITY DEFINER guards.
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- ── Executor routing ────────────────────────────────────────────────────────

-- 8. The default is worker: a run started with no browser attached is picked up
--    server-side. This is the actual bug fix.
DO $$
DECLARE v_run uuid;
BEGIN
  v_run := public.fn_start_workflow_run(current_setting('app.pgtap105.wf')::uuid, '{}'::jsonb);
  PERFORM set_config('app.pgtap105.default_run', v_run::text, true);
END $$;

SELECT is(
  (SELECT executor FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  'worker',
  'fn_start_workflow_run defaults executor to worker'
);

-- 9. trigger_mode is untouched — it still records that a human started this run.
SELECT is(
  (SELECT trigger_mode FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  'manual',
  'a human-started run keeps trigger_mode=manual (trigger axis unchanged)'
);

-- 10. Node results are still seeded.
SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_node_results
   WHERE run_id = current_setting('app.pgtap105.default_run')::uuid),
  2,
  'fn_start_workflow_run still seeds one pending node_result per node'
);

-- 11. An explicit client executor is honoured (browser-held BYOK credentials).
DO $$
DECLARE v_run uuid;
BEGIN
  v_run := public.fn_start_workflow_run(
    current_setting('app.pgtap105.wf')::uuid, '{}'::jsonb, NULL, NULL, NULL, 'client');
  PERFORM set_config('app.pgtap105.client_run', v_run::text, true);
END $$;

SELECT is(
  (SELECT executor FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.client_run')::uuid),
  'client',
  'fn_start_workflow_run honours an explicit client executor'
);

-- 12. An unknown executor is rejected rather than silently coerced.
SELECT throws_ok(
  $$SELECT public.fn_start_workflow_run(
      current_setting('app.pgtap105.wf')::uuid, '{}'::jsonb, NULL, NULL, NULL, 'nonsense')$$,
  '22023',
  NULL,
  'fn_start_workflow_run rejects an unknown executor'
);

-- 13. The column CHECK rejects an unknown executor written directly.
SELECT throws_ok(
  $$INSERT INTO lenses.workflow_runs (workflow_id, status, executor, context_inputs)
    VALUES (current_setting('app.pgtap105.wf')::uuid, 'pending', 'nonsense', '{}'::jsonb)$$,
  '23514',
  NULL,
  'workflow_runs rejects an unknown executor (check_violation)'
);

-- ── Claim predicate ─────────────────────────────────────────────────────────

-- 14. THE FIX: a pending worker-executed run is claimable even though its
--     trigger_mode is 'manual'. Before this change it was claimable by nobody.
SELECT is(
  (SELECT count(*)::int FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap105')),
  1,
  'claimer picks up a pending worker-executed manual run (the orphan bug)'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  'running',
  'the claimed run transitioned to running'
);

-- 16. Claiming stamps the heartbeat, so the recovery loop cannot immediately
--     steal a run that was just picked up.
SELECT isnt(
  (SELECT heartbeat_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  NULL,
  'claiming stamps heartbeat_at (no self-steal by the recovery loop)'
);

-- 17. The remaining pending run is client-executed, so nothing claims it.
SELECT is(
  (SELECT count(*)::int FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap105')),
  0,
  'claimer never claims a client-executed run (no double execution)'
);

-- ── Client heartbeat ────────────────────────────────────────────────────────

-- 18. The owner's tab can stamp liveness on its own client-executed run.
UPDATE lenses.workflow_runs
SET heartbeat_at = NULL
WHERE id = current_setting('app.pgtap105.client_run')::uuid;

SELECT lives_ok(
  $$SELECT public.fn_heartbeat_client_workflow_run(
      current_setting('app.pgtap105.client_run')::uuid)$$,
  'fn_heartbeat_client_workflow_run runs for the owner'
);

SELECT isnt(
  (SELECT heartbeat_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.client_run')::uuid),
  NULL,
  'heartbeat stamps heartbeat_at on a client-executed run'
);

-- 20. It must not touch a worker-executed run: a tab merely watching one must
--     not keep it alive on the worker's behalf.
UPDATE lenses.workflow_runs
SET heartbeat_at = NULL
WHERE id = current_setting('app.pgtap105.default_run')::uuid;

SELECT public.fn_heartbeat_client_workflow_run(current_setting('app.pgtap105.default_run')::uuid);

SELECT is(
  (SELECT heartbeat_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  NULL,
  'heartbeat is a no-op for a worker-executed run'
);

-- 21. It must not touch a terminal run (no resurrection).
DO $$
DECLARE v_run uuid;
BEGIN
  INSERT INTO lenses.workflow_runs (workflow_id, status, executor, context_inputs, completed_at)
  VALUES (current_setting('app.pgtap105.wf')::uuid, 'completed', 'client', '{}'::jsonb, now())
  RETURNING id INTO v_run;
  PERFORM set_config('app.pgtap105.done_run', v_run::text, true);
END $$;

SELECT public.fn_heartbeat_client_workflow_run(current_setting('app.pgtap105.done_run')::uuid);

SELECT is(
  (SELECT heartbeat_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.done_run')::uuid),
  NULL,
  'heartbeat is a no-op for a terminal run'
);

-- 22. It must not touch a run owned by somebody else.
DO $$
DECLARE
  v_wf  uuid := gen_random_uuid();
  v_run uuid;
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf, 'b2000000-0000-0000-0000-000000000002'::uuid,
          'pgTAP 105 other owner wf', 'private');
  INSERT INTO lenses.workflow_runs (workflow_id, status, executor, context_inputs)
  VALUES (v_wf, 'running', 'client', '{}'::jsonb)
  RETURNING id INTO v_run;
  PERFORM set_config('app.pgtap105.foreign_run', v_run::text, true);
END $$;

SELECT public.fn_heartbeat_client_workflow_run(current_setting('app.pgtap105.foreign_run')::uuid);

SELECT is(
  (SELECT heartbeat_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.foreign_run')::uuid),
  NULL,
  'heartbeat is a no-op for a run the caller does not own'
);

-- ── Stale-claim adoption ────────────────────────────────────────────────────

-- 23. The recovery loop adopts a stale worker-executed run.
UPDATE lenses.workflow_runs
SET status = 'running', heartbeat_at = now() - interval '10 minutes'
WHERE id = current_setting('app.pgtap105.default_run')::uuid;

SELECT is(
  (SELECT count(*)::int
   FROM public.fn_claim_stale_workflow_run('w-pgtap105-recovery', 60000, 5)),
  1,
  'fn_claim_stale_workflow_run adopts a stale worker-executed run'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.default_run')::uuid),
  'recovered',
  'the adopted run is marked recovered'
);

-- 25. It must never adopt a client-executed run: the server may not hold that
--     run's credentials, and its tab may still be driving it.
UPDATE lenses.workflow_runs
SET status = 'running', heartbeat_at = now() - interval '10 minutes'
WHERE id = current_setting('app.pgtap105.client_run')::uuid;

SELECT is(
  (SELECT count(*)::int
   FROM public.fn_claim_stale_workflow_run('w-pgtap105-recovery', 60000, 5)),
  0,
  'fn_claim_stale_workflow_run never adopts a client-executed run'
);

-- ── Reap backstop ───────────────────────────────────────────────────────────

-- 26. A client-executed run whose tab stopped heartbeating is retired.
SELECT is(
  public.fn_reap_abandoned_workflow_runs(60000, 100),
  1,
  'reaper retires exactly the one abandoned client-executed run'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.client_run')::uuid),
  'failed',
  'the abandoned run is marked failed'
);

SELECT isnt(
  (SELECT completed_at FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.client_run')::uuid),
  NULL,
  'the reaped run gets a completed_at so it reads as terminal'
);

SELECT ok(
  (SELECT metadata ? 'reaped_reason' FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.client_run')::uuid),
  'the reaped run records why it was retired'
);

-- 30. Its still-pending node results are failed too, so the UI stops showing
--     "pending" forever — the visible symptom of the original bug.
SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_node_results
   WHERE run_id = current_setting('app.pgtap105.client_run')::uuid
     AND status = 'failed'),
  2,
  'non-terminal node results of a reaped run are failed'
);

-- 31. A live client run — one that is heartbeating right now — is left alone.
DO $$
DECLARE v_run uuid;
BEGIN
  INSERT INTO lenses.workflow_runs (workflow_id, status, executor, context_inputs, heartbeat_at)
  VALUES (current_setting('app.pgtap105.wf')::uuid, 'running', 'client', '{}'::jsonb, now())
  RETURNING id INTO v_run;
  PERFORM set_config('app.pgtap105.live_run', v_run::text, true);
END $$;

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap105.live_run')::uuid),
  'running',
  'a heartbeating client run survives the reaper'
);

-- 32. A worker-executed run is never the reaper's business — the recovery loop
--     owns those, and reaping one would abandon work a worker is doing.
DO $$
DECLARE v_run uuid;
BEGIN
  INSERT INTO lenses.workflow_runs (workflow_id, status, executor, context_inputs, heartbeat_at)
  VALUES (current_setting('app.pgtap105.wf')::uuid, 'running', 'worker', '{}'::jsonb,
          now() - interval '1 hour')
  RETURNING id INTO v_run;
  PERFORM set_config('app.pgtap105.worker_run', v_run::text, true);
END $$;

SELECT is(
  (SELECT public.fn_reap_abandoned_workflow_runs(60000, 100)),
  0,
  'reaper ignores worker-executed runs however stale'
);

-- ── Kill switch ─────────────────────────────────────────────────────────────

-- 33-34. fn_start_workflow_run had no kill-switch check at all, so a
--        human-started run began even with the platform halted. The claim path
--        checks it, but a client-executed run never passes through a claim.
INSERT INTO admin.kill_switches (scope, operator_id, reason)
VALUES ('system', 'b2000000-0000-0000-0000-000000000001'::uuid, 'pgTAP 105 halt');

SELECT throws_ok(
  $$SELECT public.fn_start_workflow_run(
      current_setting('app.pgtap105.wf')::uuid, '{}'::jsonb)$$,
  '57P03',
  NULL,
  'fn_start_workflow_run refuses to start while the kill switch is active'
);

SELECT is(
  (SELECT count(*)::int FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap105-halted')),
  0,
  'the claimer also backs off while the kill switch is active'
);

SELECT * FROM finish();
ROLLBACK;
