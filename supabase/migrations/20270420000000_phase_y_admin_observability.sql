-- Phase Y: Admin observability RPCs + bulk approval helper.
--
-- Adds three platform-level RPCs and one agents-level RPC:
--
--   1. agents.fn_bulk_approve(p_filters jsonb)
--        Owner-scoped bulk transition of pending team_runs -> approved.
--        Backs `lf approval bulk-approve` in the CLI (Phase Y3 dependency).
--
--   2. platform.fn_queue_stats()
--        Single-shot snapshot of dispatcher backlog, in-flight runs, webhook
--        outbox health, and the autonomy_dispatch_enabled kill-switch flag.
--        Backs `lf platform status` (CLI Phase Y5).
--
--   3. platform.fn_recent_audit_events(p_since interval)
--        Flat union of moderation decisions, webhook failures, agent action
--        logs and automation events for the admin tail-logs view. Backs
--        `lf platform tail-logs`.
--
--   4. platform.fn_set_autonomy_dispatch_enabled(p_enabled boolean)
--        Flip the autonomy_dispatch_enabled kill-switch in
--        platform.system_flags. Backs `lf platform pause-dispatch` /
--        `resume-dispatch`.
--
-- Reconciliations vs the spec:
--
--   * The kill-switch flag lives in platform.system_flags as a key='autonomy_dispatch_enabled'
--     row (jsonb value), NOT a dedicated column. See
--     20270305000000_phase2_platform_system_flags.sql. We read/write via
--     `value` jsonb cast to boolean.
--
--   * No prior `platform.fn_set_autonomy_dispatch*` RPC exists — the canonical
--     dispatch gate (20270301000000) reads the flag directly. We introduce
--     fn_set_autonomy_dispatch_enabled here.
--
--   * No worker registry table exists yet; fn_queue_stats reports
--     workers={active:0,idle:0} and carries a TODO for a future worker
--     heartbeat table.
--
--   * action_logs.action_type CHECK gets extended with 'approval_granted_bulk'.
--     The latest baseline (20270325100000_phase_q_standing_approvals.sql) is
--     used as the source-of-truth list for the new constraint.

BEGIN;

-- ─── 1. Extend agents.action_logs CHECK to allow approval_granted_bulk ──────
-- Source-of-truth list: 20270325100000_phase_q_standing_approvals.sql line
-- 158-166. Adding 'approval_granted_bulk' for the new bulk-approve RPC.

ALTER TABLE agents.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check,
  ADD CONSTRAINT action_logs_type_check CHECK (
    action_type = ANY (ARRAY[
      'join_battle', 'cast_vote', 'submit_entry', 'create_battle', 'spend_credits',
      'dispatch_schedule', 'schedule_skipped', 'policy_updated',
      'run_lens', 'run_workflow', 'pause_schedule', 'resume_schedule',
      'binding_updated',
      'standing_approval_granted', 'standing_approval_revoked',
      'approval_granted_bulk'
    ])
  );

-- ─── 2. agents.fn_bulk_approve ──────────────────────────────────────────────
-- Bulk-transition pending team_runs -> approved for the calling owner.
--
-- Filter shape (all optional):
--   {
--     "status":      text,    -- approval_status to match (default 'pending')
--     "since":       text,    -- interval string (default '1 hour')
--     "workflow_id": uuid     -- optional workflow filter
--   }
--
-- Ownership is enforced via agents.can_manage_ai_lenser(team_runs.ai_lenser_id);
-- rows the caller does not own are silently skipped (no error leak).
--
-- Returns the count of rows transitioned. Idempotent: only rows in the
-- filter status (default 'pending') are matched, so repeat calls are no-ops.
-- The actual UPDATE additionally re-checks approval_status='pending' to
-- guarantee no double-flip across concurrent callers.
--
-- Mirrors the workflow_run resume mechanics of public.fn_decide_approval
-- (20260429015000_approval_decide.sql): on approve, flip the underlying
-- workflow_run from pending/queued back to queued so the recovery sweeper
-- can pick it up.

