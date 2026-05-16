-- =============================================================================
-- pgTAP — Phase 55: lenses.workflow_runs state-machine guards
-- =============================================================================
-- Workflow DAG runs use a third status taxonomy: pending → running →
-- completed | failed | cancelled. The "completed" terminal differs from
-- execution.runs' "succeeded" — that's intentional: a workflow can complete
-- with some nodes failed, an execution cannot.
--
-- INSERT happy-paths omitted (FK on workflow_id forces a parent row).
-- =============================================================================
BEGIN;

SELECT plan(10);

-- 1. table present
SELECT has_table('lenses', 'workflow_runs', 'lenses.workflow_runs must exist');

-- 2. status column with default "pending"
SELECT has_column('lenses', 'workflow_runs', 'status', 'status column must exist');
SELECT col_default_is(
  'lenses'::name, 'workflow_runs'::name, 'status'::name, 'pending'::text,
  'workflow_runs.status default must be pending'
);

-- 3. status CHECK constraint exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lenses.workflow_runs'::regclass
      AND conname = 'workflow_runs_status_check'
  ),
  'workflow_runs_status_check constraint must exist'
);

-- 4-6. budget / timestamp invariants
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lenses.workflow_runs'::regclass
      AND conname = 'wf_runs_budget_nonneg'
  ),
  'wf_runs_budget_nonneg constraint must exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lenses.workflow_runs'::regclass
      AND conname = 'wf_runs_spent_nonneg'
  ),
  'wf_runs_spent_nonneg constraint must exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'lenses.workflow_runs'::regclass
      AND conname = 'wf_runs_timestamp_order'
  ),
  'wf_runs_timestamp_order constraint must exist'
);

-- 7. spent_credits default is 0
SELECT col_default_is(
  'lenses'::name, 'workflow_runs'::name, 'spent_credits'::name, 0,
  'workflow_runs.spent_credits default must be 0'
);

-- 8. status CHECK definition covers every state
SELECT ok(
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'lenses.workflow_runs'::regclass
     AND conname = 'workflow_runs_status_check')
  LIKE '%pending%running%completed%failed%cancelled%',
  'workflow_runs_status_check covers every canonical state'
);

-- 9. workflow_node_results table present
SELECT has_table(
  'lenses', 'workflow_node_results',
  'workflow_node_results must exist'
);

SELECT * FROM finish();
ROLLBACK;
