-- =============================================================================
-- Phase 0 — Foundation: async polling support
-- =============================================================================
-- Adds the missing column the AM async-media-poll-worker depends on for
-- FOR UPDATE SKIP LOCKED ordering. Existing fn_poll_async_run already returns
-- claimable rows; this migration only adds the timestamp + supporting index.
-- =============================================================================

ALTER TABLE execution.runs
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;

COMMENT ON COLUMN execution.runs.last_polled_at IS
  'Set by the async-media-poll-worker each time the provider status endpoint '
  'is queried. NULL means the run has not been polled yet. Used for SKIP '
  'LOCKED ordering so concurrent workers do not double-poll the same run.';

-- Composite index supporting the poll query:
--   WHERE is_async = TRUE AND status = 'running'
--   ORDER BY last_polled_at NULLS FIRST
CREATE INDEX IF NOT EXISTS idx_execution_runs_async_poll_order
  ON execution.runs (is_async, status, last_polled_at NULLS FIRST)
  WHERE is_async = TRUE AND status = 'running';
