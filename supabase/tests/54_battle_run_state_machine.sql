-- =============================================================================
-- pgTAP — Phase 54: battles.contender_runs state-machine guards
-- =============================================================================
-- Mirrors test 53 for the contender-run lifecycle. Uses British "cancelled"
-- spelling intentionally — pinned so a misguided unification rename can't
-- silently break the battle-worker.
--
-- Happy-path INSERTs are omitted: contender_runs has FK constraints on
-- battle_id / contender_id / run_id that would force seeding three parent
-- rows. The CHECK behaviour is proven by the constraint-definition assertion.
-- =============================================================================
BEGIN;

SELECT plan(9);

-- 1. table present
SELECT has_table('battles', 'contender_runs', 'battles.contender_runs must exist');

-- 2. status column with default "pending"
SELECT has_column('battles', 'contender_runs', 'status', 'status column must exist');
SELECT col_default_is(
  'battles'::name, 'contender_runs'::name, 'status'::name, 'pending'::text,
  'contender_runs.status default must be pending'
);

-- 3. status CHECK constraint exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'battles.contender_runs'::regclass
      AND conname = 'contender_runs_status_check'
  ),
  'contender_runs_status_check constraint must exist'
);

-- 4. ordinal positivity constraint exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'battles.contender_runs'::regclass
      AND conname = 'contender_runs_ordinal_positive'
  ),
  'contender_runs_ordinal_positive constraint must exist'
);

-- 5. "cancelled" (British) is the canonical spelling here
--    (versus "canceled" in execution.runs).
SELECT ok(
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'battles.contender_runs'::regclass
     AND conname = 'contender_runs_status_check') LIKE '%cancelled%',
  'contender_runs.status CHECK accepts "cancelled" (British spelling)'
);

-- 6. ordinal default is 1
SELECT col_default_is(
  'battles'::name, 'contender_runs'::name, 'ordinal'::name, 1,
  'contender_runs.ordinal default must be 1'
);

-- 7. updated_at column exists (used by triggers to track state transitions)
SELECT has_column('battles', 'contender_runs', 'updated_at', 'updated_at column must exist');

-- 8. status CHECK definition covers every documented run state
SELECT ok(
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'battles.contender_runs'::regclass
     AND conname = 'contender_runs_status_check')
  LIKE '%pending%running%succeeded%failed%cancelled%',
  'contender_runs_status_check covers every canonical state'
);

SELECT * FROM finish();
ROLLBACK;
