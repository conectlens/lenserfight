-- Emergency Stop / Execution Control Infrastructure
--
-- Closes the gap between the existing per-target kill switch (admin.kill_switches,
-- 20270513000000_phase_ae_platform_kill_switch.sql) and a true operational
-- emergency-stop: mass cancellation, queue freeze, global health dashboard,
-- and kill-switch enforcement at the worker claim/dispatch entry points.
--
-- New objects:
--   A. admin.execution_control              — singleton queue-freeze toggle
--   B. fn_queue_freeze / fn_queue_unfreeze  — admin queue freeze primitives
--   C. fn_cancel_all_active_runs            — atomic mass-cancel (CTE pattern)
--   D. fn_emergency_stop                    — activate kill switch + optional force-cancel
--   E. fn_get_execution_status              — global health dashboard RPC
--   F. lenses.fn_claim_scheduled_workflow_run  — patched: kill-switch guard added
--   G. lenses.fn_dispatch_scheduled_workflows  — patched: kill-switch + queue-freeze guard
--   H. battles.fn_claim_battle_execution_job   — patched: kill-switch guard added

-- ─── A. admin.execution_control singleton ───────────────────────────────────
-- Separate from admin.kill_switches: this tracks the queue-freeze toggle without
-- requiring a full kill-switch activation. One row, always id=1.

CREATE TABLE IF NOT EXISTS admin.execution_control (
  id            INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  queue_frozen  BOOLEAN     NOT NULL DEFAULT false,
  frozen_reason TEXT,
  frozen_by     UUID        REFERENCES lensers.profiles(id) ON DELETE SET NULL,
  frozen_at     TIMESTAMPTZ
);

INSERT INTO admin.execution_control (id) VALUES (1) ON CONFLICT DO NOTHING;

COMMENT ON TABLE admin.execution_control IS
  'Singleton row (id=1) tracking the platform queue-freeze toggle. '
  'queue_frozen=true halts fn_dispatch_scheduled_workflows without cancelling '
  'in-flight runs. Managed via fn_queue_freeze / fn_queue_unfreeze RPCs only.';

ALTER TABLE admin.execution_control ENABLE ROW LEVEL SECURITY;
-- No RLS policies — all access via SECURITY DEFINER RPCs only.
GRANT SELECT ON admin.execution_control TO service_role;

