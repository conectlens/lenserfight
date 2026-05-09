-- Phase G: Approval bypass audit log
--
-- When an operator activates a schedule with requiresApproval=false (and the
-- spending-limit guard allows it), insert a row into agents.action_logs so
-- operators can query which agents are running without human approval gates.
--
-- Changes:
--   1. Extend agents.action_logs_type_check to allow 'approval_bypass_attempted'
--   2. Replace public.fn_upsert_workflow_schedule with a version that logs the
--      bypass when requiresApproval=false + is_active=true.

-- ── 1. Extend constraint ─────────────────────────────────────────────────────

ALTER TABLE agents.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check,
  ADD CONSTRAINT action_logs_type_check CHECK (
    action_type = ANY (ARRAY[
      'join_battle', 'cast_vote', 'submit_entry', 'create_battle', 'spend_credits',
      'dispatch_schedule', 'schedule_skipped', 'policy_updated',
      'run_lens', 'run_workflow', 'pause_schedule', 'resume_schedule',
      'binding_updated', 'approval_bypass_attempted'
    ])
  );

-- ── 2. Replace fn_upsert_workflow_schedule ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id            uuid,
  p_schedule_id            uuid    DEFAULT NULL,
  p_cron_expr              text    DEFAULT '* * * * *',
  p_timezone               text    DEFAULT 'UTC',
  p_description            text    DEFAULT NULL,
  p_approval_policy        jsonb   DEFAULT '{"requiresApproval":true}'::jsonb,
  p_is_active              boolean DEFAULT true,
  p_global_model_id        text    DEFAULT NULL,
  p_assignee_id            uuid    DEFAULT NULL,
  p_workflow_assignment_id uuid    DEFAULT NULL,
  p_retry_policy           jsonb   DEFAULT '{"maxRetries":1}'::jsonb,
  p_failure_policy         jsonb   DEFAULT '{"mode":"isolate"}'::jsonb,
  p_queue_policy           jsonb   DEFAULT '{"mode":"parallel"}'::jsonb,
  p_inputs_template        jsonb   DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id                       uuid,
  workflow_id              uuid,
  cron_expr                text,
  timezone                 text,
  description              text,
  is_active                boolean,
  assignee_type            text,
  assignee_id              uuid,
  workflow_assignment_id   uuid,
  approval_policy          jsonb,
  retry_policy             jsonb,
  failure_policy           jsonb,
  queue_policy             jsonb,
  inputs_template          jsonb,
  global_model_id          text,
  next_run_at              timestamptz,
  last_run_at              timestamptz,
  last_run_id              uuid,
  last_dispatch_status     text,
  last_error_at            timestamptz,
  last_error_message       text,
  last_completed_at        timestamptz,
  last_result              jsonb,
  created_at               timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'public'
AS $$
DECLARE
  v_owner_id          uuid;
  v_ai_lenser_id      uuid;
  v_parts             text[];
  v_requires_approval boolean;
  v_spending_limit    numeric;
BEGIN
  -- Owner check
  SELECT w.lenser_id INTO v_owner_id
  FROM lenses.workflows w
  WHERE w.id = p_workflow_id;

  IF v_owner_id IS NULL OR v_owner_id <> lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'not the owner of workflow %', p_workflow_id
      USING ERRCODE = '42501';
  END IF;

  -- CRON expression validation
  v_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'Invalid CRON expression "%" — expected 5 fields', p_cron_expr
      USING ERRCODE = '22023';
  END IF;

  -- Cycle detection (cannot activate a cyclic workflow)
  IF p_is_active AND lenses.fn_workflow_has_cycle(p_workflow_id) THEN
    RAISE EXCEPTION 'Cannot activate schedule for a workflow with cycles'
      USING ERRCODE = '22023', DETAIL = 'cycle_detected';
  END IF;

  -- Safety guard: reject activation when requiresApproval=false AND no spending limit
  IF p_is_active THEN
    v_requires_approval := COALESCE(
      (p_approval_policy->>'requiresApproval')::boolean,
      true
    );

    IF NOT v_requires_approval THEN
      SELECT al.id, pol.spending_limit_credits
        INTO v_ai_lenser_id, v_spending_limit
      FROM agents.ai_lensers al
      JOIN agents.policies pol ON pol.id = al.policy_id
      WHERE al.profile_id = v_owner_id
      LIMIT 1;

      IF v_spending_limit IS NULL THEN
        RAISE EXCEPTION
          'Cannot activate a schedule with requiresApproval=false and no spending_limit_credits. '
          'Set a spending limit on the agent policy before disabling approval gates.'
          USING ERRCODE = '23514';
      END IF;

      -- Audit: operator intentionally bypassed approval requirement (spending limit allows it).
      IF v_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
        VALUES (
          v_ai_lenser_id,
          'approval_bypass_attempted',
          'recorded',
          jsonb_build_object(
            'workflow_id',    p_workflow_id,
            'schedule_id',    p_schedule_id,
            'actor_lenser_id', v_owner_id,
            'spending_limit', v_spending_limit
          )
        );
      END IF;
    END IF;
  END IF;

  -- Delegate to the existing upsert implementation in the lenses schema.
  RETURN QUERY
  SELECT * FROM lenses.fn_upsert_workflow_schedule_internal(
    p_workflow_id, p_schedule_id, p_cron_expr, p_timezone, p_description,
    p_approval_policy, p_is_active, p_global_model_id, p_assignee_id,
    p_workflow_assignment_id, p_retry_policy, p_failure_policy,
    p_queue_policy, p_inputs_template
  );
END;
$$;

ALTER FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb)
  TO authenticated, service_role;
