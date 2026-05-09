-- =============================================================================
-- 20260422000000_workflow_recovery.sql
-- -----------------------------------------------------------------------------
-- Phase 7 — Recovery (Lens Workflow Engine Blueprint §10 + §6.8).
--
-- Introduces `fn_claim_stale_workflow_run`, the atomic claim primitive used
-- by the worker bootstrap loop to resume crashed runs. Uses
-- `FOR UPDATE SKIP LOCKED` so multiple workers can race on the claim table
-- without contention — only one worker will walk away with any given run.
--
-- Contract
-- --------
-- * A run is "claimable" when:
--     - status IN ('queued','running','streaming','recovered')
--     - heartbeat_at IS NULL OR heartbeat_at < now() - stale_threshold
-- * On claim, the function:
--     - sets status = 'recovered'
--     - stamps run_worker_id = p_worker_id
--     - writes heartbeat_at = now()
--     - returns the run_id (and workflow_id + recursion_depth) so the worker
--       can resume execution from the persisted node_results.
-- * Returns zero rows if no claimable run exists, OR if another worker won
--   the race.
--
-- Safety
-- ------
-- * `FOR UPDATE SKIP LOCKED` guarantees no double-claim even under high
--   worker concurrency.
-- * Idempotent: calling twice with the same worker id is a no-op after the
--   first successful claim (the heartbeat is refreshed each call anyway via
--   fn_heartbeat_workflow_run).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_claim_stale_workflow_run(
  p_worker_id        text,
  p_stale_after_ms   integer DEFAULT 60000,
  p_max_claims       integer DEFAULT 1
) RETURNS TABLE (
  run_id          uuid,
  workflow_id     uuid,
  parent_run_id   uuid,
  recursion_depth integer,
  previous_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_threshold interval := make_interval(secs => GREATEST(p_stale_after_ms, 0)::numeric / 1000.0);
BEGIN
  IF p_worker_id IS NULL OR length(p_worker_id) = 0 THEN
    RAISE EXCEPTION 'fn_claim_stale_workflow_run: p_worker_id is required'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT r.id, r.workflow_id, r.parent_run_id, r.recursion_depth, r.status
    FROM lenses.workflow_runs r
    WHERE r.status IN ('queued', 'running', 'streaming', 'recovered')
      AND (
            r.heartbeat_at IS NULL
        OR  r.heartbeat_at < (now() - v_threshold)
      )
      -- If another worker already owns the run AND is heartbeating, we
      -- would have filtered it above. The remaining `run_worker_id IS NOT
      -- NULL` rows are genuinely stale.
    ORDER BY COALESCE(r.heartbeat_at, r.started_at, r.created_at) ASC
    LIMIT GREATEST(p_max_claims, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE lenses.workflow_runs r
    SET status        = 'recovered',
        run_worker_id = p_worker_id,
        heartbeat_at  = now()
    FROM claimable c
    WHERE r.id = c.id
    RETURNING r.id, r.workflow_id, r.parent_run_id, r.recursion_depth, c.status AS previous_status
  )
  SELECT
    claimed.id,
    claimed.workflow_id,
    claimed.parent_run_id,
    claimed.recursion_depth,
    claimed.previous_status
  FROM claimed;
END;
$$;

ALTER FUNCTION public.fn_claim_stale_workflow_run(text, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_claim_stale_workflow_run(text, integer, integer) TO service_role;

COMMENT ON FUNCTION public.fn_claim_stale_workflow_run(text, integer, integer) IS
  'Phase 7 — Atomic claim of stale workflow runs for the crash-recovery loop. Uses FOR UPDATE SKIP LOCKED; multiple workers can race safely. Sets status=recovered and stamps run_worker_id + heartbeat_at in one transaction. Returns zero rows when nothing is claimable.';