-- ─── B. fn_queue_freeze / fn_queue_unfreeze ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_queue_freeze(p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'queue_freeze_forbidden: admin role required';
  END IF;

  SELECT id INTO v_profile_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;

  UPDATE admin.execution_control
  SET    queue_frozen  = true,
         frozen_reason = p_reason,
         frozen_by     = v_profile_id,
         frozen_at     = now()
  WHERE  id = 1;

  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'queue.frozen',
    'lenser',
    v_profile_id,
    'warn',
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_queue_freeze(TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_queue_freeze(TEXT) IS
  'Admin-only: freeze the scheduled-workflow dispatch queue. '
  'Prevents fn_dispatch_scheduled_workflows from enqueuing new runs '
  'without cancelling runs already in flight. Resume with fn_queue_unfreeze.';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_queue_unfreeze()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'queue_unfreeze_forbidden: admin role required';
  END IF;

  SELECT id INTO v_profile_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;

  UPDATE admin.execution_control
  SET    queue_frozen  = false,
         frozen_reason = NULL,
         frozen_by     = NULL,
         frozen_at     = NULL
  WHERE  id = 1;

  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'queue.unfrozen',
    'lenser',
    v_profile_id,
    'info',
    jsonb_build_object('resumed_by', v_profile_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_queue_unfreeze() TO authenticated;

COMMENT ON FUNCTION public.fn_queue_unfreeze() IS
  'Admin-only: resume the scheduled-workflow dispatch queue after a freeze.';

-- ─── C. fn_cancel_all_active_runs ───────────────────────────────────────────
-- Atomically cancels ALL active workflow runs (running/streaming/recovered/
-- queued/pending) plus all active battle execution jobs, in a single transaction.
-- Uses a CTE to cascade run cancellation to node results without a time-window race.

CREATE OR REPLACE FUNCTION public.fn_cancel_all_active_runs(p_reason TEXT)
RETURNS TABLE (cancelled_run_count INT, cancelled_job_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, battles, public, lensers
AS $$
DECLARE
  v_profile_id UUID;
  v_run_count  INT;
  v_job_count  INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'cancel_all_active_runs_forbidden: admin role required';
  END IF;

  SELECT id INTO v_profile_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;

  -- 1. Cancel all active / queued workflow runs and cascade to node results in
  --    one atomic CTE. The RETURNING ids are used directly in the cascade UPDATE
  --    to avoid any time-window ambiguity.
  WITH cancelled_runs AS (
    UPDATE lenses.workflow_runs
    SET    status       = 'cancelled',
           completed_at = COALESCE(completed_at, now())
    WHERE  status IN ('running', 'streaming', 'recovered', 'queued', 'pending')
    RETURNING id
  ),
  node_cascade AS (
    UPDATE lenses.workflow_node_results nr
    SET    status        = 'cancelled',
           completed_at  = COALESCE(nr.completed_at, now()),
           error_message = COALESCE(nr.error_message, p_reason)
    FROM   cancelled_runs cr
    WHERE  nr.run_id = cr.id
      AND  nr.status NOT IN (
             'completed', 'failed', 'cancelled',
             'timed_out', 'skipped', 'blocked', 'invalidated'
           )
    RETURNING 1
  )
  SELECT COUNT(DISTINCT cr.id)::INT INTO v_run_count
  FROM   cancelled_runs cr;

  -- 2. Cancel all active / queued battle execution jobs.
  WITH cancelled_jobs AS (
    UPDATE battles.battle_execution_jobs
    SET    status       = 'failed',
           completed_at = now(),
           error_message = COALESCE(error_message, p_reason)
    WHERE  status IN ('queued', 'claimed', 'running')
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_job_count FROM cancelled_jobs;

  -- 3. Audit trail.
  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'emergency.cancel_all',
    'lenser',
    v_profile_id,
    'warn',
    jsonb_build_object(
      'reason',          p_reason,
      'cancelled_runs',  v_run_count,
      'cancelled_jobs',  v_job_count
    )
  );

  RETURN QUERY SELECT v_run_count, v_job_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_all_active_runs(TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_cancel_all_active_runs(TEXT) IS
  'Admin-only: atomically cancel ALL active workflow runs (and their node results) '
  'plus all active battle execution jobs. Returns (cancelled_run_count, cancelled_job_count). '
  'Uses a CTE to keep run and node-result cancellation in one transaction.';

-- ─── D. fn_emergency_stop ───────────────────────────────────────────────────
-- Thin orchestrator: activates the system kill switch and, when force_mode=true,
-- calls fn_cancel_all_active_runs. All heavy lifting delegated to existing
-- primitives; no double-auditing.

CREATE OR REPLACE FUNCTION public.fn_emergency_stop(
  p_reason     TEXT,
  p_force_mode BOOLEAN DEFAULT false
)
RETURNS TABLE (switch_id UUID, cancelled_runs INT, cancelled_jobs INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
DECLARE
  v_switch_id UUID;
  v_run_count INT := 0;
  v_job_count INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'emergency_stop_forbidden: admin role required';
  END IF;

  -- Activate a system-wide kill switch. fn_kill_switch_activate is SECURITY DEFINER
  -- and checks is_admin() internally; it also writes its own audit.events row.
  v_switch_id := public.fn_kill_switch_activate('system', NULL, p_reason, NULL);

  -- Optional: mass-cancel all in-flight runs and jobs.
  IF p_force_mode THEN
    SELECT c.cancelled_run_count, c.cancelled_job_count
    INTO   v_run_count, v_job_count
    FROM   public.fn_cancel_all_active_runs(p_reason) c;
  END IF;

  RETURN QUERY SELECT v_switch_id, v_run_count, v_job_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_emergency_stop(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.fn_emergency_stop(TEXT, BOOLEAN) IS
  'Admin-only emergency stop. Activates a system-wide kill switch that blocks all '
  'worker claim and schedule dispatch calls. When force_mode=true, also calls '
  'fn_cancel_all_active_runs to cancel in-flight runs and battle jobs immediately. '
  'Returns (switch_id, cancelled_runs, cancelled_jobs).';

-- ─── E. fn_get_execution_status ─────────────────────────────────────────────
-- Read-only global health dashboard. Granted to authenticated so the frontend
-- banner renders for all logged-in users, not just admins.
-- STABLE: no writes; safe inside read-only transactions.

CREATE OR REPLACE FUNCTION public.fn_get_execution_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, platform, lenses, battles, public
AS $$
  SELECT jsonb_build_object(
    'system_kill_switch_active',
      public.fn_kill_switch_active('system'),
    'queue_frozen',
      (SELECT queue_frozen  FROM admin.execution_control WHERE id = 1),
    'frozen_reason',
      (SELECT frozen_reason FROM admin.execution_control WHERE id = 1),
    'active_run_count',
      (SELECT COUNT(*) FROM lenses.workflow_runs
       WHERE status IN ('running', 'streaming', 'recovered')),
    'queued_run_count',
      (SELECT COUNT(*) FROM lenses.workflow_runs
       WHERE status IN ('queued', 'pending')),
    'active_battle_job_count',
      (SELECT COUNT(*) FROM battles.battle_execution_jobs
       WHERE status IN ('claimed', 'running')),
    'queued_battle_job_count',
      (SELECT COUNT(*) FROM battles.battle_execution_jobs
       WHERE status = 'queued'),
    'active_worker_count',
      (SELECT COUNT(*) FROM platform.api_worker_heartbeats
       WHERE last_seen_at >= now() - interval '2 minutes'),
    'stale_worker_count',
      (SELECT COUNT(*) FROM platform.api_worker_heartbeats
       WHERE last_seen_at < now() - interval '2 minutes'),
    'dlq_workflow_count',
      (SELECT COUNT(*) FROM lenses.workflow_run_dead_letters
       WHERE resolved_at IS NULL),
    'dlq_battle_count',
      (SELECT COUNT(*) FROM battles.battle_execution_dead_letters
       WHERE resolved_at IS NULL)
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_execution_status() TO authenticated;

COMMENT ON FUNCTION public.fn_get_execution_status() IS
  'Global execution health dashboard. Returns system_kill_switch_active, '
  'queue_frozen, active/queued run/job counts, worker health, and DLQ depths. '
  'Granted to authenticated (not admin-only) so frontend banners work for all users.';

-- ─── F. Patch lenses.fn_claim_scheduled_workflow_run ────────────────────────
-- Full re-statement of 20270520000000_phase_aj_fn_build_lenser_prompt_context.sql
-- (which already extended the Phase 24 original with ai_lenser_id).
-- Single addition here: kill-switch guard at top of function body.
-- DROP required because Postgres disallows CREATE OR REPLACE when return type
-- was previously extended (ai_lenser_id UUID added by phase AJ migration).

DROP FUNCTION IF EXISTS lenses.fn_claim_scheduled_workflow_run(TEXT);
CREATE OR REPLACE FUNCTION lenses.fn_claim_scheduled_workflow_run(p_worker_id TEXT)
RETURNS TABLE (
  run_id          UUID,
  workflow_id     UUID,
  schedule_id     UUID,
  triggered_by    UUID,
  context_inputs  JSONB,
  global_model_id TEXT,
  ai_lenser_id    UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_run lenses.workflow_runs;
BEGIN
  -- GUARD: system kill switch blocks all scheduled-run claims immediately.
  IF public.fn_kill_switch_active('system') THEN
    RETURN;  -- empty result set — worker backs off silently
  END IF;

  SELECT *
  INTO   v_run
  FROM   lenses.workflow_runs
  WHERE  status = 'pending'
    AND  trigger_mode = 'schedule'
  ORDER BY created_at ASC
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE lenses.workflow_runs
  SET    status     = 'running',
         started_at = COALESCE(started_at, now())
  WHERE  id = v_run.id;

  RETURN QUERY
  SELECT
    v_run.id,
    v_run.workflow_id,
    v_run.schedule_id,
    v_run.triggered_by,
    v_run.context_inputs,
    v_run.global_model_id,
    v_run.ai_lenser_id;
END;
$$;

REVOKE ALL ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) TO service_role;

COMMENT ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) IS
  'Phase 24-A + Emergency Stop: atomically claims the next pending scheduled '
  'workflow run. Returns empty result set when the system kill switch is active, '
  'causing workers to back off without processing.';

-- ─── G. Patch lenses.fn_dispatch_scheduled_workflows ────────────────────────
-- Full re-statement of the Phase-W canonical version
-- (20270415000000_phase_w_schedule_calendars.sql).
-- Two guards added at the top of the function body:
--   1. System kill switch → return 0 immediately.
--   2. Queue frozen       → return 0 immediately.
-- admin.execution_control is referenced fully-qualified to avoid needing
-- to add 'admin' to the existing search_path.

CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'automation', 'public'
AS $$
DECLARE
  v_now                    timestamptz := now();
  v_scheduled_for          timestamptz := date_trunc('minute', v_now);
  v_schedule               RECORD;
  v_run_id                 uuid;
  v_team_run_id            uuid;
  v_ai_lenser_id           uuid;
  v_assignee_ai_lenser_id  uuid;
  v_log_ai_lenser_id       uuid;
  v_requires_approval      boolean;
  v_team_run_status        text;
  v_approval_status        text;
  v_dispatched             integer := 0;
  -- budget enforcement
  v_spending_limit         numeric;
  v_budget_enforce         boolean;
  v_credits_used           numeric;
  -- Phase W
  v_condition_ctx          jsonb;
  v_condition_pass         boolean;
  v_rotation_len           integer;
  v_rotation_idx           integer;
  v_inputs                 jsonb;
BEGIN
  -- GUARD 1: system kill switch — halt all dispatch immediately.
  IF public.fn_kill_switch_active('system') THEN
    RETURN 0;
  END IF;

  -- GUARD 2: queue frozen — halt dispatch without cancelling in-flight runs.
  IF (SELECT queue_frozen FROM admin.execution_control WHERE id = 1) THEN
    RETURN 0;
  END IF;

  FOR v_schedule IN
    SELECT
      s.id,
      s.workflow_id,
      s.cron_expr,
      s.global_model_id,
      s.inputs_template,
      s.is_active,
      s.last_run_at,
      s.assignee_type,
      s.assignee_id,
      s.workflow_assignment_id,
      s.approval_policy,
      s.calendar_id,
      s.pre_dispatch_condition,
      s.inputs_rotation,
      s.last_rotation_index,
      w.lenser_id,
      w.title
    FROM lenses.workflow_schedules s
    JOIN lenses.workflows w ON w.id = s.workflow_id
    WHERE s.is_active = true
      AND (s.last_run_at IS NULL OR date_trunc('minute', s.last_run_at) < v_scheduled_for)
      AND lenses.fn_cron_matches_now(s.cron_expr, v_now)
    ORDER BY s.created_at ASC
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    -- Resolve the workflow-owner AI lenser for action_logs fallback
    SELECT al.id INTO v_ai_lenser_id
    FROM agents.ai_lensers al
    WHERE al.profile_id = v_schedule.lenser_id
    LIMIT 1;

    -- Resolve the schedule assignee AI lenser for team_runs
    v_assignee_ai_lenser_id := NULL;
    IF v_schedule.assignee_id IS NOT NULL THEN
      IF v_schedule.assignee_type = 'agent' THEN
        v_assignee_ai_lenser_id := v_schedule.assignee_id;
      ELSIF v_schedule.assignee_type = 'team' THEN
        SELECT t.ai_lenser_id INTO v_assignee_ai_lenser_id
        FROM agents.teams t
        WHERE t.id = v_schedule.assignee_id
        LIMIT 1;
      END IF;
    END IF;

    v_log_ai_lenser_id := COALESCE(v_assignee_ai_lenser_id, v_ai_lenser_id);

    -- ── Budget enforcement gate ───────────────────────────────────────────
    IF v_ai_lenser_id IS NOT NULL THEN
      SELECT pol.spending_limit_credits, pol.budget_enforce
        INTO v_spending_limit, v_budget_enforce
      FROM agents.ai_lensers al
      JOIN agents.policies pol ON pol.id = al.policy_id
      WHERE al.id = v_ai_lenser_id;

      IF v_budget_enforce AND v_spending_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(qs.credits_spent), 0)
          INTO v_credits_used
        FROM agents.quota_snapshots qs
        WHERE qs.ai_lenser_id = v_ai_lenser_id
          AND qs.period_date = CURRENT_DATE;

        IF v_credits_used >= v_spending_limit THEN
          UPDATE lenses.workflow_schedules
          SET
            last_dispatch_status = 'budget_exceeded',
            last_error_at = v_now,
            last_error_message = format(
              'spending_limit_credits=%s reached (used=%s today)',
              v_spending_limit, v_credits_used
            )
          WHERE id = v_schedule.id;

          IF v_log_ai_lenser_id IS NOT NULL THEN
            INSERT INTO agents.action_logs (
              ai_lenser_id, action_type, result, metadata
            ) VALUES (
              v_log_ai_lenser_id,
              'schedule_skipped',
              'budget_exceeded',
              jsonb_build_object(
                'reason', 'budget_exceeded',
                'schedule_id', v_schedule.id,
                'workflow_id', v_schedule.workflow_id,
                'scheduled_for', v_scheduled_for,
                'spending_limit_credits', v_spending_limit,
                'credits_used_today', v_credits_used
              )
            );
          END IF;

          CONTINUE;
        END IF;
      END IF;
    END IF;
    -- ── End budget gate ───────────────────────────────────────────────────

    -- Determine approval requirement from policy (default: requiresApproval=true)
    v_requires_approval := COALESCE(
      (v_schedule.approval_policy->>'requiresApproval')::boolean,
      true
    );

    IF lenses.fn_workflow_has_cycle(v_schedule.workflow_id) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'validation_failed',
        last_error_at = v_now,
        last_error_message = 'cycle_detected'
      WHERE id = v_schedule.id;

      IF v_log_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id, action_type, result, metadata
        ) VALUES (
          v_log_ai_lenser_id,
          'schedule_skipped',
          'failed',
          jsonb_build_object(
            'reason', 'cycle_detected',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'scheduled_for', v_scheduled_for
          )
        );
      END IF;

      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      WHERE r.schedule_id = v_schedule.id
        AND r.status IN ('draft', 'validated', 'queued', 'pending', 'running', 'streaming', 'recovered')
    ) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'skipped_overlap',
        last_error_at = v_now,
        last_error_message = 'overlap_in_flight'
      WHERE id = v_schedule.id;

      IF v_log_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id, action_type, result, metadata
        ) VALUES (
          v_log_ai_lenser_id,
          'schedule_skipped',
          'throttled',
          jsonb_build_object(
            'reason', 'overlap_in_flight',
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'scheduled_for', v_scheduled_for
          )
        );
      END IF;

      CONTINUE;
    END IF;

    -- ── Phase W1: calendar overlay guard ──────────────────────────────────
    IF NOT lenses.fn_check_calendar(v_schedule.calendar_id, v_now) THEN
      UPDATE lenses.workflow_schedules
      SET
        last_dispatch_status = 'skipped_calendar',
        last_error_at = v_now,
        last_error_message = 'calendar_skipped'
      WHERE id = v_schedule.id;

      IF v_log_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id, action_type, result, metadata
        ) VALUES (
          v_log_ai_lenser_id,
          'schedule_skipped',
          'skipped',
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'scheduled_for', v_scheduled_for,
            'reason', 'calendar',
            'detail', 'calendar overlay denied this date',
            'calendar_id', v_schedule.calendar_id
          )
        );
      END IF;

      CONTINUE;
    END IF;
    -- ── End calendar guard ────────────────────────────────────────────────

    -- ── Phase W2: pre_dispatch_condition guard ────────────────────────────
    IF v_schedule.pre_dispatch_condition IS NOT NULL THEN
      v_condition_ctx := lenses.fn_build_schedule_condition_context(v_schedule.id);
      BEGIN
        v_condition_pass := automation.fn_eval_filter(
          v_schedule.pre_dispatch_condition,
          v_condition_ctx
        );
      EXCEPTION WHEN OTHERS THEN
        v_condition_pass := false;
      END;

      IF v_condition_pass IS DISTINCT FROM true THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_condition',
          last_error_at = v_now,
          last_error_message = 'condition_failed'
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'schedule_skipped',
            'skipped',
            jsonb_build_object(
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'reason', 'condition_failed',
              'detail', 'pre_dispatch_condition evaluated to false',
              'condition', v_schedule.pre_dispatch_condition,
              'context', v_condition_ctx
            )
          );
        END IF;

        CONTINUE;
      END IF;
    END IF;
    -- ── End condition guard ───────────────────────────────────────────────

    -- ── Phase W3: rotation pick ───────────────────────────────────────────
    IF v_schedule.inputs_rotation IS NOT NULL
       AND jsonb_typeof(v_schedule.inputs_rotation) = 'array'
       AND jsonb_array_length(v_schedule.inputs_rotation) > 0 THEN
      v_rotation_len := jsonb_array_length(v_schedule.inputs_rotation);
      v_rotation_idx := COALESCE(v_schedule.last_rotation_index, 0) % v_rotation_len;
      v_inputs := COALESCE(
        v_schedule.inputs_rotation -> v_rotation_idx,
        '{}'::jsonb
      );

      UPDATE lenses.workflow_schedules
      SET last_rotation_index = COALESCE(last_rotation_index, 0) + 1
      WHERE id = v_schedule.id;
    ELSE
      v_inputs := COALESCE(v_schedule.inputs_template, '{}'::jsonb);
    END IF;
    -- ── End rotation pick ─────────────────────────────────────────────────

    BEGIN
      INSERT INTO lenses.workflow_runs (
        workflow_id,
        triggered_by,
        status,
        context_inputs,
        global_model_id,
        schedule_id,
        scheduled_for,
        trigger_mode
      ) VALUES (
        v_schedule.workflow_id,
        v_schedule.lenser_id,
        'pending',
        v_inputs,
        v_schedule.global_model_id,
        v_schedule.id,
        v_scheduled_for,
        'schedule'
      )
      RETURNING id INTO v_run_id;

      INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
      SELECT v_run_id, n.id, 'pending'
      FROM lenses.workflow_nodes n
      WHERE n.workflow_id = v_schedule.workflow_id;

      -- Create team_run and dispatch event when the schedule has an assignee
      IF v_assignee_ai_lenser_id IS NOT NULL THEN
        v_team_run_status  := CASE WHEN v_requires_approval THEN 'blocked' ELSE 'queued' END;
        v_approval_status  := CASE WHEN v_requires_approval THEN 'pending' ELSE 'not_required' END;

        INSERT INTO agents.team_runs (
          ai_lenser_id,
          team_id,
          workflow_id,
          workflow_run_id,
          workflow_assignment_id,
          status,
          approval_status,
          metadata
        ) VALUES (
          v_assignee_ai_lenser_id,
          CASE WHEN v_schedule.assignee_type = 'team' THEN v_schedule.assignee_id ELSE NULL END,
          v_schedule.workflow_id,
          v_run_id,
          v_schedule.workflow_assignment_id,
          v_team_run_status,
          v_approval_status,
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'scheduled_for', v_scheduled_for,
            'cron_expr', v_schedule.cron_expr
          )
        )
        RETURNING id INTO v_team_run_id;

        INSERT INTO agents.agent_run_events (
          team_run_id,
          event_type,
          payload,
          occurred_at
        ) VALUES (
          v_team_run_id,
          CASE WHEN v_requires_approval THEN 'approval_requested' ELSE 'dispatch_queued' END,
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'scheduled_for', v_scheduled_for,
            'cron_expr', v_schedule.cron_expr,
            'workflow_id', v_schedule.workflow_id,
            'workflow_run_id', v_run_id,
            'requires_approval', v_requires_approval
          ),
          v_now
        );
      END IF;

      UPDATE lenses.workflow_schedules
      SET
        last_run_at = v_now,
        last_run_id = v_run_id,
        last_dispatch_status = 'dispatched',
        last_error_at = NULL,
        last_error_message = NULL
      WHERE id = v_schedule.id;

      IF v_log_ai_lenser_id IS NOT NULL THEN
        INSERT INTO agents.action_logs (
          ai_lenser_id, action_type, result, metadata
        ) VALUES (
          v_log_ai_lenser_id,
          'dispatch_schedule',
          'success',
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'workflow_id', v_schedule.workflow_id,
            'workflow_title', v_schedule.title,
            'run_id', v_run_id,
            'team_run_id', v_team_run_id,
            'trigger_mode', 'schedule',
            'scheduled_for', v_scheduled_for,
            'assignee_type', v_schedule.assignee_type,
            'assignee_id', v_schedule.assignee_id,
            'workflow_assignment_id', v_schedule.workflow_assignment_id,
            'requires_approval', v_requires_approval,
            'rotation_index_used', CASE
              WHEN v_schedule.inputs_rotation IS NOT NULL
                AND jsonb_typeof(v_schedule.inputs_rotation) = 'array'
                AND jsonb_array_length(v_schedule.inputs_rotation) > 0
              THEN COALESCE(v_schedule.last_rotation_index, 0)
                   % jsonb_array_length(v_schedule.inputs_rotation)
              ELSE NULL
            END
          )
        );
      END IF;

      v_dispatched := v_dispatched + 1;
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_overlap',
          last_error_at = v_now,
          last_error_message = 'schedule_slot_exists'
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'schedule_skipped',
            'throttled',
            jsonb_build_object(
              'reason', 'schedule_slot_exists',
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for
            )
          );
        END IF;
      WHEN OTHERS THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'dispatch_failed',
          last_error_at = v_now,
          last_error_message = left(SQLERRM, 500)
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'dispatch_schedule',
            'failed',
            jsonb_build_object(
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'error', left(SQLERRM, 500)
            )
          );
        END IF;
    END;
  END LOOP;

  RETURN v_dispatched;
