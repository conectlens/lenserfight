-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D8: fn_eval_filter exceptions silently default the
-- pre_dispatch_condition to false and skip dispatch without surfacing the
-- evaluation error in last_error_message.
--
-- Original behavior:
--   EXCEPTION WHEN OTHERS THEN v_condition_pass := false;
--   …
--   UPDATE schedules SET last_dispatch_status='skipped_condition',
--                        last_error_message='condition_failed'
--
-- New behavior: capture the SQLERRM into a distinct status
-- `condition_failed` (vs `skipped_condition` for a clean false result).
-- This lets operators distinguish "the rule said skip" from "the rule
-- threw an error and we treated it as skip."
--
-- Approach: re-create lenses.fn_dispatch_scheduled_workflows() identical
-- to the existing body, except for the condition-guard arm which now
-- branches on whether v_condition_pass was set by a hard exception.
-- Body is large so we keep it nearly verbatim — the only edits are around
-- the EXCEPTION block and the UPDATE that follows.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lenses.fn_dispatch_scheduled_workflows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'agents', 'automation', 'public'
AS $function$
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
  v_spending_limit         numeric;
  v_budget_enforce         boolean;
  v_credits_used           numeric;
  v_condition_ctx          jsonb;
  v_condition_pass         boolean;
  v_condition_err          text;
  v_rotation_len           integer;
  v_rotation_idx           integer;
  v_inputs                 jsonb;
