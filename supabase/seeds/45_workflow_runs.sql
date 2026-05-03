-- =============================================================================
-- 45. WORKFLOW RUNS (smoke seed)
-- =============================================================================
-- Seeds 2 lenses.workflow_runs rows (one completed, one failed) so that fresh
-- supabase db reset produces non-empty observability data and Phase 9
-- acceptance criterion #4 ("≥1 workflow run after seed") is satisfied.
--
-- References:
--   • WF1 (Developer Code Review Suite) from 42_production_workflow_templates.sql
--   • WF2 (Bug Investigation & Fix Pipeline) from 42_production_workflow_templates.sql
--
-- Idempotent: each block is gated with IF NOT EXISTS by run id.
-- Dependencies:
--   • 42_production_workflow_templates.sql (creates the workflows referenced)
-- =============================================================================

DO $seed$
DECLARE
  WF1 uuid := '42000000-0002-0001-0001-000000000001';
  WF2 uuid := '42000000-0002-0002-0001-000000000001';

  RUN_OK   uuid := '45000000-0001-0000-0000-000000000001';
  RUN_FAIL uuid := '45000000-0002-0000-0000-000000000002';

  v_triggered_by uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF1) THEN
    RAISE NOTICE '45_workflow_runs: WF1 not seeded yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_triggered_by
  FROM lensers.profiles
  WHERE type = 'ai'::lensers.lenser_type AND status = 'active'::lensers.lenser_status
  ORDER BY created_at ASC LIMIT 1;

  IF v_triggered_by IS NULL THEN
    SELECT id INTO v_triggered_by FROM lensers.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- ── Completed run on WF1 ──────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.workflow_runs WHERE id = RUN_OK) THEN
    INSERT INTO lenses.workflow_runs (
      id, workflow_id, triggered_by, status,
      context_inputs, started_at, completed_at,
      global_model_id, budget_credits, spent_credits, cost_metadata
    ) VALUES (
      RUN_OK, WF1, v_triggered_by, 'completed',
      '{"function_code": "function add(a, b) { return a + b; }"}'::jsonb,
      now() - interval '2 hours', now() - interval '1 hour 58 minutes',
      'gpt-4o-mini', 1000, 42,
      '{"summary": "demo seed run, completed"}'::jsonb
    );
  END IF;

  -- ── Failed run on WF2 ─────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF2) THEN
    RAISE NOTICE '45_workflow_runs: WF2 not seeded yet — skipping failed run.';
  ELSIF NOT EXISTS (SELECT 1 FROM lenses.workflow_runs WHERE id = RUN_FAIL) THEN
    INSERT INTO lenses.workflow_runs (
      id, workflow_id, triggered_by, status,
      context_inputs, started_at, completed_at,
      global_model_id, budget_credits, spent_credits, cost_metadata
    ) VALUES (
      RUN_FAIL, WF2, v_triggered_by, 'failed',
      '{"stack_trace": "TypeError: cannot read property of undefined"}'::jsonb,
      now() - interval '30 minutes', now() - interval '29 minutes',
      'gpt-4o-mini', 500, 18,
      '{"summary": "demo seed run, failed at node 1", "error_code": "provider_timeout"}'::jsonb
    );
  END IF;

  RAISE NOTICE '45_workflow_runs: seeded smoke workflow runs.';
END
$seed$;
