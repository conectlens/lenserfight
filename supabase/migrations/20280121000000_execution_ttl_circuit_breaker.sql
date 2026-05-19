-- Execution TTL circuit breaker
--
-- Adds a pg_cron-based sweeper that marks workflow runs stuck in
-- 'running'/'streaming'/'recovered' with no recent heartbeat as 'timed_out',
-- cascading to their node results. Prevents orphaned runs from accumulating
-- indefinitely after worker crashes or network partitions.
--
-- Follows the advisory-lock wrapper pattern from
-- 20271001000000_wire_cron_safe_wrappers.sql (automation.fn_run_with_lock
-- with a 55-second statement_timeout).

-- ─── fn_timeout_stale_runs ───────────────────────────────────────────────────
-- Marks runs that have been in an active state with no heartbeat for longer
-- than p_stale_threshold_hours as 'timed_out'. Cascades to non-terminal
-- workflow_node_results. Uses FOR UPDATE SKIP LOCKED to avoid contention
-- with live workers that hold row locks.
-- Returns the count of runs timed out.

CREATE OR REPLACE FUNCTION public.fn_timeout_stale_runs(
  p_stale_threshold_hours INT DEFAULT 4
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_threshold INTERVAL;
  v_count     INT := 0;
  v_run_id    UUID;
BEGIN
  v_threshold := make_interval(hours => p_stale_threshold_hours);

  FOR v_run_id IN
    SELECT id
    FROM   lenses.workflow_runs
    WHERE  status IN ('running', 'streaming', 'recovered')
      AND  (
             -- No heartbeat and started too long ago
             (heartbeat_at IS NULL     AND started_at  < now() - v_threshold)
             OR
             -- Heartbeat present but stale
             (heartbeat_at IS NOT NULL AND heartbeat_at < now() - v_threshold)
           )
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark run terminal
    UPDATE lenses.workflow_runs
    SET    status       = 'timed_out',
           completed_at = COALESCE(completed_at, now())
    WHERE  id = v_run_id;

    -- Cascade: mark all non-terminal node results as timed_out
    UPDATE lenses.workflow_node_results
    SET    status        = 'timed_out',
           completed_at  = COALESCE(completed_at, now()),
           error_message = COALESCE(error_message, 'run_timed_out_by_sweeper')
    WHERE  run_id = v_run_id
      AND  status NOT IN (
             'completed', 'failed', 'cancelled',
             'timed_out', 'skipped', 'blocked', 'invalidated'
           );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_timeout_stale_runs(INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_timeout_stale_runs(INT) TO service_role;

COMMENT ON FUNCTION public.fn_timeout_stale_runs(INT) IS
  'Sweeper: marks workflow runs that have been in running/streaming/recovered '
  'state with no heartbeat for > p_stale_threshold_hours (default 4h) as '
  'timed_out, cascading to node results. Uses FOR UPDATE SKIP LOCKED to avoid '
  'contention with live workers. Intended to run every 5 minutes via pg_cron.';

-- ─── fn_timeout_stale_runs_safe ─────────────────────────────────────────────
-- Advisory-lock wrapper following the pattern from
-- 20271001000000_wire_cron_safe_wrappers.sql. Prevents overlapping cron ticks
-- from running the sweeper concurrently, and caps execution at 55s.

CREATE OR REPLACE FUNCTION public.fn_timeout_stale_runs_safe()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT automation.fn_run_with_lock(
    'timeout-stale-runs',
    'SELECT public.fn_timeout_stale_runs(4)'
  );
$$;

REVOKE ALL ON FUNCTION public.fn_timeout_stale_runs_safe() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_timeout_stale_runs_safe() TO service_role;

COMMENT ON FUNCTION public.fn_timeout_stale_runs_safe() IS
  'pg_cron entry-point for fn_timeout_stale_runs. Wraps execution in '
  'automation.fn_run_with_lock (advisory lock + 55s statement_timeout) '
  'to prevent overlapping ticks.';

-- ─── Register pg_cron schedule ───────────────────────────────────────────────
-- Idempotent: unschedule first (no-op if not present), then conditionally
-- create. Mirrors the guard pattern from wire_cron_safe_wrappers.

SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname = 'timeout-stale-runs';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_proc   p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'fn_timeout_stale_runs_safe'
  ) THEN
    PERFORM cron.schedule(
      'timeout-stale-runs',
      '*/5 * * * *',
      'SELECT public.fn_timeout_stale_runs_safe()'
    );
  END IF;
END $$;