BEGIN
  FOR v_schedule IN
    SELECT
      s.id, s.workflow_id, s.cron_expr, s.global_model_id, s.inputs_template,
      s.is_active, s.last_run_at, s.assignee_type, s.assignee_id,
      s.workflow_assignment_id, s.approval_policy, s.calendar_id,
      s.pre_dispatch_condition, s.inputs_rotation, s.last_rotation_index,
      w.lenser_id, w.title
    FROM lenses.workflow_schedules s
    JOIN lenses.workflows w ON w.id = s.workflow_id
    WHERE s.is_active = true
      AND (s.last_run_at IS NULL OR date_trunc('minute', s.last_run_at) < v_scheduled_for)
      AND lenses.fn_cron_matches_now(s.cron_expr, v_now)
    ORDER BY s.created_at ASC
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    SELECT al.id INTO v_ai_lenser_id
    FROM agents.ai_lensers al
    WHERE al.profile_id = v_schedule.lenser_id
    LIMIT 1;

    v_assignee_ai_lenser_id := NULL;
    IF v_schedule.assignee_id IS NOT NULL THEN
      IF v_schedule.assignee_type = 'agent' THEN
        v_assignee_ai_lenser_id := v_schedule.assignee_id;
      ELSIF v_schedule.assignee_type = 'team' THEN
        SELECT t.ai_lenser_id INTO v_assignee_ai_lenser_id
        FROM agents.teams t WHERE t.id = v_schedule.assignee_id LIMIT 1;
      END IF;
    END IF;

    v_log_ai_lenser_id := COALESCE(v_assignee_ai_lenser_id, v_ai_lenser_id);

    -- Budget enforcement gate
    IF v_ai_lenser_id IS NOT NULL THEN
      SELECT pol.spending_limit_credits, pol.budget_enforce
        INTO v_spending_limit, v_budget_enforce
      FROM agents.ai_lensers al
      JOIN agents.policies pol ON pol.id = al.policy_id
      WHERE al.id = v_ai_lenser_id;

      IF v_budget_enforce AND v_spending_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(qs.credits_spent), 0) INTO v_credits_used
        FROM agents.quota_snapshots qs
        WHERE qs.ai_lenser_id = v_ai_lenser_id
          AND qs.period_date = CURRENT_DATE;

        IF v_credits_used >= v_spending_limit THEN
          UPDATE lenses.workflow_schedules
          SET last_dispatch_status = 'budget_exceeded',
              last_error_at = v_now,
              last_error_message = format('spending_limit_credits=%s reached (used=%s today)',
                                          v_spending_limit, v_credits_used)
          WHERE id = v_schedule.id;
          CONTINUE;
        END IF;
      END IF;
    END IF;

    v_requires_approval := COALESCE(
      (v_schedule.approval_policy->>'requiresApproval')::boolean, true);

    IF lenses.fn_workflow_has_cycle(v_schedule.workflow_id) THEN
      UPDATE lenses.workflow_schedules
      SET last_dispatch_status = 'validation_failed',
          last_error_at = v_now, last_error_message = 'cycle_detected'
      WHERE id = v_schedule.id;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM lenses.workflow_runs r
      WHERE r.schedule_id = v_schedule.id
        AND r.status IN ('draft','validated','queued','pending','running','streaming','recovered')
    ) THEN
      UPDATE lenses.workflow_schedules
      SET last_dispatch_status = 'skipped_overlap',
          last_error_at = v_now, last_error_message = 'overlap_in_flight'
      WHERE id = v_schedule.id;
      CONTINUE;
    END IF;

    IF NOT lenses.fn_check_calendar(v_schedule.calendar_id, v_now) THEN
      UPDATE lenses.workflow_schedules
      SET last_dispatch_status = 'skipped_calendar',
          last_error_at = v_now, last_error_message = 'calendar_skipped'
      WHERE id = v_schedule.id;
      CONTINUE;
    END IF;

    -- ── D8: pre_dispatch_condition guard with error surfacing ─────────────
    IF v_schedule.pre_dispatch_condition IS NOT NULL THEN
      v_condition_ctx := lenses.fn_build_schedule_condition_context(v_schedule.id);
      v_condition_err := NULL;
      BEGIN
        v_condition_pass := automation.fn_eval_filter(
          v_schedule.pre_dispatch_condition, v_condition_ctx);
      EXCEPTION WHEN OTHERS THEN
        v_condition_pass := false;
        v_condition_err  := left(SQLERRM, 500);
      END;

      IF v_condition_pass IS DISTINCT FROM true THEN
        IF v_condition_err IS NOT NULL THEN
          -- D8: hard error in the DSL → surface as `condition_failed`
          UPDATE lenses.workflow_schedules
          SET last_dispatch_status = 'condition_failed',
              last_error_at = v_now,
              last_error_message = 'fn_eval_filter raised: ' || v_condition_err
          WHERE id = v_schedule.id;
        ELSE
          -- Clean false return → keep `skipped_condition`
          UPDATE lenses.workflow_schedules
          SET last_dispatch_status = 'skipped_condition',
              last_error_at = v_now, last_error_message = 'condition_failed'
          WHERE id = v_schedule.id;
        END IF;
        CONTINUE;
      END IF;
    END IF;
    -- ── End D8 ──────────────────────────────────────────────────────────

    IF v_schedule.inputs_rotation IS NOT NULL
       AND jsonb_typeof(v_schedule.inputs_rotation) = 'array'
       AND jsonb_array_length(v_schedule.inputs_rotation) > 0 THEN
      v_rotation_len := jsonb_array_length(v_schedule.inputs_rotation);
      v_rotation_idx := COALESCE(v_schedule.last_rotation_index, 0) % v_rotation_len;
      v_inputs := COALESCE(v_schedule.inputs_rotation -> v_rotation_idx, '{}'::jsonb);
      UPDATE lenses.workflow_schedules
      SET last_rotation_index = COALESCE(last_rotation_index, 0) + 1
      WHERE id = v_schedule.id;
    ELSE
      v_inputs := COALESCE(v_schedule.inputs_template, '{}'::jsonb);
    END IF;

    BEGIN
      INSERT INTO lenses.workflow_runs (
        workflow_id, triggered_by, status, context_inputs, global_model_id,
        schedule_id, scheduled_for, trigger_mode
      ) VALUES (
        v_schedule.workflow_id, v_schedule.lenser_id, 'pending', v_inputs,
        v_schedule.global_model_id, v_schedule.id, v_scheduled_for, 'schedule'
      ) RETURNING id INTO v_run_id;

      INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
      SELECT v_run_id, n.id, 'pending'
      FROM lenses.workflow_nodes n
      WHERE n.workflow_id = v_schedule.workflow_id;

      IF v_assignee_ai_lenser_id IS NOT NULL THEN
        v_team_run_status := CASE WHEN v_requires_approval THEN 'blocked' ELSE 'queued' END;
        v_approval_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'not_required' END;

        INSERT INTO agents.team_runs (
          ai_lenser_id, team_id, workflow_id, workflow_run_id,
          workflow_assignment_id, status, approval_status, metadata
        ) VALUES (
          v_assignee_ai_lenser_id,
          CASE WHEN v_schedule.assignee_type = 'team' THEN v_schedule.assignee_id ELSE NULL END,
          v_schedule.workflow_id, v_run_id, v_schedule.workflow_assignment_id,
          v_team_run_status, v_approval_status,
          jsonb_build_object('schedule_id', v_schedule.id,
                             'scheduled_for', v_scheduled_for,
                             'cron_expr', v_schedule.cron_expr)
        ) RETURNING id INTO v_team_run_id;

        INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
        VALUES (
          v_team_run_id,
          CASE WHEN v_requires_approval THEN 'approval_requested' ELSE 'dispatch_queued' END,
          jsonb_build_object('schedule_id', v_schedule.id,
                             'scheduled_for', v_scheduled_for,
                             'cron_expr', v_schedule.cron_expr,
                             'workflow_id', v_schedule.workflow_id,
                             'workflow_run_id', v_run_id,
                             'requires_approval', v_requires_approval),
          v_now
        );
      END IF;

      UPDATE lenses.workflow_schedules
      SET last_run_at = v_now, last_run_id = v_run_id,
          last_dispatch_status = 'dispatched',
          last_error_at = NULL, last_error_message = NULL
      WHERE id = v_schedule.id;

      v_dispatched := v_dispatched + 1;
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE lenses.workflow_schedules
        SET last_dispatch_status = 'skipped_overlap',
            last_error_at = v_now, last_error_message = 'schedule_slot_exists'
        WHERE id = v_schedule.id;
      WHEN OTHERS THEN
        UPDATE lenses.workflow_schedules
        SET last_dispatch_status = 'dispatch_failed',
            last_error_at = v_now,
            last_error_message = left(SQLERRM, 500)
        WHERE id = v_schedule.id;
    END;
  END LOOP;

  RETURN v_dispatched;
END;
$function$;

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'D8 fix: distinguishes condition_failed (DSL raised an error) from '
  'skipped_condition (DSL returned clean false). Operators can now spot a '
  'broken rule rather than treating every skip as a normal outcome.';
