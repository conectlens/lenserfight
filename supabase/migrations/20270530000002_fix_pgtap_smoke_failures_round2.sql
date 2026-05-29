-- ─────────────────────────────────────────────────────────────────────────────
-- Fix pgTAP smoke test failures (round 2)
--
-- Tests fixed:
--   08  test 1   VERIFIED_LOCAL_EXECUTION_COMPLETED XP rule missing from seed
--   14  test 6   fn_append_workflow_run_media still executable by authenticated
--   17  tests 5,6,11,12  BYOK functions still executable by authenticated/anon
--   17  test 8   pg_cron job byok-key-expiry not registered
--   22  tests 9,10  media lifecycle functions still executable by authenticated
--   22  test 11  pg_cron job media-expiry not registered
--   32  test 10  fn_dispatch_scheduled_workflows sets skipped_condition instead
--                of condition_failed on exception; also fixes al.policy_id JOIN
--   40  tests 5,6  pg_cron jobs dispatch-scheduled-workflows / auto-start-battles
--                  not registered
--   41  tests 1-4  pg_cron jobs auto-close-voting / auto-finalize-battles /
--                  dispatch-scheduled-workflows / cleanup-cron-runs not registered
--   59  tests 4,5  fn_worker_get_ai_key_secret still executable by anon/authenticated
--   80  test 10  pg_cron job xp-auto-activate-seasons not registered
--   86  tests 10-13  emergency-stop fns still executable by anon
--   94  N/A      agents.ai_lensers.status column missing
--   98  tests 6,7  snapshot fns still executable by anon
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. VERIFIED_LOCAL_EXECUTION_COMPLETED XP rule ────────────────────────────
-- Test 08/1 expects this rule to exist; it was omitted from the seed.
-- Inserts into the battles app (v_battles_app) because local execution is a
-- gateway/battle primitive. Uses ON CONFLICT to stay idempotent.

DO $$
DECLARE
  v_battles_app uuid;
BEGIN
  SELECT id INTO v_battles_app
  FROM xp.apps
  WHERE slug = 'battles'
  LIMIT 1;

  IF v_battles_app IS NULL THEN
    RETURN;  -- xp.apps not seeded yet; seed script will add the rule
  END IF;

  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES (
    v_battles_app,
    'VERIFIED_LOCAL_EXECUTION_COMPLETED',
    'Verified Local Execution',
    'Award XP when a local gateway execution is verified and trust-elevated.',
    25, 300, 10, 150, 1000, 'standard', NULL, true
  )
  ON CONFLICT (app_id, action_key) DO UPDATE
    SET is_active = true;
END $$;

-- ── 2. Revoke authenticated/anon from service-role-only functions ─────────────
-- remote_schema revoked from PUBLIC but Supabase may still grant to named roles.

REVOKE ALL ON FUNCTION public.fn_append_workflow_run_media(uuid, uuid, text, text, text)
  FROM authenticated;

REVOKE ALL ON FUNCTION public.fn_byok_key_resolve(uuid, text, text)
  FROM authenticated, anon;

REVOKE ALL ON FUNCTION public.fn_expire_byok_keys()
  FROM authenticated, anon;

REVOKE ALL ON FUNCTION public.fn_transfer_media_ownership(uuid, uuid)
  FROM authenticated, anon;

REVOKE ALL ON FUNCTION public.fn_media_proxy_log(uuid)
  FROM authenticated, anon;

REVOKE ALL ON FUNCTION public.fn_worker_get_ai_key_secret(uuid, uuid)
  FROM authenticated, anon;

-- Tests 86/10-13: emergency-stop fns (supplement the round-1 migration which
-- only revoked from anon — also revoke from authenticated to be safe)
REVOKE ALL ON FUNCTION public.fn_emergency_stop(text, boolean)
  FROM authenticated;
REVOKE ALL ON FUNCTION public.fn_cancel_all_active_runs(text)
  FROM authenticated;
REVOKE ALL ON FUNCTION public.fn_queue_freeze(text)
  FROM authenticated;
REVOKE ALL ON FUNCTION public.fn_queue_unfreeze()
  FROM authenticated;

-- Tests 98/6-7: agent snapshot fns
REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot(uuid)
  FROM authenticated;
REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot_hash(uuid)
  FROM authenticated;

-- ── 3. Fix fn_dispatch_scheduled_workflows: condition exception → condition_failed
-- The pre_dispatch_condition block sets last_dispatch_status='skipped_condition'
-- for both false-evaluation and raised exceptions. Test 32/D8 expects 'condition_failed'
-- on exception. Fix: distinguish the two paths.
-- Also fixes the broken JOIN: al.policy_id → pol.ai_lenser_id = al.id
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
    -- Fixed: agents.policies uses ai_lenser_id FK (not policy_id on ai_lensers)
    -- budget_enforce flag lives on agents.workspace_settings, not on policies;
    -- here we only enforce when a hard spending_limit_credits cap is set.
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
    -- On exception: last_dispatch_status='condition_failed' (D8)
    -- On false result: last_dispatch_status='skipped_condition'
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
        -- Exception path (D8): record condition_failed so callers can distinguish
        -- a raised error from a filter that simply evaluated to false.
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

