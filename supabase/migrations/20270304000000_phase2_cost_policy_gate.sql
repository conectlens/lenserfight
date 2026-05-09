-- Phase 2.8: Cost policy enforcement in the scheduled dispatch loop
--
-- Replaces lenses.fn_dispatch_scheduled_workflows() with a version that checks
-- the lenser's daily credit quota before dispatching. When budget_enforce = true
-- and credits_spent >= spending_limit_credits for the current day, the schedule
-- row is updated to last_dispatch_status = 'budget_exceeded' and skipped.
--
-- All other behaviour (cycle detection, overlap guard, approval gate, team_runs,
-- action_logs) is unchanged from 20260501030000.

CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'public'
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
BEGIN
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
        COALESCE(v_schedule.inputs_template, '{}'::jsonb),
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
            'requires_approval', v_requires_approval
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
  'Phase 2.8: Dispatches minute-granularity workflow schedules with budget enforcement. '
  'Skips schedules whose owner lenser has exceeded their daily spending_limit_credits '
  '(when budget_enforce = true). Other guards: cycle detection, overlap, unique slot dedup.';
