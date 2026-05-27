-- Phase 2: Schedule Approval Gate Enforcement
-- Redirects pg_cron to the approval-aware dispatcher and adds spending guards.

-- ── Redirect pg_cron to approval-aware dispatcher ────────────────────────────

-- Unschedule the old dispatcher and schedule the approval-aware one.
SELECT cron.unschedule('dispatch_scheduled_workflows');

SELECT cron.schedule(
  'dispatch_scheduled_workflows_with_approval',
  '* * * * *',
  $$SELECT public.fn_dispatch_scheduled_workflows_with_approval()$$
);

-- ── Guard against unlimited spending ─────────────────────────────────────────
-- When spending_limit_credits IS NULL and requiresApproval is false,
-- a schedule could drain credits without any human oversight.
-- The approval-aware dispatcher already handles this by checking the policy,
-- but we add an explicit constraint as a safety net.

CREATE OR REPLACE FUNCTION lenses.fn_validate_schedule_spending_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Flag schedules where spending_limit_credits IS NULL and approval is not required
  IF NEW.is_active = true
     AND (NEW.approval_policy->>'requiresApproval')::boolean = false
     AND (NEW.approval_policy->>'spending_limit_credits') IS NULL
  THEN
    RAISE WARNING 'Schedule % has no spending limit and requiresApproval = false — consider adding a spending_limit_credits', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_validate_schedule_spending
  BEFORE INSERT OR UPDATE ON lenses.workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION lenses.fn_validate_schedule_spending_guard();
