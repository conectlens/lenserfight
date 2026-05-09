-- Phase 2: Schedule approval gate enforcement
--
-- 1. Creates public.fn_dispatch_scheduled_workflows_with_approval() — a
--    policy-enforcing wrapper around lenses.fn_dispatch_scheduled_workflows().
--    pg_cron is re-registered to call this wrapper so all future autonomous
--    dispatches pass through the approval and system-flag gates.
--
-- 2. Adds a safety guard in fn_upsert_workflow_schedule: activating a schedule
--    with requiresApproval=false is blocked when the workflow owner has no
--    spending limit (spending_limit_credits IS NULL), preventing unbounded
--    autonomous spend.

-- ── Add description column to workflow_schedules (if not already present) ───

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS description text;

-- ── Create lenses.fn_upsert_workflow_schedule_internal ──────────────────────
-- This is the canonical upsert implementation that performs the actual DML.
-- The public.fn_upsert_workflow_schedule wrapper adds policy enforcement
-- (approval/spending-limit guard) and then delegates here.

CREATE OR REPLACE FUNCTION lenses.fn_upsert_workflow_schedule_internal(
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
SET search_path TO 'lenses', 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  IF p_schedule_id IS NULL THEN
    INSERT INTO lenses.workflow_schedules (
      workflow_id,
      cron_expr,
      timezone,
      description,
      global_model_id,
      inputs_template,
      is_active,
      assignee_id,
      workflow_assignment_id,
      approval_policy,
      retry_policy,
      failure_policy,
      queue_policy
    ) VALUES (
      p_workflow_id,
      p_cron_expr,
      COALESCE(NULLIF(trim(p_timezone), ''), 'UTC'),
      p_description,
      p_global_model_id,
      COALESCE(p_inputs_template, '{}'::jsonb),
      p_is_active,
      p_assignee_id,
      p_workflow_assignment_id,
      COALESCE(p_approval_policy, '{"requiresApproval":true}'::jsonb),
      COALESCE(p_retry_policy, '{"maxRetries":1}'::jsonb),
      COALESCE(p_failure_policy, '{"mode":"isolate"}'::jsonb),
      COALESCE(p_queue_policy, '{"mode":"parallel"}'::jsonb)
    )
    RETURNING workflow_schedules.id INTO v_schedule_id;
  ELSE
    UPDATE lenses.workflow_schedules s
    SET
      cron_expr              = p_cron_expr,
      timezone               = COALESCE(NULLIF(trim(p_timezone), ''), s.timezone, 'UTC'),
      description            = COALESCE(p_description, s.description),
      global_model_id        = p_global_model_id,
      inputs_template        = COALESCE(p_inputs_template, '{}'::jsonb),
      is_active              = p_is_active,
      assignee_id            = p_assignee_id,
      workflow_assignment_id = p_workflow_assignment_id,
      approval_policy        = COALESCE(p_approval_policy, s.approval_policy, '{}'::jsonb),
      retry_policy           = COALESCE(p_retry_policy, s.retry_policy, '{}'::jsonb),
      failure_policy         = COALESCE(p_failure_policy, s.failure_policy, '{}'::jsonb),
      queue_policy           = COALESCE(p_queue_policy, s.queue_policy, '{}'::jsonb),
      last_dispatch_status   = CASE
        WHEN p_is_active THEN NULL
        ELSE COALESCE(s.last_dispatch_status, 'paused')
      END,
      last_error_at          = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_at
      END,
      last_error_message     = CASE
        WHEN p_is_active THEN NULL
        ELSE s.last_error_message
      END
    WHERE s.id = p_schedule_id
      AND s.workflow_id = p_workflow_id
    RETURNING s.id INTO v_schedule_id;

    IF v_schedule_id IS NULL THEN
      RAISE EXCEPTION 'Schedule not found or not owned by the active workspace'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workflow_id,
    s.cron_expr,
    s.timezone,
    s.description,
    s.is_active,
    s.assignee_type,
    s.assignee_id,
    s.workflow_assignment_id,
    s.approval_policy,
    s.retry_policy,
    s.failure_policy,
    s.queue_policy,
    s.inputs_template,
    s.global_model_id,
    s.next_run_at,
    s.last_run_at,
    s.last_run_id,
    s.last_dispatch_status,
    s.last_error_at,
    s.last_error_message,
    s.last_completed_at,
    s.last_result,
    s.created_at
  FROM lenses.workflow_schedules s
  WHERE s.id = v_schedule_id;
END;
$$;

ALTER FUNCTION lenses.fn_upsert_workflow_schedule_internal(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION lenses.fn_upsert_workflow_schedule_internal(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb)
  TO service_role;

-- ── Drop old public.fn_upsert_workflow_schedule (return type changed) ────────
-- PostgreSQL does not allow CREATE OR REPLACE when the RETURNS TABLE column
-- list differs from the existing definition. Drop it first so the replacement
-- below can be created cleanly.

DROP FUNCTION IF EXISTS public.fn_upsert_workflow_schedule(uuid, uuid, text, text, text, jsonb, boolean, text, uuid, uuid, jsonb, jsonb, jsonb, jsonb);

-- ── Safety guard: block unlimited-spend schedules with no approval ──────────

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
      SELECT pol.spending_limit_credits INTO v_spending_limit
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
    END IF;
  END IF;

  -- Delegate to the existing upsert implementation in the lenses schema.
  -- The original function was defined in 20260501025000 and updated by
  -- 20260501030000. We call it as a superuser via SECURITY DEFINER and
  -- return its result set unchanged.
  RETURN QUERY
  SELECT * FROM lenses.fn_upsert_workflow_schedule_internal(
    p_workflow_id, p_schedule_id, p_cron_expr, p_timezone, p_description,
    p_approval_policy, p_is_active, p_global_model_id, p_assignee_id,
    p_workflow_assignment_id, p_retry_policy, p_failure_policy,
    p_queue_policy, p_inputs_template
  );
END;
$$;

-- ── Approval-aware pg_cron wrapper ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_dispatch_scheduled_workflows_with_approval()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'platform', 'public'
AS $$
DECLARE
  v_dispatch_enabled boolean;
  v_result           integer;
BEGIN
  -- Check platform-level autonomy kill switch (populated by Phase 2.9 migration).
  -- If the table or row does not yet exist, default to enabled.
  BEGIN
    SELECT (value::boolean) INTO v_dispatch_enabled
    FROM platform.system_flags
    WHERE key = 'autonomy_dispatch_enabled';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_dispatch_enabled := true;
  END;

  IF v_dispatch_enabled IS NOT DISTINCT FROM false THEN
    RAISE NOTICE 'Autonomous dispatch is disabled (platform.system_flags.autonomy_dispatch_enabled=false). Skipping.';
    RETURN 0;
  END IF;

  -- requiresApproval=false AND spending_limit_credits IS NULL guard:
  -- Log a warning for any schedule that bypasses approval without a spending cap.
  -- The UPSERT guard above should prevent these from being created, but we
  -- audit here as a belt-and-suspenders check.
  PERFORM 1
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  JOIN agents.ai_lensers al ON al.profile_id = w.lenser_id
  JOIN agents.policies pol ON pol.id = al.policy_id
  WHERE s.is_active = true
    AND COALESCE((s.approval_policy->>'requiresApproval')::boolean, true) = false
    AND pol.spending_limit_credits IS NULL;

  IF FOUND THEN
    RAISE WARNING
      'One or more active schedules have requiresApproval=false and no spending_limit_credits. '
      'These schedules will dispatch without approval gates and without a cost ceiling. '
      'Set a spending limit or re-enable approval to suppress this warning.';
  END IF;

  -- Delegate to the existing approval-aware dispatcher (lenses schema).
  SELECT lenses.fn_dispatch_scheduled_workflows() INTO v_result;
  RETURN COALESCE(v_result, 0);
END;
$$;

ALTER FUNCTION public.fn_dispatch_scheduled_workflows_with_approval() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_dispatch_scheduled_workflows_with_approval()
  TO service_role;

COMMENT ON FUNCTION public.fn_dispatch_scheduled_workflows_with_approval() IS
  'Phase 2 pg_cron target. Wraps lenses.fn_dispatch_scheduled_workflows() with a '
  'platform-level autonomy kill switch check and an approval/spending-limit audit warning. '
  'The kill switch is controlled via platform.system_flags.autonomy_dispatch_enabled.';

-- ── Re-register pg_cron to call the approval-aware wrapper ─────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-workflows') THEN
    PERFORM cron.unschedule('dispatch-scheduled-workflows');
  END IF;

  PERFORM cron.schedule(
    'dispatch-scheduled-workflows',
    '*/1 * * * *',
    'SELECT public.fn_dispatch_scheduled_workflows_with_approval()'
  );
END;
$$;