CREATE OR REPLACE FUNCTION agents.fn_bulk_approve(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'agents', 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_status      text       := COALESCE(p_filters->>'status', 'pending');
  v_since_text  text       := COALESCE(p_filters->>'since', '1 hour');
  v_since       interval;
  v_workflow_id uuid       := NULLIF(p_filters->>'workflow_id', '')::uuid;
  v_cutoff      timestamptz;
  v_actor       uuid;
  v_now         timestamptz := now();
  v_approved    integer    := 0;
  r             RECORD;
BEGIN
  v_actor := lensers.get_auth_human_lenser_id();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_since := v_since_text::interval;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid since="%". Expected a Postgres interval string.', v_since_text
      USING ERRCODE = '22023';
  END;

  v_cutoff := v_now - v_since;

  FOR r IN
    SELECT tr.id, tr.ai_lenser_id, tr.workflow_run_id, tr.workflow_id, tr.metadata
    FROM   agents.team_runs tr
    WHERE  tr.approval_status = v_status
      AND  tr.created_at      > v_cutoff
      AND  (v_workflow_id IS NULL OR tr.workflow_id = v_workflow_id)
      AND  agents.can_manage_ai_lenser(tr.ai_lenser_id)
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Defence-in-depth: only flip if still pending. Skip silently otherwise.
    UPDATE agents.team_runs
       SET approval_status = 'approved',
           status          = 'queued',
           metadata        = COALESCE(metadata, '{}'::jsonb)
                               || jsonb_build_object(
                                    'decision_at',           v_now,
                                    'decision_by_lenser_id', v_actor,
                                    'decision_source',       'bulk_approve'
                                  ),
           updated_at      = v_now
     WHERE id = r.id
       AND approval_status = 'pending';

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF r.workflow_run_id IS NOT NULL THEN
      UPDATE lenses.workflow_runs
         SET status = 'pending'
       WHERE id = r.workflow_run_id
         AND status IN ('pending');
    END IF;

    INSERT INTO agents.action_logs (
      ai_lenser_id, action_type, context_ref_type, context_ref_id, result, metadata
    )
    VALUES (
      r.ai_lenser_id,
      'approval_granted_bulk',
      'team_run',
      r.id,
      'success',
      jsonb_build_object(
        'workflow_id',          r.workflow_id,
        'workflow_run_id',      r.workflow_run_id,
        'decided_by_lenser_id', v_actor,
        'filters',              p_filters,
        'decided_at',           v_now
      )
    );

    INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
    VALUES (
      r.id,
      'approval_granted',
      jsonb_build_object(
        'decision',             'approved',
        'decision_source',      'bulk_approve',
        'decided_by_lenser_id', v_actor,
        'workflow_run_id',      r.workflow_run_id
      ),
      v_now
    );

    v_approved := v_approved + 1;
  END LOOP;

  RETURN v_approved;
END;
$$;

ALTER FUNCTION agents.fn_bulk_approve(jsonb) OWNER TO postgres;

REVOKE ALL ON FUNCTION agents.fn_bulk_approve(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agents.fn_bulk_approve(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION agents.fn_bulk_approve(jsonb) IS
  'Phase Y3: bulk-approve pending team_runs owned by the caller, filtered by '
  'jsonb {status, since, workflow_id}. Returns the count of rows transitioned. '
  'Rows the caller does not own (per agents.can_manage_ai_lenser) are silently '
  'skipped. Idempotent: only approval_status=pending rows are flipped.';

-- ─── 3. platform.fn_queue_stats ─────────────────────────────────────────────
-- Admin-only snapshot. Returns one jsonb document; service_role only.
--
-- workers: hard-zero — no worker heartbeat registry exists yet.
--   TODO(Phase Y6+): register workers in platform.workers (last_seen_at) and
--   bucket by NOW() - last_seen_at < 30s -> active, else idle.

CREATE OR REPLACE FUNCTION platform.fn_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'platform', 'lenses', 'automation', 'audit', 'public'
AS $$
DECLARE
  v_in_flight        integer;
  v_automation       integer;
  v_scheduled        integer;
  v_outbox_pending   integer;
  v_outbox_dead      integer;
  v_autonomy_enabled boolean;
BEGIN
  SELECT COUNT(*) INTO v_in_flight
  FROM   lenses.workflow_runs
  WHERE  status IN ('pending', 'running');

  SELECT COUNT(*) INTO v_automation
  FROM   automation.events e
  LEFT JOIN automation.event_dispatches d ON d.event_id = e.id
  WHERE  d.event_id IS NULL;

  SELECT COUNT(*) INTO v_scheduled
  FROM   lenses.workflow_schedules
  WHERE  is_active = true
    AND  (last_run_at IS NULL OR last_run_at < now() - interval '5 minutes');

  SELECT COUNT(*) INTO v_outbox_pending
  FROM   audit.webhook_outbox
  WHERE  delivered_at IS NULL
    AND  dead_lettered_at IS NULL;

  SELECT COUNT(*) INTO v_outbox_dead
  FROM   audit.webhook_outbox
  WHERE  dead_lettered_at IS NOT NULL;

  SELECT COALESCE((value)::text::boolean, true) INTO v_autonomy_enabled
  FROM   platform.system_flags
  WHERE  key = 'autonomy_dispatch_enabled';

  IF v_autonomy_enabled IS NULL THEN
    -- No row -> treat as enabled (matches dispatch-gate default).
    v_autonomy_enabled := true;
  END IF;

  RETURN jsonb_build_object(
    'workers',            jsonb_build_object('active', 0, 'idle', 0),
    'in_flight_runs',     v_in_flight,
    'dispatcher_backlog', jsonb_build_object(
      'automation',                 v_automation,
      'scheduled',                  v_scheduled,
      'webhook_outbox_undelivered', v_outbox_pending,
      'webhook_outbox_dead_lettered', v_outbox_dead
    ),
    'system_flags', jsonb_build_object(
      'autonomy_dispatch_enabled', v_autonomy_enabled
    )
  );
END;
$$;

ALTER FUNCTION platform.fn_queue_stats() OWNER TO postgres;

REVOKE ALL ON FUNCTION platform.fn_queue_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_queue_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION platform.fn_queue_stats() TO service_role;

COMMENT ON FUNCTION platform.fn_queue_stats() IS
  'Phase Y5: admin-only platform health snapshot (in-flight runs, dispatcher '
  'backlog, webhook outbox health, autonomy_dispatch_enabled flag). '
  'service_role only.';

-- ─── 4. platform.fn_recent_audit_events ─────────────────────────────────────
-- Flat-stream union of recent audit/automation/action events for the
-- admin tail-logs view. service_role only — surfaces cross-tenant data.

CREATE OR REPLACE FUNCTION platform.fn_recent_audit_events(
  p_since interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (
  occurred_at timestamptz,
  source      text,
  kind        text,
  summary     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'platform', 'audit', 'agents', 'automation', 'public'
AS $$
  WITH cutoff AS (SELECT now() - p_since AS t)
  SELECT * FROM (
    SELECT
      md.occurred_at                                                AS occurred_at,
      'audit.moderation_decisions'::text                            AS source,
      'moderation'::text                                            AS kind,
      (md.decision_type
        || COALESCE(' ' || left(md.target_entity_id::text, 8), ''))::text AS summary
    FROM audit.moderation_decisions md, cutoff
    WHERE md.occurred_at > cutoff.t

    UNION ALL

    SELECT
      COALESCE(wo.dead_lettered_at, wo.created_at)                  AS occurred_at,
      'audit.webhook_outbox'::text                                  AS source,
      'webhook_failure'::text                                       AS kind,
      COALESCE(wo.last_error, '(no error captured)')                AS summary
    FROM audit.webhook_outbox wo, cutoff
    WHERE (wo.dead_lettered_at IS NOT NULL AND wo.dead_lettered_at > cutoff.t)
       OR (wo.delivered_at IS NULL AND wo.last_error IS NOT NULL AND wo.created_at > cutoff.t)

    UNION ALL

    SELECT
      al.occurred_at                                                AS occurred_at,
      'agents.action_logs'::text                                    AS source,
      'action'::text                                                AS kind,
      al.action_type                                                AS summary
    FROM agents.action_logs al, cutoff
    WHERE al.occurred_at > cutoff.t

    UNION ALL

    SELECT
      ev.occurred_at                                                AS occurred_at,
      'automation.events'::text                                     AS source,
      'automation_event'::text                                      AS kind,
      ev.event_type                                                 AS summary
    FROM automation.events ev, cutoff
    WHERE ev.occurred_at > cutoff.t
  ) merged
  ORDER BY occurred_at DESC
  LIMIT 200;
$$;

ALTER FUNCTION platform.fn_recent_audit_events(interval) OWNER TO postgres;

REVOKE ALL ON FUNCTION platform.fn_recent_audit_events(interval) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_recent_audit_events(interval) FROM authenticated;
GRANT EXECUTE ON FUNCTION platform.fn_recent_audit_events(interval) TO service_role;

COMMENT ON FUNCTION platform.fn_recent_audit_events(interval) IS
  'Phase Y5: admin-only flat stream of recent audit + automation + agent '
  'action events for tail-logs. Capped at 200 rows. service_role only.';

-- ─── 5. platform.fn_set_autonomy_dispatch_enabled ───────────────────────────
-- Toggle the autonomy_dispatch_enabled kill-switch. service_role only.
-- No prior dedicated RPC exists for this (verified across migration history);
-- the dispatch gate at 20270301000000 reads platform.system_flags directly.

CREATE OR REPLACE FUNCTION platform.fn_set_autonomy_dispatch_enabled(p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'platform', 'public'
AS $$
BEGIN
  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'p_enabled must not be NULL.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO platform.system_flags (key, value, updated_at)
  VALUES ('autonomy_dispatch_enabled', to_jsonb(p_enabled), now())
  ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;
END;
$$;

ALTER FUNCTION platform.fn_set_autonomy_dispatch_enabled(boolean) OWNER TO postgres;

REVOKE ALL ON FUNCTION platform.fn_set_autonomy_dispatch_enabled(boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_set_autonomy_dispatch_enabled(boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION platform.fn_set_autonomy_dispatch_enabled(boolean) TO service_role;

COMMENT ON FUNCTION platform.fn_set_autonomy_dispatch_enabled(boolean) IS
  'Phase Y5: flip platform.system_flags.autonomy_dispatch_enabled. Backs '
  '`lf platform pause-dispatch` / `resume-dispatch`. service_role only.';

COMMIT;
