-- Worker runtime stability (deep-review fixes C3, H2, H3 DB surface).
--
-- All changes are additive or backward-compatible CREATE OR REPLACE. No table
-- alterations, no data migration, no permission widening.
--
--   • fn_worker_finalize_team_run            — terminal write for team runs that
--     also records an error message (the existing fn_worker_update_team_run_status
--     only accepts p_completed_at, so the old worker's p_error_message call was a
--     no-op). C3.
--   • fn_worker_get_run_exec_context         — full execution context for an
--     arbitrary workflow run, used by crash recovery. H3.
--   • fn_worker_create_team_run_workflow_run — creates/links the workflow_run a
--     team run executes, stamping run_worker_id + heartbeat_at so recovery does
--     not steal it. C3.
--   • fn_workflows_dispatch_on_event         — now idempotent per (workflow,
--     trigger, event signature) so N worker replicas cannot create N duplicate
--     runs for the same battle transition. H2.
--   • fn_worker_set_workflow_run_status      — service-role-safe terminal write.
--     fn_update_workflow_run_status gates on lensers.get_auth_lenser_id() (NULL
--     for the worker), raising 42501 for PRIVATE workflows so runs never reach a
--     terminal state — which the new recovery loop would otherwise re-execute
--     forever. Worker-only, no auth gate. (Blocker fix.)
--   • lenses.fn_claim_scheduled_workflow_run — now stamps heartbeat_at +
--     run_worker_id at claim time, closing the cross-process race where the
--     recovery loop (heartbeat_at IS NULL ⇒ stale) could steal a freshly
--     claimed run.
--   • fn_worker_claim_scheduled_workflow_run — wrapper return type corrected
--     from 6 mismatched columns (inputs/model_id) to the 7 the inner function
--     actually returns; the old declaration raised 42804 on every call, so
--     scheduled runs were never claimable.

