-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 06_n8n_execution_model.sql
-- Validates the n8n-style workflow execution model introduced by
-- 20260426010000_n8n_execution_model.sql:
--
--   * RPC overload ambiguity for fn_update_workflow_node_result is gone
--     (PGRST203 regression — exactly one public signature must exist).
--   * fn_start_workflow_run has exactly one canonical 4-arg public signature.
--   * waiting_reason / active_node_id columns exist with correct types.
--   * fn_update_workflow_node_result writes waiting_reason for waiting
--     statuses, clears it on terminal statuses, sets workflow_runs.active_node_id
--     on running and clears it on terminal.
--   * workflow_run_provenance enforces non-empty path constraint.
--   * fn_record_run_provenance is idempotent on the (source,target,path) key.
--   * fn_get_workflow_run_state aggregates counts as expected.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(17);

-- ── Test 1: Single canonical fn_update_workflow_node_result overload ─────────
-- PGRST203 regression: PostgREST cannot dispatch when 5-arg AND 8-arg
-- overloads coexist. The migration drops the 5-arg legacy version.
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname      = 'fn_update_workflow_node_result'
  ),
  1,
  'fn_update_workflow_node_result has exactly one public overload (PGRST203 regression)'
);

-- ── Test 2: Canonical fn_update_workflow_node_result accepts waiting_reason ──
SELECT ok(
  EXISTS(
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname      = 'fn_update_workflow_node_result'
      AND pronargs     = 9
      AND 'p_waiting_reason' = ANY (proargnames)
  ),
  'fn_update_workflow_node_result canonical signature accepts p_waiting_reason'
);

-- ── Test 3: Single canonical fn_start_workflow_run overload ─────────────────
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname      = 'fn_start_workflow_run'
  ),
  1,
  'fn_start_workflow_run has exactly one public overload (PGRST203 regression)'
);

-- ── Test 4: workflow_node_results.waiting_reason column exists ──────────────
SELECT col_type_is(
  'lenses', 'workflow_node_results', 'waiting_reason', 'text',
  'workflow_node_results.waiting_reason is text'
);

-- ── Test 5: workflow_runs.active_node_id column exists ──────────────────────
SELECT col_type_is(
  'lenses', 'workflow_runs', 'active_node_id', 'uuid',
  'workflow_runs.active_node_id is uuid'
);

-- ── Test 6: workflow_run_provenance UNIQUE key exists ──────────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'workflow_run_provenance_unique'
      AND conrelid = 'lenses.workflow_run_provenance'::regclass
      AND contype  = 'u'
  ),
  'workflow_run_provenance_unique constraint exists'
);

-- ── Fixture: minimal owner + workflow + run + nodes ────────────────────────
-- workflow_nodes.lens_id is nullable, so we don't need a lens row.
INSERT INTO lensers.profiles (id, user_id, handle, display_name)
VALUES (
  '11111111-aaaa-bbbb-cccc-111111111111'::uuid,
  '22222222-aaaa-bbbb-cccc-222222222222'::uuid,
  'n8n.tester',
  'N8N Tester'
);

INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
VALUES (
  '33333333-aaaa-bbbb-cccc-333333333333'::uuid,
  '11111111-aaaa-bbbb-cccc-111111111111'::uuid,
  'N8N test workflow',
  'public'
);

INSERT INTO lenses.workflow_nodes (id, workflow_id, position_x, position_y, label, ordinal)
VALUES
  ('55555555-aaaa-bbbb-cccc-555555555551'::uuid,
   '33333333-aaaa-bbbb-cccc-333333333333'::uuid,
   0, 0, 'Step 1', 1),
  ('55555555-aaaa-bbbb-cccc-555555555552'::uuid,
   '33333333-aaaa-bbbb-cccc-333333333333'::uuid,
   280, 0, 'Step 2', 2);

INSERT INTO lenses.workflow_runs (id, workflow_id, triggered_by, status, context_inputs)
VALUES (
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '33333333-aaaa-bbbb-cccc-333333333333'::uuid,
  '11111111-aaaa-bbbb-cccc-111111111111'::uuid,
  'running',
  '{}'::jsonb
);

INSERT INTO lenses.workflow_node_results (id, run_id, node_id, status)
VALUES
  ('77777777-aaaa-bbbb-cccc-777777777771'::uuid,
   '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
   '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
   'pending'),
  ('77777777-aaaa-bbbb-cccc-777777777772'::uuid,
   '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
   '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
   'pending');