END;
$$;

ALTER FUNCTION lenses.fn_dispatch_scheduled_workflows() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION lenses.fn_dispatch_scheduled_workflows() TO service_role;

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'Phase W + Emergency Stop: dispatch loop with calendar overlay (W1), '
  'pre_dispatch_condition (W2), parameter rotation (W3), plus kill-switch '
  'and queue-freeze guards at entry. Returns 0 immediately when either guard '
  'is active, preventing any new runs from being enqueued.';

-- ─── H. Patch battles.fn_claim_battle_execution_job ─────────────────────────
-- Full re-statement of the CU-patched version
-- (20280106000000_battle_stale_job_reclaim.sql).
-- Single addition: kill-switch guard at top of function body.

DROP FUNCTION IF EXISTS battles.fn_claim_battle_execution_job(text);

CREATE OR REPLACE FUNCTION battles.fn_claim_battle_execution_job(p_worker_id TEXT)
RETURNS TABLE (
  job_id                 UUID,
  battle_id              UUID,
  contender_id           UUID,
  slot                   TEXT,
  task_prompt            TEXT,
  provider_key           TEXT,
  model_key              TEXT,
  byok_key_ref_id        UUID,
  lens_id                UUID,
  version_id             UUID,
  max_tokens             INTEGER,
  temperature            NUMERIC,
  retry_count            INTEGER,
  ai_lenser_id           UUID,
  personality_note       TEXT,
  personality_version_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'battles', 'agents', 'public'
AS $$
DECLARE
  v_job battles.battle_execution_jobs;
BEGIN
  -- GUARD: system kill switch blocks all battle job claims immediately.
  IF public.fn_kill_switch_active('system') THEN
    RETURN;  -- empty result set — worker backs off silently
  END IF;

  SELECT j.*
  INTO   v_job
  FROM   battles.battle_execution_jobs j
  WHERE  j.status = 'queued'
    -- Respect backoff: fn_requeue_battle_job_with_backoff encodes the earliest
    -- pickup time in claimed_at. NULL = never been claimed; future = on backoff.
    AND  (j.claimed_at IS NULL OR j.claimed_at <= now())
  ORDER  BY j.created_at
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE battles.battle_execution_jobs
  SET    status     = 'claimed',
         worker_id  = p_worker_id,
         claimed_at = now()
  WHERE  id = v_job.id;

  RETURN QUERY
    SELECT
      v_job.id,
      v_job.battle_id,
      v_job.contender_id,
      v_job.slot,
      b.task_prompt,
      COALESCE(ec.provider_key, ''),
      COALESCE(ec.model_key,    ''),
      ec.byok_key_ref_id,
      cla.lens_id,
      cla.version_id,
      COALESCE(ec.max_tokens,  4096),
      COALESCE(ec.temperature, 0.7),
      v_job.retry_count,
      al.id,
      al.personality_note,
      plb.version_id
    FROM battles.battles b
    LEFT JOIN battles.execution_configs ec
           ON ec.battle_id    = v_job.battle_id
          AND (ec.contender_id = v_job.contender_id OR ec.contender_id IS NULL)
    LEFT JOIN battles.contender_lens_assignments cla
           ON cla.contender_id = v_job.contender_id
    LEFT JOIN battles.contenders con
           ON con.id             = v_job.contender_id
          AND con.contender_type = 'ai_agent'
    LEFT JOIN agents.ai_lensers al
           ON al.profile_id     = con.contender_ref_id
    LEFT JOIN agents.lens_bindings plb
           ON plb.ai_lenser_id  = al.id
          AND plb.is_default    = TRUE
          AND 'personality'     = ANY(plb.category_tags)
    WHERE b.id = v_job.battle_id
    ORDER BY ec.contender_id NULLS LAST
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION battles.fn_claim_battle_execution_job(TEXT) TO service_role;

COMMENT ON FUNCTION battles.fn_claim_battle_execution_job(TEXT) IS
  'CU fix (backoff timing) + Emergency Stop: adds kill-switch guard at entry. '
  'Returns empty result set when the system kill switch is active, preventing '
  'any new battle jobs from being claimed by workers.';
