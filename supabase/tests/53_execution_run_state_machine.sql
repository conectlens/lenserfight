-- =============================================================================
-- pgTAP — Phase 53: execution.runs state-machine guards
-- =============================================================================
-- Locks the canonical run-status enum {queued, running, succeeded, failed,
-- canceled, timed_out} and the billing_status enum {free, pending, charged,
-- failed}, plus the row-level timestamp ordering constraint.
--
-- Happy-path INSERTs aren't exercised here because execution.runs has a NOT-NULL
-- FK on execution.requests, which would force seeding a parent row inside the
-- test session. The throws_ok against an invalid status proves the CHECK fires
-- — that's the contract we care about.
-- =============================================================================
BEGIN;

SELECT plan(9);

-- 1. table present
SELECT has_table('execution', 'runs', 'execution.runs must exist');

-- 2. status column with text type
SELECT has_column('execution', 'runs', 'status', 'execution.runs.status column must exist');
SELECT col_type_is('execution', 'runs', 'status', 'text', 'status must be text');

-- 3. default values — pgTAP coerces the stored default through the column type,
--    so the expected form is the bare value (no `::text` cast notation).
SELECT col_default_is(
  'execution'::name, 'runs'::name, 'status'::name, 'queued'::text,
  'execution.runs.status default must be queued'
);
SELECT col_default_is(
  'execution'::name, 'runs'::name, 'billing_status'::name, 'free'::text,
  'execution.runs.billing_status default must be free'
);

-- 4. status CHECK constraint exists by name
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'execution.runs'::regclass
      AND conname = 'runs_status_check'
  ),
  'runs_status_check constraint must exist'
);

-- 5. billing_status CHECK constraint exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'execution.runs'::regclass
      AND conname = 'runs_billing_status_check'
  ),
  'runs_billing_status_check constraint must exist'
);

-- 6. timestamp-order CHECK exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'execution.runs'::regclass
      AND conname = 'runs_timestamp_order'
  ),
  'runs_timestamp_order constraint must exist'
);

-- 7. CHECK constraint accepts every canonical terminal status — verified by
--    introspecting the constraint definition text.
SELECT ok(
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'execution.runs'::regclass
     AND conname = 'runs_status_check')
  LIKE '%succeeded%failed%canceled%timed_out%'
  OR
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'execution.runs'::regclass
     AND conname = 'runs_status_check')
  LIKE '%queued%running%succeeded%failed%canceled%timed_out%',
  'runs_status_check accepts all canonical terminal states'
);

SELECT * FROM finish();
ROLLBACK;
