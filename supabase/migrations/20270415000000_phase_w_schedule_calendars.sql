-- Phase W: CRON v2 — calendar overlays, conditional dispatch, parameter rotation
--
-- Builds on Phase U's `automation.fn_eval_filter(jsonb, jsonb)` for W2.
-- Patches `lenses.fn_dispatch_scheduled_workflows()` (canonical baseline:
-- `20270304000000_phase2_cost_policy_gate.sql`) via full CREATE OR REPLACE,
-- adding three guards in order: calendar -> condition -> rotation pick.
--
-- Three concerns rolled into one migration:
--   W1. lenses.schedule_calendars + lenses.fn_check_calendar(...)
--       + workflow_schedules.calendar_id (FK ON DELETE SET NULL)
--   W2. workflow_schedules.pre_dispatch_condition (jsonb, U-DSL)
--       + lenses.fn_build_schedule_condition_context(p_schedule_id)
--   W3. workflow_schedules.inputs_rotation (jsonb array)
--       + workflow_schedules.last_rotation_index (int)
--   + lenses.fn_preview_schedule_ticks(p_schedule_id, p_n) for UX dry-runs.
--   + Three seed calendars (US/TR holidays 2026, weekends-only).
--
-- `agents.action_logs.action_type` already accepts 'schedule_skipped' (added
-- by 20260503070000_fix_action_logs_binding_updated.sql) — no constraint
-- extension is needed.

-- ─── 1. lenses.schedule_calendars ────────────────────────────────────────────

-- Sentinel UUID used as the "owner" for seed calendars so the table can keep
-- lenser_id NOT NULL while still permitting platform-wide seeds. Referenced
-- in the SELECT policy below via the is_seed flag, not by sentinel value.
-- Sentinel: '00000000-0000-0000-0000-000000000000'.

CREATE TABLE IF NOT EXISTS lenses.schedule_calendars (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id    uuid        NOT NULL,
  name         text        NOT NULL,
  kind         text        NOT NULL CHECK (kind IN ('skip_dates','only_dates')),
  dates        date[]      NOT NULL DEFAULT '{}',
  timezone     text        NOT NULL,
  is_seed      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lenses.schedule_calendars OWNER TO postgres;

COMMENT ON TABLE lenses.schedule_calendars IS
  'Phase W1: per-lenser calendar overlays (skip_dates / only_dates) attached '
  'to workflow schedules. Seeds (is_seed=true) are owned by the all-zeros UUID '
  'sentinel and visible to all authenticated users; only the owner may mutate '
  'a non-seed calendar, and seeds are immutable through the API.';

COMMENT ON COLUMN lenses.schedule_calendars.lenser_id IS
  'Owning lenser. For seed rows this is the all-zeros UUID sentinel '
  '(00000000-0000-0000-0000-000000000000); see is_seed flag.';

COMMENT ON COLUMN lenses.schedule_calendars.timezone IS
  'IANA timezone name (e.g. America/New_York). Used to resolve ''now'' to '
  'a calendar-local date when evaluating skip/only membership.';

CREATE INDEX IF NOT EXISTS idx_schedule_calendars_lenser
  ON lenses.schedule_calendars (lenser_id);

CREATE INDEX IF NOT EXISTS idx_schedule_calendars_seed
  ON lenses.schedule_calendars (is_seed)
  WHERE is_seed = true;

-- Stable identity for seed upserts: lenser+name is unique per owner.
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_calendars_lenser_name
  ON lenses.schedule_calendars (lenser_id, name);

ALTER TABLE lenses.schedule_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_calendars_select ON lenses.schedule_calendars;
CREATE POLICY schedule_calendars_select
  ON lenses.schedule_calendars
  FOR SELECT
  TO authenticated
  USING (
    is_seed = true
    OR lenser_id = lensers.get_auth_lenser_id()
  );

DROP POLICY IF EXISTS schedule_calendars_insert ON lenses.schedule_calendars;
CREATE POLICY schedule_calendars_insert
  ON lenses.schedule_calendars
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_seed = false
    AND lenser_id = lensers.get_auth_lenser_id()
  );

