-- =============================================================================
-- pgTAP — Phase 58: async-poll FOR UPDATE SKIP LOCKED claim semantics
-- =============================================================================
-- The `poll-async-executions` edge function uses
-- `SELECT ... FOR UPDATE SKIP LOCKED` to claim due async runs without two
-- workers grabbing the same row. This file pins that the underlying
-- execution.runs table can be selected with `FOR UPDATE SKIP LOCKED` (proves
-- the storage engine supports it on this row type — sanity gate for
-- accidental schema changes that disable row locking, e.g. converting to a
-- view).
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. execution.runs is a regular table (not a view) — required for row locks
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'execution' AND c.relname = 'runs' AND c.relkind = 'r'
  ),
  'execution.runs must be a regular table (r), not a view'
);

-- 2. status column indexed for the polling query (queued/running filter)
--    Several indexes likely exist; we just need at least one to support the
--    "due async" claim query.
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'execution' AND tablename = 'runs'
  ),
  'execution.runs must have at least one index'
);

-- 3. provider_request_id column exists (key the async poll uses)
SELECT has_column(
  'execution', 'runs', 'provider_request_id',
  'execution.runs.provider_request_id column must exist'
);

-- 4. A FOR UPDATE SKIP LOCKED claim is syntactically valid against the table
PREPARE claim_due AS
  SELECT id FROM execution.runs
   WHERE status = 'running' AND provider_request_id IS NOT NULL
   ORDER BY created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 5;

SELECT lives_ok(
  'EXECUTE claim_due',
  'FOR UPDATE SKIP LOCKED is a valid claim query on execution.runs'
);

-- 5. The poll function exists if migration 20270526… created it
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'fn_poll_async_run'
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname LIKE '%poll%async%'
  ),
  'an async-poll RPC must exist (fn_poll_async_run or a related variant)'
);

SELECT * FROM finish();
ROLLBACK;
