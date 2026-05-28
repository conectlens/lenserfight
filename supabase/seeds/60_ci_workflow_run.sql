-- =============================================================================
-- 60. CI FIXTURE — minimal workflow_run for seeds-smoke acceptance gate
-- =============================================================================
-- Inserts one completed workflow_run tied to the Article Pipeline template
-- workflow seeded by 40_lens_chain_templates.sql.
--
-- Purpose: satisfy the seeds-smoke CI check:
--   SELECT count(*) FROM lenses.workflow_runs;  -- must be >= 1
--
-- The run is idempotent: it guards with a fixed UUID so re-runs are safe.
-- =============================================================================

DO $seed$
DECLARE
  v_wf_article uuid := '40000000-0002-0001-0001-000000000001';
  v_run_id     uuid := '60000000-0000-0000-0000-000000000001';
BEGIN
  -- Only insert if the article-pipeline workflow was seeded (dep guard).
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_article) THEN
    RAISE NOTICE '60_ci_workflow_run: article-pipeline workflow not found — skipping.';
    RETURN;
  END IF;

  INSERT INTO lenses.workflow_runs (
    id,
    workflow_id,
    status,
    trigger_mode,
    context_inputs,
    started_at,
    completed_at
  )
  SELECT
    v_run_id,
    v_wf_article,
    'completed',
    'manual',
    '{}',
    now() - interval '1 minute',
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM lenses.workflow_runs WHERE id = v_run_id
  );

  RAISE NOTICE '60_ci_workflow_run: CI fixture workflow_run seeded.';
END
$seed$;