DROP POLICY IF EXISTS schedule_calendars_update ON lenses.schedule_calendars;
CREATE POLICY schedule_calendars_update
  ON lenses.schedule_calendars
  FOR UPDATE
  TO authenticated
  USING (
    is_seed = false
    AND lenser_id = lensers.get_auth_lenser_id()
  )
  WITH CHECK (
    is_seed = false
    AND lenser_id = lensers.get_auth_lenser_id()
  );

DROP POLICY IF EXISTS schedule_calendars_delete ON lenses.schedule_calendars;
CREATE POLICY schedule_calendars_delete
  ON lenses.schedule_calendars
  FOR DELETE
  TO authenticated
  USING (
    is_seed = false
    AND lenser_id = lensers.get_auth_lenser_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON lenses.schedule_calendars TO authenticated;
GRANT ALL ON lenses.schedule_calendars TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION lenses.fn_schedule_calendars_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION lenses.fn_schedule_calendars_touch_updated() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_schedule_calendars_touch_updated
  ON lenses.schedule_calendars;
CREATE TRIGGER trg_schedule_calendars_touch_updated
  BEFORE UPDATE ON lenses.schedule_calendars
  FOR EACH ROW
  EXECUTE FUNCTION lenses.fn_schedule_calendars_touch_updated();

-- ─── 2. New columns on workflow_schedules ───────────────────────────────────

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS calendar_id uuid NULL
    REFERENCES lenses.schedule_calendars(id) ON DELETE SET NULL;

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS pre_dispatch_condition jsonb NULL;

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS inputs_rotation jsonb NULL;

ALTER TABLE lenses.workflow_schedules
  ADD COLUMN IF NOT EXISTS last_rotation_index int NOT NULL DEFAULT 0;

COMMENT ON COLUMN lenses.workflow_schedules.calendar_id IS
  'Phase W1: optional calendar overlay (skip_dates / only_dates). NULL = no '
  'overlay. ON DELETE SET NULL so deleting a calendar does not cascade-delete '
  'schedules.';

COMMENT ON COLUMN lenses.workflow_schedules.pre_dispatch_condition IS
  'Phase W2: optional jsonb condition evaluated by automation.fn_eval_filter '
  'against lenses.fn_build_schedule_condition_context(...). NULL = no '
  'condition. Same DSL as Phase U trigger rules (JSON-Pointer + eq/neq/gt/'
  'lt/contains).';

COMMENT ON COLUMN lenses.workflow_schedules.inputs_rotation IS
  'Phase W3: optional jsonb array of input templates. When non-empty, the '
  'dispatcher rotates through entries using last_rotation_index. NULL or '
  'empty = use inputs_template.';

COMMENT ON COLUMN lenses.workflow_schedules.last_rotation_index IS
  'Phase W3: monotonic counter incremented each tick the rotation is used. '
  'The selected entry index is (last_rotation_index % array_length).';

-- ─── 3. lenses.fn_check_calendar ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_check_calendar(
  p_calendar_id uuid,
  p_now         timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = lenses, pg_catalog
AS $$
DECLARE
  v_kind     text;
  v_dates    date[];
  v_tz       text;
  v_local    date;
  v_in_set   boolean;
BEGIN
  IF p_calendar_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT kind, dates, timezone
    INTO v_kind, v_dates, v_tz
  FROM lenses.schedule_calendars
  WHERE id = p_calendar_id;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Resolve the wall-clock date in the calendar's timezone.
  BEGIN
    v_local := (p_now AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    -- Bad timezone string: fail closed-ish — allow dispatch but log nothing.
    RETURN true;
  END;

  v_in_set := v_local = ANY(COALESCE(v_dates, ARRAY[]::date[]));

  IF v_kind = 'skip_dates' THEN
    RETURN NOT v_in_set;
  ELSIF v_kind = 'only_dates' THEN
    RETURN v_in_set;
  END IF;

  -- Defensive: unknown kind => allow.
  RETURN true;
END;
$$;

ALTER FUNCTION lenses.fn_check_calendar(uuid, timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION lenses.fn_check_calendar(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lenses.fn_check_calendar(uuid, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION lenses.fn_check_calendar(uuid, timestamptz) IS
  'Phase W1: returns TRUE when dispatch is allowed for the calendar overlay '
  'at p_now. NULL calendar or missing row => TRUE. Resolves p_now into the '
  'calendar timezone before checking date membership.';

-- ─── 4. lenses.fn_build_schedule_condition_context ───────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_build_schedule_condition_context(
  p_schedule_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = lenses, pg_catalog
AS $$
DECLARE
  v_workflow_id uuid;
  v_prior       jsonb;
  v_succeeded   integer;
  v_failed      integer;
  v_total       integer;
BEGIN
  SELECT s.workflow_id INTO v_workflow_id
  FROM lenses.workflow_schedules s
  WHERE s.id = p_schedule_id;

  IF v_workflow_id IS NULL THEN
    RETURN jsonb_build_object(
      'prior_run_result', NULL,
      'last_24h_stats', jsonb_build_object(
        'succeeded', 0, 'failed', 0, 'total', 0
      ),
      'signal_rpc_result', NULL
    );
  END IF;

  -- Most recent run's result block (NULL-safe).
  SELECT r.metadata -> 'result'
    INTO v_prior
  FROM lenses.workflow_runs r
  WHERE r.workflow_id = v_workflow_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  -- 24h aggregate windowed by created_at.
  SELECT
    COALESCE(SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN r.status = 'failed'    THEN 1 ELSE 0 END), 0),
    COUNT(*)
  INTO v_succeeded, v_failed, v_total
  FROM lenses.workflow_runs r
  WHERE r.workflow_id = v_workflow_id
    AND r.created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'prior_run_result', v_prior,
    'last_24h_stats', jsonb_build_object(
      'succeeded', v_succeeded,
      'failed',    v_failed,
      'total',     v_total
    ),
    -- Future hook: operators may extend this builder to invoke a signal RPC
    -- (e.g. external KPI fetch) and merge the result here. Today: NULL.
    'signal_rpc_result', NULL
  );
END;
$$;

ALTER FUNCTION lenses.fn_build_schedule_condition_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION lenses.fn_build_schedule_condition_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lenses.fn_build_schedule_condition_context(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION lenses.fn_build_schedule_condition_context(uuid) IS
  'Phase W2: builds the jsonb context the dispatcher feeds to '
  'automation.fn_eval_filter when a schedule has pre_dispatch_condition. '
  'Shape: { prior_run_result, last_24h_stats:{succeeded,failed,total}, '
  'signal_rpc_result }. signal_rpc_result is reserved for a future operator '
  'hook and is currently always NULL.';

-- ─── 5. Patched dispatcher: lenses.fn_dispatch_scheduled_workflows ───────────
--
-- This is a full REPLACE (not a wrapper). The function is short enough that
-- duplicating it preserves the procedural shape of the existing canonical
-- baseline (Phase 2.8). The only additions are three guards inserted between
-- the cycle-detection / overlap guard and the workflow_runs INSERT:
--   (1) calendar guard       — uses lenses.fn_check_calendar
--   (2) condition guard      — uses automation.fn_eval_filter +
--                              lenses.fn_build_schedule_condition_context
--   (3) rotation pick        — selects v_inputs from inputs_rotation when set
-- All other behaviour (budget gate, cycle detection, overlap, team_runs,
-- approval gate, action_logs) is unchanged.

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
-- Preserve the existing GRANT (Phase 2.8 set service_role only).
GRANT EXECUTE ON FUNCTION lenses.fn_dispatch_scheduled_workflows() TO service_role;

COMMENT ON FUNCTION lenses.fn_dispatch_scheduled_workflows() IS
  'Phase W: dispatch loop with calendar overlay (W1), pre_dispatch_condition '
  '(W2 — uses automation.fn_eval_filter) and parameter rotation (W3) added to '
  'the Phase 2.8 baseline. Skip reasons land in agents.action_logs as '
  'action_type=schedule_skipped with payload {reason, detail, ...}.';

-- ─── 6. lenses.fn_preview_schedule_ticks ────────────────────────────────────
--
-- Walks forward minute-by-minute from now() and returns the next p_n ticks
-- whose cron expression matches. For each tick we evaluate the same three
-- guards the dispatcher does (calendar -> condition -> rotation). prior_run_
-- result and last_24h_stats are computed once (current values) and reused for
-- every tick — preview is a snapshot, not a simulation.

CREATE OR REPLACE FUNCTION lenses.fn_preview_schedule_ticks(
  p_schedule_id uuid,
  p_n           int DEFAULT 10
)
RETURNS TABLE (
  tick_at  timestamptz,
  decision text,
  reason   text,
  inputs   jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = lenses, automation, pg_catalog
AS $$
DECLARE
  v_n           int := GREATEST(1, LEAST(COALESCE(p_n, 10), 200));
  v_horizon_min int := 60 * 24 * 31; -- look ahead at most ~31 days
  v_schedule    RECORD;
  v_ctx         jsonb;
  v_cursor      timestamptz := date_trunc('minute', now()) + interval '1 minute';
  v_emitted     int := 0;
  v_step        int := 0;
  v_pass        boolean;
  v_rotation_len int;
  v_rotation_idx int;
  v_inputs      jsonb;
  v_decision    text;
  v_reason      text;
BEGIN
  SELECT
    s.id,
    s.workflow_id,
    s.cron_expr,
    s.inputs_template,
    s.calendar_id,
    s.pre_dispatch_condition,
    s.inputs_rotation,
    s.last_rotation_index,
    w.lenser_id
  INTO v_schedule
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  WHERE s.id = p_schedule_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Owner-only access for the preview. service_role calls present a NULL
  -- get_auth_lenser_id() and bypass the check below; UI calls (authenticated
  -- via PostgREST) must own the schedule.
  IF lensers.get_auth_lenser_id() IS NOT NULL
     AND v_schedule.lenser_id IS DISTINCT FROM lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'Schedule not found or not owned by the active workspace'
      USING ERRCODE = '42501';
  END IF;

  v_ctx := lenses.fn_build_schedule_condition_context(p_schedule_id);

  WHILE v_emitted < v_n AND v_step < v_horizon_min LOOP
    v_step := v_step + 1;
    IF NOT lenses.fn_cron_matches_now(v_schedule.cron_expr, v_cursor) THEN
      v_cursor := v_cursor + interval '1 minute';
      CONTINUE;
    END IF;

    -- Guard 1: calendar.
    IF NOT lenses.fn_check_calendar(v_schedule.calendar_id, v_cursor) THEN
      v_decision := 'skip';
      v_reason   := 'calendar';
      v_inputs   := NULL;
    ELSE
      -- Guard 2: condition.
      v_pass := true;
      IF v_schedule.pre_dispatch_condition IS NOT NULL THEN
        BEGIN
          v_pass := automation.fn_eval_filter(v_schedule.pre_dispatch_condition, v_ctx);
        EXCEPTION WHEN OTHERS THEN
          v_pass := false;
        END;
      END IF;

      IF v_pass IS DISTINCT FROM true THEN
        v_decision := 'skip';
        v_reason   := 'condition_failed';
        v_inputs   := NULL;
      ELSE
        -- Guard 3: rotation pick (preview-only — does NOT mutate counter).
        IF v_schedule.inputs_rotation IS NOT NULL
           AND jsonb_typeof(v_schedule.inputs_rotation) = 'array'
           AND jsonb_array_length(v_schedule.inputs_rotation) > 0 THEN
          v_rotation_len := jsonb_array_length(v_schedule.inputs_rotation);
          v_rotation_idx := (COALESCE(v_schedule.last_rotation_index, 0) + v_emitted) % v_rotation_len;
          v_inputs := COALESCE(v_schedule.inputs_rotation -> v_rotation_idx, '{}'::jsonb);
        ELSE
          v_inputs := COALESCE(v_schedule.inputs_template, '{}'::jsonb);
        END IF;

        v_decision := 'dispatch';
        v_reason   := 'ok';
      END IF;
    END IF;

    tick_at  := v_cursor;
    decision := v_decision;
    reason   := v_reason;
    inputs   := v_inputs;
    RETURN NEXT;

    v_emitted := v_emitted + 1;
    v_cursor  := v_cursor + interval '1 minute';
  END LOOP;

  RETURN;
END;
$$;

ALTER FUNCTION lenses.fn_preview_schedule_ticks(uuid, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION lenses.fn_preview_schedule_ticks(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lenses.fn_preview_schedule_ticks(uuid, int)
  TO authenticated, service_role;

COMMENT ON FUNCTION lenses.fn_preview_schedule_ticks(uuid, int) IS
  'Phase W: dry-run helper. Steps forward minute-by-minute, returns the next '
  'N ticks whose cron matches and labels each as dispatch/skip with a reason. '
  'Uses fn_cron_matches_now as the schedule oracle (no cron.next_run helper '
  'is exposed by Supabase pg_cron). prior_run_result and last_24h_stats are '
  'snapshotted once and reused across all preview ticks.';

-- ─── 7. Seed calendars ──────────────────────────────────────────────────────
--
-- Seed rows are owned by the all-zeros UUID sentinel; is_seed=true makes them
-- visible to all authenticated users via the SELECT policy. Upserts are keyed
-- on (lenser_id, name) using the unique index defined above.

DO $seeds$
DECLARE
  v_seed_owner uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_us_dates   date[] := ARRAY[
    -- US federal holidays 2026 (observed dates).
    '2026-01-01',  -- New Year's Day
    '2026-01-19',  -- Birthday of Martin Luther King, Jr.
    '2026-02-16',  -- Washington's Birthday
    '2026-05-25',  -- Memorial Day
    '2026-06-19',  -- Juneteenth National Independence Day
    '2026-07-03',  -- Independence Day (observed; July 4 falls on Saturday)
    '2026-09-07',  -- Labor Day
    '2026-10-12',  -- Columbus Day
    '2026-11-11',  -- Veterans Day
    '2026-11-26',  -- Thanksgiving Day
    '2026-12-25'   -- Christmas Day
  ]::date[];
  v_tr_dates   date[] := ARRAY[
    -- Turkish national + religious public holidays 2026 (observed).
    '2026-01-01',  -- Yılbaşı
    '2026-03-20',  -- Ramazan Bayramı arefe (yarım gün) — kept as full skip
    '2026-03-21',  -- Ramazan Bayramı 1
    '2026-03-22',  -- Ramazan Bayramı 2
    '2026-03-23',  -- Ramazan Bayramı 3
    '2026-04-23',  -- Ulusal Egemenlik ve Çocuk Bayramı
    '2026-05-01',  -- Emek ve Dayanışma Günü
    '2026-05-19',  -- Atatürk'ü Anma, Gençlik ve Spor Bayramı
    '2026-05-26',  -- Kurban Bayramı arefe (yarım gün)
    '2026-05-27',  -- Kurban Bayramı 1
    '2026-05-28',  -- Kurban Bayramı 2
    '2026-05-29',  -- Kurban Bayramı 3
    '2026-05-30',  -- Kurban Bayramı 4
    '2026-07-15',  -- Demokrasi ve Milli Birlik Günü
    '2026-08-30',  -- Zafer Bayramı
    '2026-10-29'   -- Cumhuriyet Bayramı
  ]::date[];
  v_weekends   date[];
BEGIN
  -- Generate every Saturday and Sunday of 2026.
  SELECT array_agg(d::date ORDER BY d)
    INTO v_weekends
  FROM generate_series(
         '2026-01-01'::date,
         '2026-12-31'::date,
         interval '1 day'
       ) AS d
  WHERE EXTRACT(ISODOW FROM d) IN (6, 7);

  INSERT INTO lenses.schedule_calendars (
    lenser_id, name, kind, dates, timezone, is_seed
  ) VALUES (
    v_seed_owner,
    'us-federal-holidays-2026',
    'skip_dates',
    v_us_dates,
    'America/New_York',
    true
  )
  ON CONFLICT (lenser_id, name) DO NOTHING;

  INSERT INTO lenses.schedule_calendars (
    lenser_id, name, kind, dates, timezone, is_seed
  ) VALUES (
    v_seed_owner,
    'tr-public-holidays-2026',
    'skip_dates',
    v_tr_dates,
    'Europe/Istanbul',
    true
  )
  ON CONFLICT (lenser_id, name) DO NOTHING;

  INSERT INTO lenses.schedule_calendars (
    lenser_id, name, kind, dates, timezone, is_seed
  ) VALUES (
    v_seed_owner,
    'weekends-only',
    'only_dates',
    v_weekends,
    'UTC',
    true
  )
  ON CONFLICT (lenser_id, name) DO NOTHING;
END
$seeds$;

-- ─── 8. Documentation hooks on workflow_schedules ────────────────────────────

COMMENT ON COLUMN lenses.workflow_schedules.last_rotation_index IS
  'Phase W3: monotonic counter incremented each tick the rotation array is '
  'used. The selected entry index is (last_rotation_index % array_length). '
  'Reset to 0 by the operator if the rotation array shape changes.';