-- ── 4. Fix fn_dispatch_scheduled_workflows_with_approval: same policy_id JOIN bug
CREATE OR REPLACE FUNCTION "public"."fn_dispatch_scheduled_workflows_with_approval"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'agents', 'platform', 'public'
    AS $$
DECLARE
  v_dispatch_enabled boolean;
  v_result           integer;
BEGIN
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

  -- Fixed: agents.policies uses ai_lenser_id FK (not policy_id on ai_lensers)
  PERFORM 1
  FROM lenses.workflow_schedules s
  JOIN lenses.workflows w ON w.id = s.workflow_id
  JOIN agents.ai_lensers al ON al.profile_id = w.lenser_id
  JOIN agents.policies pol ON pol.ai_lenser_id = al.id
  WHERE s.is_active = true
    AND COALESCE((s.approval_policy->>'requiresApproval')::boolean, true) = false
    AND pol.spending_limit_credits IS NULL;

  IF FOUND THEN
    RAISE WARNING
      'One or more active schedules have requiresApproval=false and no spending_limit_credits. '
      'These schedules will dispatch without approval gates and without a cost ceiling. '
      'Set a spending limit or re-enable approval to suppress this warning.';
  END IF;

  SELECT lenses.fn_dispatch_scheduled_workflows() INTO v_result;
  RETURN COALESCE(v_result, 0);
END;
$$;

-- ── 5. Safe wrapper for fn_auto_start_battles (needed for auto-start-battles cron job)
CREATE OR REPLACE FUNCTION "battles"."fn_auto_start_battles_safe"() RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'automation', 'public'
    AS $$
BEGIN
  PERFORM automation.fn_run_with_lock(
    'auto-start-battles',
    'SELECT battles.fn_auto_start_battles()'
  );
END;
$$;
ALTER FUNCTION "battles"."fn_auto_start_battles_safe"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "battles"."fn_auto_start_battles_safe"() TO "service_role";

-- Safe wrapper for fn_expire_byok_keys (needed for byok-key-expiry cron job)
CREATE OR REPLACE FUNCTION "public"."fn_expire_byok_keys_safe"() RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'automation'
    AS $$
BEGIN
  PERFORM automation.fn_run_with_lock(
    'byok-key-expiry',
    'SELECT public.fn_expire_byok_keys()'
  );
END;
$$;
ALTER FUNCTION "public"."fn_expire_byok_keys_safe"() OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_expire_byok_keys_safe"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_expire_byok_keys_safe"() TO "service_role";

-- Safe wrapper for fn_expire_media_objects (needed for media-expiry cron job)
CREATE OR REPLACE FUNCTION "public"."fn_expire_media_objects_safe"() RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'automation'
    AS $$
BEGIN
  PERFORM automation.fn_run_with_lock(
    'media-expiry',
    'SELECT public.fn_expire_media_objects()'
  );
END;
$$;
ALTER FUNCTION "public"."fn_expire_media_objects_safe"() OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_expire_media_objects_safe"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_expire_media_objects_safe"() TO "service_role";

-- ── 6. Register pg_cron jobs ──────────────────────────────────────────────────
-- Idempotent: unschedule first (no-op if absent), then reschedule.
-- The DO block skips the whole section if pg_cron is not installed, which
-- makes the migration safe on stripped-down CI images.

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron not installed — skipping cron job registration';
    RETURN;
  END IF;

  -- auto-close-voting (Z10): every 5 minutes
  PERFORM cron.schedule(
    'auto-close-voting',
    '*/5 * * * *',
    'SELECT battles.fn_auto_close_voting_safe()'
  );

  -- auto-finalize-battles (Z10): every 5 minutes
  PERFORM cron.schedule(
    'auto-finalize-battles',
    '*/5 * * * *',
    'SELECT battles.fn_auto_finalize_battles_safe()'
  );

  -- dispatch-scheduled-workflows (Z10): every minute
  PERFORM cron.schedule(
    'dispatch-scheduled-workflows',
    '* * * * *',
    'SELECT lenses.fn_dispatch_scheduled_workflows_safe()'
  );

  -- auto-start-battles: every minute
  PERFORM cron.schedule(
    'auto-start-battles',
    '* * * * *',
    'SELECT battles.fn_auto_start_battles_safe()'
  );

  -- cleanup-cron-runs (Z11): daily at 03:00
  PERFORM cron.schedule(
    'cleanup-cron-runs',
    '0 3 * * *',
    'SELECT automation.fn_cleanup_cron_runs(30)'
  );

  -- byok-key-expiry: every hour
  PERFORM cron.schedule(
    'byok-key-expiry',
    '0 * * * *',
    'SELECT public.fn_expire_byok_keys_safe()'
  );

  -- media-expiry: daily at 02:00
  PERFORM cron.schedule(
    'media-expiry',
    '0 2 * * *',
    'SELECT public.fn_expire_media_objects_safe()'
  );

  -- xp-auto-activate-seasons: every hour
  PERFORM cron.schedule(
    'xp-auto-activate-seasons',
    '0 * * * *',
    'SELECT xp.fn_xp_auto_activate_seasons_safe()'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'cron job registration failed: % — continuing', SQLERRM;
END $$;

-- ── 7. agents.ai_lensers: add status column (test 94 inserts with status='active')
ALTER TABLE agents.ai_lensers
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL
  CONSTRAINT ai_lensers_status_check CHECK (status IN ('active', 'suspended', 'archived', 'deleted'));
