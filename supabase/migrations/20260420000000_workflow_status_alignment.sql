-- =============================================================================
-- 20260420000000_workflow_status_alignment.sql
-- -----------------------------------------------------------------------------
-- Phase 1 — Foundations (Lens Workflow Engine Blueprint §5 + §6.8).
--
-- Aligns the DB-level status check constraints with the engine's state
-- machine, and prepares `workflow_runs` for crash recovery + orchestration
-- subflows.
--
-- Changes
-- ---------
-- 1. Extend `workflow_runs_status_check` with: queued, streaming, timed_out,
--    recovered. Preserve existing: pending, running, completed, failed,
--    cancelled.
-- 2. Extend `workflow_node_results_status_check` with: awaiting_dependency,
--    queued, streaming, retrying, timed_out, skipped, blocked, invalidated.
--    Preserve existing: pending, running, completed, failed, cancelled.
-- 3. Add `heartbeat_at`, `run_worker_id`, `parent_run_id`, `recursion_depth`
--    to `workflow_runs` so the recovery loop (§6.8) can claim stale runs
--    and orchestration lenses (§11.5) can cap runaway subflows.
-- 4. Update `fn_update_workflow_node_result` so `started_at` is written for
--    both `running` and `streaming`, and `completed_at` is written for all
--    terminal node statuses (not just completed/failed/cancelled).
-- 5. Update `fn_update_workflow_run_status` so `completed_at` is written for
--    all terminal run statuses, and `started_at` is written on first run
--    transition into a non-draft state.
--
-- Safety
-- ------
-- * Additive: no data loss, no renames.
-- * Existing rows keep their current statuses.
-- * Every new status is OPT-IN; no application code is forced to use it.
-- =============================================================================

-- ─── 1. workflow_runs status alignment ─────────────────────────────────────
ALTER TABLE lenses.workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_status_check;

ALTER TABLE lenses.workflow_runs
  ADD CONSTRAINT workflow_runs_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'validated'::text,
    'queued'::text,
    'pending'::text,
    'running'::text,
    'streaming'::text,
    'recovered'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text,
    'timed_out'::text
  ]));

COMMENT ON CONSTRAINT workflow_runs_status_check ON lenses.workflow_runs IS
  'Aligns with the engine state machine (Phase 1 §5). `recovered` is a transient status written by the crash-recovery loop before the run resumes. Terminal states: completed, failed, cancelled, timed_out.';

-- ─── 2. workflow_node_results status alignment ─────────────────────────────
ALTER TABLE lenses.workflow_node_results
  DROP CONSTRAINT IF EXISTS workflow_node_results_status_check;

ALTER TABLE lenses.workflow_node_results
  ADD CONSTRAINT workflow_node_results_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'awaiting_dependency'::text,
    'queued'::text,
    'running'::text,
    'streaming'::text,
    'retrying'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text,
    'skipped'::text,
    'timed_out'::text,
    'blocked'::text,
    'invalidated'::text
  ]));

COMMENT ON CONSTRAINT workflow_node_results_status_check ON lenses.workflow_node_results IS
  'Aligns with the engine state machine (Phase 1 §5). Terminal statuses: completed, failed, cancelled, skipped, timed_out, blocked, invalidated. Transient: pending, awaiting_dependency, queued, running, streaming, retrying.';

-- ─── 3. Recovery + orchestration columns on workflow_runs ──────────────────
ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS run_worker_id text;

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS parent_run_id uuid
    REFERENCES lenses.workflow_runs(id) ON DELETE SET NULL;

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS recursion_depth integer NOT NULL DEFAULT 0;

ALTER TABLE lenses.workflow_runs
  DROP CONSTRAINT IF EXISTS wf_runs_recursion_depth_cap;

ALTER TABLE lenses.workflow_runs
  ADD CONSTRAINT wf_runs_recursion_depth_cap
  CHECK (recursion_depth >= 0 AND recursion_depth <= 8);

COMMENT ON COLUMN lenses.workflow_runs.heartbeat_at IS
  'Last heartbeat from the worker currently owning this run. NULL until the first wave begins. Used by the crash-recovery loop (§6.8) to detect stale runs.';

COMMENT ON COLUMN lenses.workflow_runs.run_worker_id IS
  'Opaque identifier for the worker process that currently owns this run. Set by fn_claim_stale_workflow_run; cleared on terminal statuses.';

