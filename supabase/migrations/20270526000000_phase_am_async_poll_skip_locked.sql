-- =============================================================================
-- Phase AM — Async Media Poll Worker support
-- =============================================================================
-- Replaces execution.fn_poll_async_run with a SKIP LOCKED variant that:
--   1. Uses Phase 0's last_polled_at column to fairly distribute polls
--      across concurrent workers (oldest-polled first).
--   2. FOR UPDATE SKIP LOCKED so two workers never claim the same run.
--   3. Updates last_polled_at = now() on the claimed rows so the next
--      tick picks up different runs.
--
-- The signature stays compatible with the existing caller surface; the
-- behavior change is internal. The Phase 0 migration added last_polled_at;
-- this migration is the first to read it.
--
-- Also adds:
--   - execution.fn_async_run_idempotent_complete — wraps fn_complete_async_run
--     with a no-op when the run is already in a terminal state, so the
--     poll worker can safely retry on transient failures.
--   - pg_cron schedule: 'async-run-poller' every 30 seconds, calling a
--     batch-poll RPC that emits a NOTIFY (workers prefer realtime-NOTIFY
--     over cron, but the cron is a belt-and-braces fallback).
-- =============================================================================

CREATE OR REPLACE FUNCTION execution.fn_poll_async_run(
  p_stale_after_seconds INT DEFAULT 30,
  p_limit               INT DEFAULT 10
)
RETURNS TABLE (
  run_id            UUID,
  provider_task_id  TEXT,
  model_key         TEXT,
  provider_key      TEXT,
  output_modality   TEXT,
  started_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, ai, public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  -- 1. Claim a batch of due runs with SKIP LOCKED. Order by NULLS FIRST so
  -- runs that have never been polled get priority over recently-polled ones.
  WITH claimed AS (
    SELECT r.id
    FROM execution.runs r
    WHERE r.is_async = TRUE
      AND r.status   = 'running'
      AND r.provider_task_id IS NOT NULL
      AND (
        r.last_polled_at IS NULL
        OR r.last_polled_at < now() - (p_stale_after_seconds || ' seconds')::INTERVAL
      )
    ORDER BY r.last_polled_at NULLS FIRST, r.started_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 50))
  )
  SELECT array_agg(id) INTO v_ids FROM claimed;

  IF v_ids IS NULL THEN
    RETURN;  -- nothing to poll; quiet exit
  END IF;

  -- 2. Bump last_polled_at on the claimed rows so the next tick avoids them
  -- until p_stale_after_seconds has elapsed.
  UPDATE execution.runs
  SET last_polled_at = now()
  WHERE id = ANY(v_ids);

  -- 3. Return the join shape the worker expects.
  RETURN QUERY
    SELECT
      r.id              AS run_id,
      r.provider_task_id,
      m.key             AS model_key,
      p.key             AS provider_key,
      req.output_modality,
      r.started_at
    FROM execution.runs r
    JOIN execution.requests req ON req.id = r.request_id
    LEFT JOIN ai.models   m ON m.id = req.model_id
    LEFT JOIN ai.providers p ON p.id = m.provider_id
    WHERE r.id = ANY(v_ids)
    ORDER BY r.started_at;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_poll_async_run(INT, INT) TO service_role;

COMMENT ON FUNCTION execution.fn_poll_async_run IS
  'Phase AM: SKIP LOCKED batch-claims pending async runs and bumps '
  'last_polled_at. Concurrent workers do not double-poll. Caller queries '
  'the provider status endpoint and calls fn_complete_async_run on success '
  'or fn_async_run_idempotent_complete to handle retries. service_role only.';

-- ---------------------------------------------------------------------------
-- Idempotent completion wrapper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_async_run_idempotent_complete(
  p_run_id      UUID,
  p_media_url   TEXT,
  p_mime_type   TEXT,
  p_bytes       BIGINT  DEFAULT NULL,
  p_width       INT     DEFAULT NULL,
  p_height      INT     DEFAULT NULL,
  p_duration_s  NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM execution.runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN FALSE;  -- run does not exist
  END IF;

  -- Already terminal — no-op success so the worker can ack.
  IF v_status IN ('succeeded', 'failed', 'canceled', 'timed_out') THEN
    RETURN FALSE;
  END IF;

  PERFORM execution.fn_complete_async_run(
    p_run_id, p_media_url, p_mime_type, p_bytes, p_width, p_height, p_duration_s
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION execution.fn_async_run_idempotent_complete(UUID, TEXT, TEXT, BIGINT, INT, INT, NUMERIC) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION execution.fn_async_run_idempotent_complete(UUID, TEXT, TEXT, BIGINT, INT, INT, NUMERIC) TO service_role;

COMMENT ON FUNCTION execution.fn_async_run_idempotent_complete IS
  'Phase AM: idempotent wrapper around fn_complete_async_run. Returns TRUE '
  'when the run was transitioned, FALSE when the run is already terminal '
  '(no-op) or does not exist. Lets poll workers retry without producing '
  'duplicate media.objects rows.';

-- ---------------------------------------------------------------------------
-- pg_cron schedule for the async poll fallback
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any prior schedule so re-runs of this migration don't double up.
    PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'async-run-poller';

    PERFORM cron.schedule(
      'async-run-poller',
      '*/1 * * * *',  -- every minute; tighter scheduling lives in the worker
      $cron$
        SELECT execution.fn_timeout_stale_runs();
        SELECT count(*) FROM execution.fn_poll_async_run(30, 10);
      $cron$
    );
  END IF;
END $$;
