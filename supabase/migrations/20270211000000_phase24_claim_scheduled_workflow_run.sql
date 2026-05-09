-- Phase 24-A: fn_claim_scheduled_workflow_run
-- Atomically claims the next pending scheduled workflow run using FOR UPDATE SKIP LOCKED.
-- Returns one row when a run is claimed; empty result set when nothing is pending.

CREATE OR REPLACE FUNCTION lenses.fn_claim_scheduled_workflow_run(p_worker_id TEXT)
RETURNS TABLE (
  run_id         UUID,
  workflow_id    UUID,
  schedule_id    UUID,
  triggered_by   UUID,
  context_inputs JSONB,
  global_model_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_run lenses.workflow_runs;
BEGIN
  SELECT *
  INTO v_run
  FROM lenses.workflow_runs
  WHERE status = 'pending'
    AND trigger_mode = 'schedule'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE lenses.workflow_runs
  SET status     = 'running',
      started_at = COALESCE(started_at, now())
  WHERE id = v_run.id;

  RETURN QUERY
  SELECT
    v_run.id,
    v_run.workflow_id,
    v_run.schedule_id,
    v_run.triggered_by,
    v_run.context_inputs,
    v_run.global_model_id;
END;
$$;

REVOKE ALL ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) TO service_role;
