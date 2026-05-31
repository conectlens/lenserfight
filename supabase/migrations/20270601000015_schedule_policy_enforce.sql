-- Migration: schedule policy enforcement in fn_dispatch_scheduled_workflows
-- Adds three policy checks before each run is inserted:
--   a) queue_policy.max_concurrent  — skip if too many active runs for this schedule
--   b) retry_policy.max_attempts    — skip if last N consecutive runs all failed
--   c) approval_policy.requiresApproval — insert with status='pending_approval'
--      instead of 'pending' when true (mirrors the team_run path for non-agent schedules)
--
-- The existing function already handles:
--   • system kill switch / queue freeze (GUARD 1/2)
--   • budget gate
--   • cycle detection
--   • overlap-in-flight (single concurrent run hard check)
--   • calendar overlay, pre_dispatch_condition, inputs rotation
--   • approval_policy via team_runs (agent assignee path)
--
-- This migration extends the core dispatch loop with the three JSONB-policy checks
-- that apply to ALL schedules regardless of assignee.

CREATE OR REPLACE FUNCTION "lenses"."fn_dispatch_scheduled_workflows"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'agents', 'automation', 'public'
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
  v_credits_used           numeric;
  -- Phase W
  v_condition_ctx          jsonb;
  v_condition_pass         boolean;
  v_condition_error        text;
  v_rotation_len           integer;
  v_rotation_idx           integer;
  v_inputs                 jsonb;
  -- policy enforcement (new)
  v_max_concurrent         integer;
  v_active_run_count       integer;
  v_max_attempts           integer;
  v_consecutive_failures   integer;
  v_run_status             text;
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
      s.retry_policy,
      s.queue_policy,
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
      SELECT pol.spending_limit_credits
        INTO v_spending_limit
      FROM agents.policies pol
      WHERE pol.ai_lenser_id = v_ai_lenser_id;

      IF v_spending_limit IS NOT NULL AND v_spending_limit > 0 THEN
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
      v_condition_ctx   := lenses.fn_build_schedule_condition_context(v_schedule.id);
      v_condition_pass  := NULL;
      v_condition_error := NULL;

      BEGIN
        v_condition_pass := automation.fn_eval_filter(
          v_schedule.pre_dispatch_condition,
          v_condition_ctx
        );
      EXCEPTION WHEN OTHERS THEN
        v_condition_pass  := false;
        v_condition_error := SQLERRM;
      END;

      IF v_condition_error IS NOT NULL THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'condition_failed',
          last_error_at        = v_now,
          last_error_message   = v_condition_error
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'schedule_skipped',
            'failed',
            jsonb_build_object(
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'reason', 'condition_failed',
              'error', v_condition_error,
              'condition', v_schedule.pre_dispatch_condition
            )
          );
        END IF;

        CONTINUE;
      END IF;

      IF v_condition_pass IS DISTINCT FROM true THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_condition',
          last_error_at        = v_now,
          last_error_message   = 'condition_failed'
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

    -- ── Policy gate A: queue_policy.max_concurrent ────────────────────────
    -- Skip if the number of active (pending/running) runs for this schedule
    -- has reached the configured maximum. Default: unlimited (NULL = no cap).
    v_max_concurrent := (v_schedule.queue_policy->>'max_concurrent')::integer;
    IF v_max_concurrent IS NOT NULL AND v_max_concurrent > 0 THEN
      SELECT COUNT(*) INTO v_active_run_count
      FROM lenses.workflow_runs r
      WHERE r.schedule_id = v_schedule.id
        AND r.status IN ('pending', 'running', 'streaming', 'queued', 'pending_approval');

      IF v_active_run_count >= v_max_concurrent THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_concurrency',
          last_error_at        = v_now,
          last_error_message   = format(
            'max_concurrent=%s reached (active=%s)',
            v_max_concurrent, v_active_run_count
          )
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'schedule_skipped',
            'throttled',
            jsonb_build_object(
              'reason', 'max_concurrent_reached',
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'max_concurrent', v_max_concurrent,
              'active_count', v_active_run_count
            )
          );
        END IF;

        CONTINUE;
      END IF;
    END IF;
    -- ── End concurrency gate ──────────────────────────────────────────────

    -- ── Policy gate B: retry_policy.max_attempts ──────────────────────────
    -- Skip if the last max_attempts consecutive runs for this schedule all
    -- ended in a terminal failure. This prevents infinite retry storms on
    -- permanently broken workflows.
    v_max_attempts := (v_schedule.retry_policy->>'max_attempts')::integer;
    IF v_max_attempts IS NULL THEN
      -- Fallback: legacy key name used by some older schedules
      v_max_attempts := (v_schedule.retry_policy->>'maxRetries')::integer;
    END IF;

    IF v_max_attempts IS NOT NULL AND v_max_attempts > 0 THEN
      SELECT COUNT(*) INTO v_consecutive_failures
      FROM (
        SELECT status
        FROM lenses.workflow_runs
        WHERE schedule_id = v_schedule.id
          AND status IN ('failed', 'error', 'cancelled', 'timed_out')
        ORDER BY created_at DESC
        LIMIT v_max_attempts
      ) recent
      WHERE status IN ('failed', 'error', 'cancelled', 'timed_out');

      IF v_consecutive_failures >= v_max_attempts THEN
        UPDATE lenses.workflow_schedules
        SET
          last_dispatch_status = 'skipped_max_attempts',
          last_error_at        = v_now,
          last_error_message   = format(
            'last %s consecutive runs all failed (max_attempts=%s)',
            v_consecutive_failures, v_max_attempts
          )
        WHERE id = v_schedule.id;

        IF v_log_ai_lenser_id IS NOT NULL THEN
          INSERT INTO agents.action_logs (
            ai_lenser_id, action_type, result, metadata
          ) VALUES (
            v_log_ai_lenser_id,
            'schedule_skipped',
            'failed',
            jsonb_build_object(
              'reason', 'max_attempts_exhausted',
              'schedule_id', v_schedule.id,
              'workflow_id', v_schedule.workflow_id,
              'scheduled_for', v_scheduled_for,
              'max_attempts', v_max_attempts,
              'consecutive_failures', v_consecutive_failures
            )
          );
        END IF;

        CONTINUE;
      END IF;
    END IF;
    -- ── End retry-limit gate ──────────────────────────────────────────────

    -- ── Policy gate C: approval_policy.requires_approval (non-agent path) ─
    -- The agent/team path already uses team_runs + v_requires_approval below.
    -- For schedules without an assignee (direct dispatch), honour the policy
    -- by inserting the run with status='pending_approval' instead of 'pending'.
    v_run_status := CASE
      WHEN v_requires_approval AND v_assignee_ai_lenser_id IS NULL
        THEN 'pending_approval'
      ELSE 'pending'
    END;
    -- ── End approval gate ─────────────────────────────────────────────────

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
        v_run_status,
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
        last_run_at          = v_now,
        last_run_id          = v_run_id,
        last_dispatch_status = 'dispatched',
        last_error_at        = NULL,
        last_error_message   = NULL
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
            'run_status', v_run_status,
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
          last_error_at        = v_now,
          last_error_message   = 'schedule_slot_exists'
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
          last_error_at        = v_now,
          last_error_message   = left(SQLERRM, 500)
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
