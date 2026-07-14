-- =============================================================================
-- pgTAP — Headless (MCP/webhook) workflow run execution
-- Migrations 20270603000001 (idempotency lock) + 20270603000002 (headless 'api').
--
-- Structural checks (1-4) + behavioral checks (5-11). Idempotency dedup and the
-- claimer's "skip manual" invariant are additionally covered by the pre-existing
-- tests 36_automation_workflow_runs.sql and 33_automation_claim.sql, which run
-- against the migrated schema. Fixtures below mirror those files (seed lenser
-- b2000000-…-01; minimal workflow/node/run inserts).
-- =============================================================================
BEGIN;

SELECT plan(11);

-- ── Structural ──────────────────────────────────────────────────────────────

-- 1. The trigger_mode CHECK permits the new headless 'api' mode.
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'workflow_runs_trigger_mode_check'
      AND c.conrelid = 'lenses.workflow_runs'::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%api%'
  ),
  'lenses.workflow_runs trigger_mode CHECK permits api'
);

-- 2. The headless run creator exists with the expected signature.
SELECT has_function(
  'public', 'fn_mcp_workflow_run_start',
  ARRAY['uuid', 'jsonb', 'text', 'text', 'jsonb'],
  'public.fn_mcp_workflow_run_start(uuid,jsonb,text,text,jsonb) exists'
);

-- 3. The claimer exists.
SELECT has_function(
  'lenses', 'fn_claim_scheduled_workflow_run',
  ARRAY['text'],
  'lenses.fn_claim_scheduled_workflow_run(text) exists'
);

-- 4. The claimer body picks up trigger_mode 'api' (not schedule-only).
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lenses'
      AND p.proname = 'fn_claim_scheduled_workflow_run'
      AND pg_get_functiondef(p.oid) LIKE '%''api''%'
  ),
  'fn_claim_scheduled_workflow_run claims trigger_mode api'
);

-- ── Behavioral fixture: one workflow (+2 nodes) ─────────────────────────────
DO $$
DECLARE
  v_wf uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 101 headless wf', 'private');

  INSERT INTO lenses.workflow_nodes (id, workflow_id, position_x, position_y, label)
  VALUES (gen_random_uuid(), v_wf, 0, 0, 'n1');
  INSERT INTO lenses.workflow_nodes (id, workflow_id, position_x, position_y, label)
  VALUES (gen_random_uuid(), v_wf, 1, 0, 'n2');

  PERFORM set_config('app.pgtap101.wf', v_wf::text, true);
END $$;

-- 5-6. fn_mcp_workflow_run_start creates a trigger_mode='api' run and seeds one
--      pending node_result per node.
DO $$
DECLARE
  v_res jsonb;
BEGIN
  v_res := public.fn_mcp_workflow_run_start(current_setting('app.pgtap101.wf')::uuid, '{}'::jsonb);
  PERFORM set_config('app.pgtap101.mcp_run', (v_res->>'id'), true);
END $$;

SELECT is(
  (SELECT trigger_mode FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap101.mcp_run')::uuid),
  'api',
  'fn_mcp_workflow_run_start creates a trigger_mode=api run'
);

SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_node_results
   WHERE run_id = current_setting('app.pgtap101.mcp_run')::uuid),
  2,
  'fn_mcp_workflow_run_start seeds one pending node_result per node'
);

-- 7-8. The claimer picks up the pending 'api' run and transitions it to running.
SELECT is(
  (SELECT count(*)::int FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap101')),
  1,
  'fn_claim_scheduled_workflow_run claims the pending api run'
);

SELECT is(
  (SELECT status FROM lenses.workflow_runs
   WHERE id = current_setting('app.pgtap101.mcp_run')::uuid),
  'running',
  'claimed api run transitioned to running'
);

-- 9. Critical invariant: the claimer must NOT claim browser-driven 'manual' runs
--    (those execute client-side; claiming them would double-execute).
INSERT INTO lenses.workflow_runs (workflow_id, status, trigger_mode, context_inputs)
VALUES (current_setting('app.pgtap101.wf')::uuid, 'pending', 'manual', '{}'::jsonb);

SELECT is(
  (SELECT count(*)::int FROM lenses.fn_claim_scheduled_workflow_run('w-pgtap101')),
  0,
  'claimer still skips trigger_mode=manual (no double execution)'
);

-- 10-11. The CHECK constraint accepts 'api' and rejects an unknown mode.
SELECT lives_ok(
  $$INSERT INTO lenses.workflow_runs (workflow_id, status, trigger_mode, context_inputs)
    VALUES (current_setting('app.pgtap101.wf')::uuid, 'pending', 'api', '{}'::jsonb)$$,
  'workflow_runs accepts an insert with trigger_mode=api'
);

SELECT throws_ok(
  $$INSERT INTO lenses.workflow_runs (workflow_id, status, trigger_mode, context_inputs)
    VALUES (current_setting('app.pgtap101.wf')::uuid, 'pending', 'bogus_mode', '{}'::jsonb)$$,
  '23514',
  NULL,
  'workflow_runs rejects an unknown trigger_mode (check_violation)'
);

SELECT * FROM finish();
ROLLBACK;
