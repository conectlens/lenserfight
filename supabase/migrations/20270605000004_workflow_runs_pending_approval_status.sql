-- =============================================================================
-- Fix: workflow_runs_status_check rejects 'pending_approval'
-- =============================================================================
-- fn_dispatch_scheduled_workflows() (20270601000015_schedule_policy_enforce.sql)
-- inserts lenses.workflow_runs with status = 'pending_approval' whenever a
-- schedule's approval_policy.requiresApproval is true and no assignee is set.
-- The workflow_runs_status_check constraint was never updated to allow that
-- value, so every such dispatch fails with a check_violation and the schedule
-- records last_dispatch_status = 'dispatch_failed'. Add the missing state.
-- =============================================================================
BEGIN;

ALTER TABLE "lenses"."workflow_runs" DROP CONSTRAINT "workflow_runs_status_check";

ALTER TABLE "lenses"."workflow_runs" ADD CONSTRAINT "workflow_runs_status_check" CHECK (("status" = ANY (ARRAY[
  'draft'::"text",
  'validated'::"text",
  'queued'::"text",
  'pending'::"text",
  'pending_approval'::"text",
  'running'::"text",
  'streaming'::"text",
  'recovered'::"text",
  'completed'::"text",
  'failed'::"text",
  'cancelled'::"text",
  'timed_out'::"text"
])));

COMMENT ON CONSTRAINT "workflow_runs_status_check" ON "lenses"."workflow_runs" IS 'Aligns with the engine state machine (Phase 1 §5). `recovered` is a transient status written by the crash-recovery loop before the run resumes. `pending_approval` is written by fn_dispatch_scheduled_workflows when a schedule''s approval_policy.requiresApproval gates dispatch. Terminal states: completed, failed, cancelled, timed_out.';

COMMIT;
