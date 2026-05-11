-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D7: scheduler dispatcher loop is not indexed on (is_active,
-- last_run_at). The FOR UPDATE SKIP LOCKED scan walks every row at small N,
-- but production schedule counts will grow unboundedly.
--
-- Fix: partial index limited to active schedules ordered by last_run_at.
-- Mirrors the index that lives on lenses.workflow_runs for the claim loop.
--
-- We use a regular CREATE INDEX (not CONCURRENTLY) because supabase migrations
-- run inside a single transaction. Production rollout uses a separate
-- ALTER … CONCURRENTLY out-of-band — operators can replace the call but
-- the index definition is identical.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_active
  ON lenses.workflow_schedules (last_run_at NULLS FIRST, created_at)
  WHERE is_active = true;

COMMENT ON INDEX lenses.idx_workflow_schedules_active IS
  'D7: covers fn_dispatch_scheduled_workflows loop predicate (is_active=true '
  'AND last_run_at < current minute), ordered by created_at for stable lock '
  'order across concurrent dispatchers.';