-- Simulate authenticated owner for SECURITY DEFINER guards.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-aaaa-bbbb-cccc-222222222222', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '22222222-aaaa-bbbb-cccc-222222222222',
    'role', 'authenticated'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- ── Test 7: Entering 'running' sets workflow_runs.active_node_id ────────────
SELECT lives_ok(
  $$
  SELECT public.fn_update_workflow_node_result(
    '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
    '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
    'running'
  )
  $$,
  'fn_update_workflow_node_result(running) succeeds for owner'
);

SELECT is(
  (SELECT active_node_id FROM lenses.workflow_runs
   WHERE id = '66666666-aaaa-bbbb-cccc-666666666666'::uuid),
  '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
  'workflow_runs.active_node_id is set to the running node'
);

-- ── Test 8: 'awaiting_dependency' persists waiting_reason ───────────────────
SELECT lives_ok(
  $$
  SELECT public.fn_update_workflow_node_result(
    '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
    '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
    'awaiting_dependency',
    NULL, NULL, NULL, NULL, NULL,
    'dependency'
  )
  $$,
  'fn_update_workflow_node_result(awaiting_dependency, ..., ''dependency'') succeeds'
);

SELECT is(
  (SELECT waiting_reason FROM lenses.workflow_node_results
   WHERE id = '77777777-aaaa-bbbb-cccc-777777777772'::uuid),
  'dependency',
  'waiting_reason persisted for awaiting_dependency'
);

-- ── Test 9: Terminal status clears waiting_reason and active_node_id ────────
SELECT public.fn_update_workflow_node_result(
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
  'completed'
);

SELECT is(
  (SELECT active_node_id FROM lenses.workflow_runs
   WHERE id = '66666666-aaaa-bbbb-cccc-666666666666'::uuid),
  NULL::uuid,
  'workflow_runs.active_node_id is cleared when running node completes'
);

SELECT public.fn_update_workflow_node_result(
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
  'completed'
);

SELECT is(
  (SELECT waiting_reason FROM lenses.workflow_node_results
   WHERE id = '77777777-aaaa-bbbb-cccc-777777777772'::uuid),
  NULL::text,
  'waiting_reason is cleared on transition to terminal status'
);

-- ── Test 10: Empty source path violates non-empty CHECK ─────────────────────
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$
  INSERT INTO lenses.workflow_run_provenance (
    source_run_id, source_node_id, source_output_path,
    target_run_id, target_node_id, target_input_path
  ) VALUES (
    '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
    '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
    '   ',  -- whitespace-only path is rejected by the non-empty CHECK
    '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
    '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
    'input.value'
  )
  $$,
  '23514',
  NULL,
  'workflow_run_provenance rejects empty source_output_path'
);

-- ── Test 11: fn_record_run_provenance is idempotent on (src,tgt,path) ───────
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-aaaa-bbbb-cccc-222222222222', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '22222222-aaaa-bbbb-cccc-222222222222',
    'role', 'authenticated'
  )::text,
  true
);

SELECT public.fn_record_run_provenance(
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
  'output.text',
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
  'inputs.prompt',
  NULL
);
SELECT public.fn_record_run_provenance(
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555551'::uuid,
  'output.text',
  '66666666-aaaa-bbbb-cccc-666666666666'::uuid,
  '55555555-aaaa-bbbb-cccc-555555555552'::uuid,
  'inputs.prompt',
  jsonb_build_object('expr', '{{output.text}}')
);

SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_run_provenance
   WHERE target_run_id = '66666666-aaaa-bbbb-cccc-666666666666'::uuid),
  1,
  'fn_record_run_provenance is idempotent on (source, target, path) key'
);

-- ── Test 12: fn_get_workflow_run_state aggregates counts correctly ─────────
SELECT is(
  (SELECT executed_count FROM public.fn_get_workflow_run_state(
     '66666666-aaaa-bbbb-cccc-666666666666'::uuid
  )),
  2,
  'fn_get_workflow_run_state.executed_count includes completed nodes'
);

SELECT is(
  (SELECT upstream_count FROM public.fn_get_workflow_run_state(
     '66666666-aaaa-bbbb-cccc-666666666666'::uuid
  )),
  1,
  'fn_get_workflow_run_state.upstream_count reflects recorded provenance edge'
);

SELECT is(
  (SELECT active_node_id FROM public.fn_get_workflow_run_state(
     '66666666-aaaa-bbbb-cccc-666666666666'::uuid
  )),
  NULL::uuid,
  'fn_get_workflow_run_state.active_node_id is NULL after all nodes completed'
);

SELECT * FROM finish();

ROLLBACK;
