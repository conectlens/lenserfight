-- =============================================================================
-- 53. DEV WORKFLOW RUN STUBS
-- =============================================================================
-- Seeds at least one lenses.workflow_runs row so the seeds-smoke acceptance
-- check (`SELECT count(*) FROM lenses.workflow_runs >= 1`) passes after a
-- clean db reset.
--
-- Idempotent: guarded by IF NOT EXISTS on the workflow and a unique
-- idempotency_key on the run.
--
-- Dependencies: 42_production_workflow_templates.sql (WF-1 UUID)
-- =============================================================================

DO $seed$
DECLARE
  v_wf_id      uuid := '42000000-0002-0001-0001-000000000001'; -- WF-1 Code Review Suite
  v_lenser_id  uuid;
  v_run_id     uuid := '53000000-0000-0000-0000-000000000001';
BEGIN
  -- Only seed if the parent workflow was created (42_ ran successfully)
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_id) THEN
    RAISE NOTICE '53_dev_workflow_run_stubs: parent workflow not found — skipping.';
    RETURN;
  END IF;

  -- Skip if stub already exists (idempotent)
  IF EXISTS (SELECT 1 FROM lenses.workflow_runs WHERE id = v_run_id) THEN
    RETURN;
  END IF;

  -- Resolve the triggering lenser (use @lenserfight if available)
  SELECT id INTO v_lenser_id FROM lensers.profiles WHERE handle = 'lenserfight' LIMIT 1;
  IF v_lenser_id IS NULL THEN
    SELECT id INTO v_lenser_id FROM lensers.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_lenser_id IS NULL THEN
    RAISE NOTICE '53_dev_workflow_run_stubs: no lensers.profiles row — skipping.';
    RETURN;
  END IF;

  INSERT INTO lenses.workflow_runs (
    id, workflow_id, triggered_by, status,
    context_inputs, trigger_mode, idempotency_key,
    started_at, completed_at
  ) VALUES (
    v_run_id,
    v_wf_id,
    v_lenser_id,
    'completed',
    '{}'::jsonb,
    'manual',
    'dev-stub-run-001',
    now() - interval '1 hour',
    now() - interval '50 minutes'
  );

  RAISE NOTICE '53_dev_workflow_run_stubs: seeded 1 stub workflow_run (id=%).', v_run_id;
END
$seed$;