COMMENT ON COLUMN lenses.workflow_runs.parent_run_id IS
  'Parent workflow_runs.id when this run was spawned by an orchestration lens subflow. NULL for top-level runs.';

COMMENT ON COLUMN lenses.workflow_runs.recursion_depth IS
  'Depth of this run in the orchestration lens chain (0 = top-level). Capped at 8 to prevent runaway subflows (Phase 9 §Orchestration is bounded).';

CREATE INDEX IF NOT EXISTS idx_workflow_runs_heartbeat_stale
  ON lenses.workflow_runs (heartbeat_at)
  WHERE status IN ('queued', 'running', 'streaming', 'recovered');

CREATE INDEX IF NOT EXISTS idx_workflow_runs_parent
  ON lenses.workflow_runs (parent_run_id)
  WHERE parent_run_id IS NOT NULL;

-- ─── 4. fn_update_workflow_node_result: honour new statuses ───────────────
CREATE OR REPLACE FUNCTION public.fn_update_workflow_node_result(
  p_run_id       uuid,
  p_node_id      uuid,
  p_status       text,
  p_output_data  jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot update results for run %', p_run_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_node_results
  SET
    status        = p_status,
    output_data   = COALESCE(p_output_data, output_data),
    error_message = COALESCE(p_error_message, error_message),
    started_at    = CASE
                      WHEN p_status IN ('running', 'streaming', 'retrying') AND started_at IS NULL
                        THEN now()
                      ELSE started_at
                    END,
    completed_at  = CASE
                      WHEN p_status IN ('completed', 'failed', 'cancelled',
                                        'skipped', 'timed_out', 'blocked', 'invalidated')
                        THEN now()
                      ELSE completed_at
                    END
  WHERE run_id = p_run_id AND node_id = p_node_id;
END;
$$;

COMMENT ON FUNCTION public.fn_update_workflow_node_result(uuid, uuid, text, jsonb, text) IS
  'Updates a workflow_node_result row with status, output_data, and error_message. Aligned with Phase 1 state machine — started_at set for running/streaming/retrying, completed_at for all terminal statuses (completed, failed, cancelled, skipped, timed_out, blocked, invalidated).';

-- ─── 5. fn_update_workflow_run_status: honour new statuses ────────────────
CREATE OR REPLACE FUNCTION public.fn_update_workflow_run_status(
  p_run_id uuid,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot update run %', p_run_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_runs
  SET
    status       = p_status,
    started_at   = CASE
                     WHEN p_status IN ('running', 'streaming') AND started_at IS NULL
                       THEN now()
                     ELSE started_at
                   END,
    completed_at = CASE
                     WHEN p_status IN ('completed', 'failed', 'cancelled', 'timed_out')
                       THEN now()
                     ELSE completed_at
                   END,
    -- Clear worker ownership on terminal transitions so stale-claim queries
    -- do not revive a finished run.
    run_worker_id = CASE
                      WHEN p_status IN ('completed', 'failed', 'cancelled', 'timed_out')
                        THEN NULL
                      ELSE run_worker_id
                    END
  WHERE id = p_run_id;
END;
$$;

COMMENT ON FUNCTION public.fn_update_workflow_run_status(uuid, text) IS
  'Updates a workflow_run status. Aligned with Phase 1 state machine — started_at written on first transition into running/streaming, completed_at for terminal states (completed, failed, cancelled, timed_out), run_worker_id cleared on terminals.';

-- ─── 6. fn_heartbeat_workflow_run: lightweight keep-alive from worker ─────
CREATE OR REPLACE FUNCTION public.fn_heartbeat_workflow_run(
  p_run_id     uuid,
  p_worker_id  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
BEGIN
  UPDATE lenses.workflow_runs
  SET heartbeat_at  = now(),
      run_worker_id = COALESCE(run_worker_id, p_worker_id)
  WHERE id = p_run_id
    AND status IN ('queued', 'running', 'streaming', 'recovered');
END;
$$;

ALTER FUNCTION public.fn_heartbeat_workflow_run(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_heartbeat_workflow_run(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_heartbeat_workflow_run(uuid, text) TO service_role;

COMMENT ON FUNCTION public.fn_heartbeat_workflow_run(uuid, text) IS
  'Lightweight keep-alive pinged by the execution worker every HEARTBEAT_MS. Used by fn_claim_stale_workflow_run (Phase 7) to detect stalled runs. Only writes while the run is in a non-terminal state.';