-- ─────────────────────────────────────────────────────────────────────────────
-- C3: terminal write for team runs (records error into metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_finalize_team_run"(
  "p_team_run_id" "uuid",
  "p_status" "text",
  "p_error_message" "text" DEFAULT NULL::"text"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents'
    AS $$
BEGIN
  IF p_status NOT IN ('completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'fn_worker_finalize_team_run: invalid terminal status %', p_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE agents.team_runs
  SET status       = p_status,
      completed_at = now(),
      updated_at   = now(),
      metadata     = CASE
                       WHEN p_error_message IS NULL THEN metadata
                       ELSE metadata || jsonb_build_object('error', p_error_message)
                     END
  WHERE id = p_team_run_id;
END;
$$;

ALTER FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") IS
  'Worker-only: terminal status write for agents.team_runs, recording an error message into metadata. C3.';

-- ─────────────────────────────────────────────────────────────────────────────
-- H3: full execution context for crash recovery of an arbitrary workflow run
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_get_run_exec_context"(
  "p_run_id" "uuid"
) RETURNS TABLE(
  "workflow_id" "uuid",
  "context_inputs" "jsonb",
  "global_model_id" "text",
  "ai_lenser_id" "uuid"
)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    AS $$
  SELECT wr.workflow_id, wr.context_inputs, wr.global_model_id, wr.ai_lenser_id
  FROM lenses.workflow_runs wr
  WHERE wr.id = p_run_id;
$$;

ALTER FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") IS
  'Worker-only: returns workflow_id, context_inputs, global_model_id, ai_lenser_id for a run. Used by crash recovery. H3.';

-- ─────────────────────────────────────────────────────────────────────────────
-- C3: create (or reuse) the workflow_run a team run executes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_create_team_run_workflow_run"(
  "p_team_run_id" "uuid",
  "p_worker_id" "text"
) RETURNS TABLE(
  "run_id" "uuid",
  "workflow_id" "uuid",
  "context_inputs" "jsonb",
  "global_model_id" "text",
  "ai_lenser_id" "uuid"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lenses'
    AS $$
DECLARE
  v_workflow_id   uuid;
  v_ai_lenser     uuid;
  v_inputs        jsonb;
  v_depth         integer;
  v_existing_run  uuid;
  v_run_id        uuid;
BEGIN
  SELECT tr.workflow_id, tr.ai_lenser_id,
         COALESCE(tr.metadata->'inputs', '{}'::jsonb),
         COALESCE(tr.recursion_depth, 0),
         tr.workflow_run_id
    INTO v_workflow_id, v_ai_lenser, v_inputs, v_depth, v_existing_run
  FROM agents.team_runs tr
  WHERE tr.id = p_team_run_id;

  IF v_workflow_id IS NULL THEN
    RAISE EXCEPTION 'fn_worker_create_team_run_workflow_run: team_run % has no workflow_id', p_team_run_id
      USING ERRCODE = '22023';
  END IF;

  -- Idempotent re-claim: reuse an already-linked run instead of creating a new one.
  IF v_existing_run IS NOT NULL THEN
    UPDATE lenses.workflow_runs r
    SET status        = 'running',
        run_worker_id = p_worker_id,
        heartbeat_at  = now(),
        started_at    = COALESCE(r.started_at, now())
    WHERE r.id = v_existing_run
      AND r.status IN ('queued', 'pending', 'running', 'streaming', 'recovered');
    v_run_id := v_existing_run;
  ELSE
    INSERT INTO lenses.workflow_runs
      (workflow_id, status, context_inputs, trigger_mode, ai_lenser_id,
       run_worker_id, heartbeat_at, started_at, recursion_depth)
    VALUES
      (v_workflow_id, 'running', v_inputs, 'subflow', v_ai_lenser,
       p_worker_id, now(), now(), LEAST(GREATEST(v_depth, 0), 8))
    RETURNING id INTO v_run_id;

    UPDATE agents.team_runs SET workflow_run_id = v_run_id, updated_at = now()
    WHERE id = p_team_run_id;
  END IF;

  RETURN QUERY
  SELECT v_run_id, v_workflow_id, v_inputs, NULL::text, v_ai_lenser;
END;
$$;

ALTER FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") IS
  'Worker-only: creates/links + claims the workflow_run a team run executes. C3.';

-- ─────────────────────────────────────────────────────────────────────────────
-- H2: idempotent event dispatch — N replicas cannot create N duplicate runs.
-- Behaviour preserved (one run per matching enabled trigger, trigger_mode kept
-- as 'schedule' so the scheduled-run claim still picks it up) but deduped per
-- (workflow, trigger, event signature) within a 1h window.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_workflows_dispatch_on_event"(
  "p_event_type" "text",
  "p_event_payload" "jsonb"
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
  rec        RECORD;
  dispatched INT := 0;
  v_sig      text := COALESCE(p_event_payload->>'battle_id', '') || ':' || COALESCE(p_event_payload->>'status', '');
  v_key      text;
BEGIN
  FOR rec IN
    SELECT wt.id AS trigger_id, wt.workflow_id, wt.owner_id
      FROM lenses.workflow_triggers wt
     WHERE wt.enabled = TRUE
       AND wt.trigger_type = p_event_type
       AND public.fn_workflows_evaluate_condition(wt.condition, p_event_payload)
  LOOP
    v_key := p_event_type || ':' || v_sig || ':' || rec.trigger_id::text;

    -- Serialize concurrent dispatchers (replicas) competing for the same key.
    PERFORM pg_advisory_xact_lock(hashtext(v_key)::bigint);

    IF EXISTS (
      SELECT 1 FROM lenses.workflow_runs r
       WHERE r.workflow_id = rec.workflow_id
         AND r.idempotency_key = v_key
         AND r.created_at > now() - interval '1 hour'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO lenses.workflow_runs
      (workflow_id, triggered_by, status, context_inputs, trigger_mode,
       idempotency_key, idempotency_expires_at)
    VALUES
      (rec.workflow_id, NULL, 'pending', p_event_payload, 'schedule',
       v_key, now() + interval '1 hour');

    UPDATE lenses.workflow_triggers SET last_fired_at = now() WHERE id = rec.trigger_id;

    dispatched := dispatched + 1;
  END LOOP;

  RETURN dispatched;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Blocker: service-role-safe terminal status write for workflow runs.
-- Mirrors fn_update_workflow_run_status WITHOUT the caller-auth check, so the
-- worker can finalize private-workflow runs. Worker-only (service_role).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_set_workflow_run_status"(
  "p_run_id" "uuid",
  "p_status" "text"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
BEGIN
  UPDATE lenses.workflow_runs
  SET status        = p_status,
      started_at    = CASE WHEN p_status IN ('running', 'streaming') AND started_at IS NULL
                             THEN now() ELSE started_at END,
      completed_at  = CASE WHEN p_status IN ('completed', 'failed', 'cancelled', 'timed_out')
                             THEN now() ELSE completed_at END,
      run_worker_id = CASE WHEN p_status IN ('completed', 'failed', 'cancelled', 'timed_out')
                             THEN NULL ELSE run_worker_id END
  WHERE id = p_run_id;
END;
$$;

ALTER FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") IS
  'Worker-only: terminal/status write for lenses.workflow_runs without the human-auth gate of fn_update_workflow_run_status. Prevents 42501 on private workflows (which would make the recovery loop re-execute forever).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Heartbeat race: stamp heartbeat_at + run_worker_id when a scheduled run is
-- claimed, so the crash-recovery loop cannot reclaim a run that was just picked
-- up (its heartbeat_at would otherwise be NULL = immediately stale). Return
-- signature unchanged → CREATE OR REPLACE is valid.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_claim_scheduled_workflow_run"(
  "p_worker_id" "text"
) RETURNS TABLE(
  "run_id" "uuid",
  "workflow_id" "uuid",
  "schedule_id" "uuid",
  "triggered_by" "uuid",
  "context_inputs" "jsonb",
  "global_model_id" "text",
  "ai_lenser_id" "uuid"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
  v_run lenses.workflow_runs;
BEGIN
  IF public.fn_kill_switch_active('system') THEN
    RETURN;
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
  SET    status        = 'running',
         started_at    = COALESCE(started_at, now()),
         run_worker_id = p_worker_id,
         heartbeat_at  = now()
  WHERE  id = v_run.id;

  RETURN QUERY
  SELECT v_run.id, v_run.workflow_id, v_run.schedule_id, v_run.triggered_by,
         v_run.context_inputs, v_run.global_model_id, v_run.ai_lenser_id;
END;
$$;

ALTER FUNCTION "lenses"."fn_claim_scheduled_workflow_run"("text") OWNER TO "postgres";

-- ─────────────────────────────────────────────────────────────────────────────
-- Wrapper return-type fix. The previous declaration returned 6 columns
-- (inputs jsonb, model_id uuid) but RETURN QUERY SELECT * from the inner
-- function yields 7 (context_inputs jsonb, global_model_id text, …), so every
-- call raised 42804. CREATE OR REPLACE cannot change a return type, so drop and
-- recreate with the correct signature, then restore grants.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."fn_worker_claim_scheduled_workflow_run"("text");

CREATE FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"(
  "p_worker_id" "text"
) RETURNS TABLE(
  "run_id" "uuid",
  "workflow_id" "uuid",
  "schedule_id" "uuid",
  "triggered_by" "uuid",
  "context_inputs" "jsonb",
  "global_model_id" "text",
  "ai_lenser_id" "uuid"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM lenses.fn_claim_scheduled_workflow_run(p_worker_id);
END;
$$;

ALTER FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("text") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("text") IS
  'Worker-only: claim the next pending scheduled workflow run. Delegates to lenses.fn_claim_scheduled_workflow_run. Return type corrected to 7 columns.';
