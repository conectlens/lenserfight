-- Fix: Workflow Schedule RPCs
-- Removes broken function-name table references and adds slot deduplication.

-- ── Add scheduled_for column to workflow_runs ────────────────────────────────

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- ── Unique index for schedule slot deduplication ─────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_schedule_slot
  ON lenses.workflow_runs (workflow_id, schedule_id, scheduled_for)
  WHERE schedule_id IS NOT NULL AND scheduled_for IS NOT NULL;

-- ── fn_upsert_workflow_schedule ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_schedule(
  p_workflow_id           uuid,
  p_schedule_id           uuid    DEFAULT NULL,
  p_cron_expr             text    DEFAULT '0 * * * *',
  p_timezone              text    DEFAULT 'UTC',
  p_global_model_id       text    DEFAULT NULL,
  p_inputs_template       jsonb   DEFAULT '{}',
  p_is_active             boolean DEFAULT true,
  p_description           text    DEFAULT NULL,
  p_assignee_id           uuid    DEFAULT NULL,
  p_workflow_assignment_id uuid   DEFAULT NULL,
  p_approval_policy       jsonb   DEFAULT '{"requiresApproval": true}',
  p_retry_policy          jsonb   DEFAULT '{"maxRetries": 1}',
  p_failure_policy        jsonb   DEFAULT '{"mode": "isolate"}',
  p_queue_policy          jsonb   DEFAULT '{"mode": "parallel"}'
)
RETURNS SETOF lenses.workflow_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id     uuid;
  v_lenser_id    uuid;
  v_cron_parts   text[];
  v_has_cycle    boolean;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Validate ownership: query the workflow table directly (not via function-name reference)
  SELECT w.lenser_id INTO v_owner_id
    FROM lenses.workflows w
   WHERE w.id = p_workflow_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'workflow_not_found';
  END IF;

  IF v_owner_id <> lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'Workflow not owned by caller';
  END IF;

  -- Validate cron expression — expects exactly 5 fields
  v_cron_parts := regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_cron_parts, 1) IS NULL OR array_length(v_cron_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'Invalid cron expression: must have exactly 5 fields';
  END IF;

  -- Block activation when the workflow has a cycle
  IF p_is_active THEN
    v_has_cycle := lenses.fn_workflow_has_cycle(p_workflow_id);
    IF v_has_cycle THEN
      RAISE EXCEPTION 'Cannot activate schedule for a workflow with cycles';
    END IF;
  END IF;

  -- Upsert the schedule
  IF p_schedule_id IS NOT NULL THEN
    UPDATE lenses.workflow_schedules
       SET cron_expr          = p_cron_expr,
           timezone           = p_timezone,
           global_model_id    = p_global_model_id,
           inputs_template    = p_inputs_template,
           is_active          = p_is_active,
           description        = p_description,
           assignee_id        = p_assignee_id,
           workflow_assignment_id = p_workflow_assignment_id,
           approval_policy    = p_approval_policy,
           retry_policy       = p_retry_policy,
           failure_policy     = p_failure_policy,
           queue_policy       = p_queue_policy,
           updated_at         = now()
     WHERE id = p_schedule_id
       AND workflow_id = p_workflow_id;
  ELSE
    INSERT INTO lenses.workflow_schedules (
      workflow_id, cron_expr, timezone, global_model_id,
      inputs_template, is_active, description, assignee_id,
      workflow_assignment_id, approval_policy, retry_policy,
      failure_policy, queue_policy
    ) VALUES (
      p_workflow_id, p_cron_expr, p_timezone, p_global_model_id,
      p_inputs_template, p_is_active, p_description, p_assignee_id,
      p_workflow_assignment_id, p_approval_policy, p_retry_policy,
      p_failure_policy, p_queue_policy
    );
  END IF;

  -- Return schedules scoped to the authenticated lenser
  RETURN QUERY
    SELECT s.*
      FROM lenses.workflow_schedules s
      JOIN lenses.workflows w ON w.id = s.workflow_id
     WHERE s.workflow_id = p_workflow_id
       AND w.lenser_id = lensers.get_auth_lenser_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule TO authenticated;

-- ── fn_dispatch_scheduled_workflows ──────────────────────────────────────────
-- Uses SKIP LOCKED to prevent double dispatch across concurrent invocations.

CREATE OR REPLACE FUNCTION public.fn_dispatch_scheduled_workflows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_schedule record;
BEGIN
  FOR v_schedule IN
    SELECT s.*
      FROM lenses.workflow_schedules s
     WHERE s.is_active = true
       AND s.next_run_at <= now()
     FOR UPDATE OF s SKIP LOCKED
  LOOP
    -- Dispatch logic (insert into workflow_runs with scheduled_for)
    INSERT INTO lenses.workflow_runs (
      workflow_id, schedule_id, scheduled_for, status
    ) VALUES (
      v_schedule.workflow_id, v_schedule.id, v_schedule.next_run_at, 'queued'
    );

    -- Advance next_run_at
    UPDATE lenses.workflow_schedules
       SET next_run_at = now() + interval '1 hour',
           last_run_at = now()
     WHERE id = v_schedule.id;
  END LOOP;
END;
$$;

-- ── fn_get_workflow_schedules ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_workflow_schedules(
  p_workflow_id uuid DEFAULT NULL
)
RETURNS SETOF lenses.workflow_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT s.*
      FROM lenses.workflow_schedules s
      JOIN lenses.workflows w ON w.id = s.workflow_id
     WHERE (p_workflow_id IS NULL OR s.workflow_id = p_workflow_id)
       AND w.lenser_id = lensers.get_auth_lenser_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_workflow_schedules TO authenticated;
