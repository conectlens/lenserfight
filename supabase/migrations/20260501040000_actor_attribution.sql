-- Phase 3 actor attribution:
--   1. Add ai_lenser_id attribution column to lenses.workflow_runs
--   2. Create agents.workspace_switches audit table
--   3. Update fn_switch_active_lenser to record every switch
--   4. Update fn_dispatch_scheduled_workflows to populate ai_lenser_id on workflow_runs

-- ─── 1. ai_lenser_id on workflow_runs ────────────────────────────────────────

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS ai_lenser_id uuid REFERENCES agents.ai_lensers(id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_ai_lenser
  ON lenses.workflow_runs (ai_lenser_id, created_at DESC)
  WHERE ai_lenser_id IS NOT NULL;

COMMENT ON COLUMN lenses.workflow_runs.ai_lenser_id IS
  'The AI lenser acting as the run executor. NULL when the run is created directly by the
   human workspace. Populated by scheduled dispatch and by agent-context executions.';

-- ─── 2. Workspace switch audit table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.workspace_switches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  human_lenser_id  uuid        NOT NULL REFERENCES lensers.profiles(id),
  from_ai_lenser_id uuid       REFERENCES agents.ai_lensers(id),
  to_ai_lenser_id  uuid        REFERENCES agents.ai_lensers(id),
  switched_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agents.workspace_switches IS
  'Append-only audit trail of workspace (profile) switches. from_ai_lenser_id NULL means
   the user was on their human workspace; to_ai_lenser_id NULL means they returned to it.';

CREATE INDEX IF NOT EXISTS idx_workspace_switches_human
  ON agents.workspace_switches (human_lenser_id, switched_at DESC);

ALTER TABLE agents.workspace_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_select_own ON agents.workspace_switches
  FOR SELECT USING (human_lenser_id = lensers.get_auth_lenser_id());

CREATE POLICY ws_insert_own ON agents.workspace_switches
  FOR INSERT WITH CHECK (human_lenser_id = lensers.get_auth_lenser_id());

GRANT SELECT, INSERT ON TABLE agents.workspace_switches TO authenticated;

-- ─── 3. fn_switch_active_lenser — with switch audit logging ──────────────────

CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser(p_lenser_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'agents', 'auth'
AS $$
DECLARE
  v_human_id          uuid;
  v_current_active_id uuid;
  v_from_ai_lenser_id uuid;
  v_to_ai_lenser_id   uuid;
BEGIN
  SELECT p.id INTO v_human_id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.type    = 'human'
    AND p.status  = 'active'
  LIMIT 1;

  IF v_human_id IS NULL THEN
    RAISE EXCEPTION 'No active human profile found for this user';
  END IF;

  SELECT pref.active_lenser_id INTO v_current_active_id
  FROM lensers.preferences pref
  WHERE pref.lenser_id = v_human_id
  LIMIT 1;

  -- Resolve the current active AI lenser (NULL if currently on human workspace)
  SELECT al.id INTO v_from_ai_lenser_id
  FROM agents.ai_lensers al
  JOIN lensers.profiles ap ON ap.id = al.profile_id
  WHERE ap.id = v_current_active_id
  LIMIT 1;

  IF p_lenser_id = v_human_id THEN
    -- Switching back to human workspace
    UPDATE lensers.preferences
    SET active_lenser_id = NULL,
        updated_at       = now()
    WHERE lenser_id = v_human_id;

    -- Log the switch only when leaving an AI workspace
    IF v_from_ai_lenser_id IS NOT NULL THEN
      INSERT INTO agents.workspace_switches (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
      VALUES (v_human_id, v_from_ai_lenser_id, NULL);
    END IF;

    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships   o
    JOIN agents.ai_lensers   al    ON al.id     = o.ai_lenser_id
    JOIN lensers.profiles    ai_p  ON ai_p.id   = al.profile_id
    WHERE o.owner_lenser_id = v_human_id
      AND ai_p.id           = p_lenser_id
      AND o.role            = 'owner'
      AND o.revoked_at      IS NULL
      AND ai_p.status       = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot switch: profile not found or not owned'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve the target AI lenser id
  SELECT al.id INTO v_to_ai_lenser_id
  FROM agents.ai_lensers al
  JOIN lensers.profiles ap ON ap.id = al.profile_id
  WHERE ap.id = p_lenser_id
  LIMIT 1;

  UPDATE lensers.preferences
  SET active_lenser_id = p_lenser_id,
      updated_at       = now()
  WHERE lenser_id = v_human_id;

  INSERT INTO agents.workspace_switches (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
  VALUES (v_human_id, v_from_ai_lenser_id, v_to_ai_lenser_id);
END;
$$;

ALTER FUNCTION public.fn_switch_active_lenser(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_switch_active_lenser(uuid) IS
  'Switches the authenticated user''s active workspace to the given lenser ID. Must be the
   user''s own human profile (resets to default) or an AI lenser they own as primary owner.
   Stores selection in lensers.preferences.active_lenser_id and appends a row to
   agents.workspace_switches for the audit trail.';

GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO anon, authenticated, service_role;

-- ─── 4. Populate ai_lenser_id on scheduled workflow_runs ─────────────────────
--
-- The completion migration (20260501030000) already sets the assignee_ai_lenser_id
-- variable. This migration extends fn_dispatch_scheduled_workflows to write it
-- onto lenses.workflow_runs.ai_lenser_id when the schedule has an agent assignee.

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
        FROM agents.teams t
        WHERE t.id = v_schedule.assignee_id
        LIMIT 1;
      END IF;
    END IF;

    v_log_ai_lenser_id := COALESCE(v_assignee_ai_lenser_id, v_ai_lenser_id);

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
        INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
        VALUES (
          v_log_ai_lenser_id, 'schedule_skipped', 'failed',
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
        INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
        VALUES (
          v_log_ai_lenser_id, 'schedule_skipped', 'throttled',
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
        ai_lenser_id,
        status,
        context_inputs,
        global_model_id,
        schedule_id,
        scheduled_for,
        trigger_mode
      ) VALUES (
        v_schedule.workflow_id,
        v_schedule.lenser_id,
        v_assignee_ai_lenser_id,
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

      IF v_assignee_ai_lenser_id IS NOT NULL THEN
        v_team_run_status := CASE WHEN v_requires_approval THEN 'blocked' ELSE 'queued' END;
        v_approval_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'not_required' END;

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

        INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
        VALUES (
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
        INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
        VALUES (
          v_log_ai_lenser_id, 'dispatch_schedule', 'success',
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
          INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
          VALUES (
            v_log_ai_lenser_id, 'schedule_skipped', 'throttled',
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
          INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
          VALUES (
            v_log_ai_lenser_id, 'dispatch_schedule', 'failed',
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

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'Dispatches minute-granularity workflow schedules. Locks schedule rows, deduplicates via
   (schedule_id, scheduled_for) uniqueness, writes ai_lenser_id attribution onto workflow_runs,
   creates agents.team_runs with approval-aware status, and emits agent_run_events.';

GRANT EXECUTE ON FUNCTION lenses.fn_dispatch_scheduled_workflows() TO service_role;
