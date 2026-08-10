-- =============================================================================
-- Layer 1 (heartbeat + adoption) and Layer 3 (reap-and-fail backstop).
--
-- Builds on 20270608000001, which made `executor` the authority on who runs a
-- workflow run. This migration makes both executors provably alive-or-dead and
-- guarantees no run can sit non-terminal forever.
--
--   Layer 1 — liveness and adoption
--     • fn_heartbeat_client_workflow_run  — a browser tab driving a
--       client-executed run proves it is still alive. Until now nothing
--       distinguished "a tab is actively executing this" from "the tab is
--       gone", because fn_heartbeat_workflow_run is service_role-only and
--       fn_update_workflow_run_status never stamps heartbeat_at.
--     • fn_claim_stale_workflow_run       — now restricted to executor='worker'.
--       Previously it had no executor filter, so a browser-driven run that
--       reached 'queued' (which is exactly what the Retry button writes) was
--       claimable by the recovery loop with heartbeat_at IS NULL ⇒ instantly
--       stale, letting a worker re-execute a run a tab was still driving.
--     • fn_worker_get_completed_node_results — feeds resume-from-checkpoint so
--       adopting an abandoned run replays finished nodes instead of re-running
--       and re-billing them.
--
--   Layer 3 — backstop, deliberately independent of the above
--     • fn_reap_abandoned_workflow_runs   — retires any run that is
--       non-terminal past its TTL and cannot be adopted, plus its non-terminal
--       node_results. This is the safety net: if the heartbeat/adoption path
--       ever misses a run (bug, edge case, a client that never heartbeats),
--       the run still fails visibly instead of hanging forever.
--
-- ⚠️ Touches the claim predicate and adds a scheduled reaper. Apply against a
--    database and confirm a live browser run is NOT reaped while its tab is
--    open, and IS failed within the TTL after the tab closes.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Layer 1a. Client-side heartbeat.
--
-- Owner-gated rather than service-role: the caller is a browser tab holding the
-- run owner's JWT. Restricted to client-executed, non-terminal runs so it can
-- never resurrect a finished run or interfere with a worker-owned one.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_heartbeat_client_workflow_run"(
  "p_run_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'fn_heartbeat_client_workflow_run: authentication required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_runs r
  SET    heartbeat_at = now()
  WHERE  r.id       = p_run_id
    AND  r.executor = 'client'
    AND  r.status IN ('pending', 'queued', 'running', 'streaming', 'recovered')
    AND  EXISTS (
           SELECT 1 FROM lenses.workflows w
           WHERE w.id = r.workflow_id
             AND w.lenser_id = v_caller_id
         );
END;
$$;

ALTER FUNCTION "public"."fn_heartbeat_client_workflow_run"("uuid") OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_heartbeat_client_workflow_run"("uuid") FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION "public"."fn_heartbeat_client_workflow_run"("uuid") TO "authenticated", "service_role";

COMMENT ON FUNCTION "public"."fn_heartbeat_client_workflow_run"("uuid") IS
  'Called by the browser tab driving a client-executed run to prove it is still alive. Owner-gated; no-op for worker-executed or terminal runs. A run whose heartbeat goes stale is retired by fn_reap_abandoned_workflow_runs.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Layer 1b. The adoption claim only ever touches worker-executed runs.
--
-- Return signature unchanged → CREATE OR REPLACE is valid. Body is otherwise
-- identical to the definition in 20260519131536.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_claim_stale_workflow_run"(
  "p_worker_id" "text",
  "p_stale_after_ms" integer DEFAULT 60000,
  "p_max_claims" integer DEFAULT 1
) RETURNS TABLE(
  "run_id" "uuid",
  "workflow_id" "uuid",
  "parent_run_id" "uuid",
  "recursion_depth" integer,
  "previous_status" "text"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
  v_threshold interval := make_interval(secs => GREATEST(p_stale_after_ms, 0)::numeric / 1000.0);
BEGIN
  IF p_worker_id IS NULL OR length(p_worker_id) = 0 THEN
    RAISE EXCEPTION 'fn_claim_stale_workflow_run: p_worker_id is required'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT r.id, r.workflow_id, r.parent_run_id, r.recursion_depth, r.status
    FROM lenses.workflow_runs r
    WHERE r.status IN ('queued', 'running', 'streaming', 'recovered')
      -- Client-executed runs are driven by a browser tab whose credentials the
      -- server may not hold (user_byok_local). Adopting one would either
      -- double-execute a live run or fail on a missing key, so they are the
      -- reaper's business, not the recovery loop's.
      AND r.executor = 'worker'
      AND (
            r.heartbeat_at IS NULL
        OR  r.heartbeat_at < (now() - v_threshold)
      )
    ORDER BY COALESCE(r.heartbeat_at, r.started_at, r.created_at) ASC
    LIMIT GREATEST(p_max_claims, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE lenses.workflow_runs r
    SET status        = 'recovered',
        run_worker_id = p_worker_id,
        heartbeat_at  = now()
    FROM claimable c
    WHERE r.id = c.id
    RETURNING r.id, r.workflow_id, r.parent_run_id, r.recursion_depth, c.status AS previous_status
  )
  SELECT
    claimed.id,
    claimed.workflow_id,
    claimed.parent_run_id,
    claimed.recursion_depth,
    claimed.previous_status
  FROM claimed;
END;
$$;

ALTER FUNCTION "public"."fn_claim_stale_workflow_run"("text", integer, integer) OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_claim_stale_workflow_run"("text", integer, integer) FROM PUBLIC, "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_claim_stale_workflow_run"("text", integer, integer) TO "service_role";

COMMENT ON FUNCTION "public"."fn_claim_stale_workflow_run"("text", integer, integer) IS
  'Atomic claim of stale worker-executed workflow runs for the crash-recovery loop. FOR UPDATE SKIP LOCKED, so replicas race safely. Sets status=recovered and stamps run_worker_id + heartbeat_at. Never claims executor=client runs — those are retired by fn_reap_abandoned_workflow_runs.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Layer 1c. Resume-from-checkpoint input.
--
-- Recovery re-executes the graph from its roots. Without this, every node that
-- had already completed is re-invoked against the provider — re-billing the
-- owner and repeating side effects. The worker feeds these rows to the engine
-- as `resumeResults` so finished nodes are replayed, not re-run.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_get_completed_node_results"(
  "p_run_id" "uuid"
) RETURNS TABLE(
  "node_id" "uuid",
  "output_data" "jsonb"
)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    AS $$
  SELECT nr.node_id, nr.output_data
  FROM   lenses.workflow_node_results nr
  WHERE  nr.run_id = p_run_id
    AND  nr.status = 'completed';
$$;

ALTER FUNCTION "public"."fn_worker_get_completed_node_results"("uuid") OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_worker_get_completed_node_results"("uuid") FROM PUBLIC, "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_completed_node_results"("uuid") TO "service_role";

COMMENT ON FUNCTION "public"."fn_worker_get_completed_node_results"("uuid") IS
  'Worker-only: completed node results for a run, used as resume-from-checkpoint input so crash recovery replays finished nodes instead of re-invoking their providers.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Layer 3. The backstop.
--
-- Independent of the execution model on purpose: whatever else goes wrong, a
-- run stops being non-terminal within the TTL. Retires
--   • client-executed runs whose tab stopped heartbeating, and
--   • any run left non-terminal well past the TTL that no claimer will take
--     (notably the pre-existing orphans: trigger_mode='manual', status='pending',
--     heartbeat_at NULL, created before this migration).
-- Bounded per call so it can never become an unbounded write storm.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_reap_abandoned_workflow_runs"(
  "p_stale_after_ms" integer DEFAULT 300000,
  "p_max_runs" integer DEFAULT 100
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
  v_threshold interval := make_interval(secs => GREATEST(p_stale_after_ms, 0)::numeric / 1000.0);
  v_reaped    integer  := 0;
BEGIN
  WITH abandoned AS (
    SELECT r.id
    FROM   lenses.workflow_runs r
    WHERE  r.status IN ('pending', 'queued', 'running', 'streaming', 'recovered')
      AND  r.executor = 'client'
      -- Never reaped while the tab is heartbeating. A run that has not
      -- heartbeated at all is judged from creation, which is what retires the
      -- legacy orphans that predate the heartbeat.
      AND  COALESCE(r.heartbeat_at, r.started_at, r.created_at) < (now() - v_threshold)
    ORDER BY COALESCE(r.heartbeat_at, r.started_at, r.created_at) ASC
    LIMIT  GREATEST(p_max_runs, 1)
    FOR UPDATE SKIP LOCKED
  ),
  failed_runs AS (
    UPDATE lenses.workflow_runs r
    SET    status        = 'failed',
           completed_at  = COALESCE(r.completed_at, now()),
           started_at    = COALESCE(r.started_at, r.created_at),
           run_worker_id = NULL,
           metadata      = r.metadata || jsonb_build_object(
                             'reaped_reason',
                             'abandoned by its client: no heartbeat within the liveness window'
                           )
    FROM   abandoned a
    WHERE  r.id = a.id
    RETURNING r.id
  ),
  failed_nodes AS (
    UPDATE lenses.workflow_node_results nr
    SET    status        = 'failed',
           error_message = COALESCE(nr.error_message, 'Run abandoned by its client before this node finished'),
           completed_at  = COALESCE(nr.completed_at, now())
    FROM   failed_runs f
    WHERE  nr.run_id = f.id
      AND  nr.status NOT IN ('completed', 'failed', 'cancelled', 'skipped',
                             'timed_out', 'blocked', 'invalidated')
    RETURNING nr.run_id
  )
  SELECT count(*)::int INTO v_reaped FROM failed_runs;

  RETURN v_reaped;
END;
$$;

ALTER FUNCTION "public"."fn_reap_abandoned_workflow_runs"(integer, integer) OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_reap_abandoned_workflow_runs"(integer, integer) FROM PUBLIC, "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_reap_abandoned_workflow_runs"(integer, integer) TO "service_role";

COMMENT ON FUNCTION "public"."fn_reap_abandoned_workflow_runs"(integer, integer) IS
  'Backstop: retires client-executed workflow runs whose browser stopped heartbeating past the TTL, failing the run and its non-terminal node_results with a stated reason. Bounded per call. Independent of the claim/adoption path so a run can never stay non-terminal forever.';

-- Reaper index: the scan is over non-terminal client runs ordered by liveness.
CREATE INDEX IF NOT EXISTS "idx_workflow_runs_client_liveness"
  ON "lenses"."workflow_runs" ((COALESCE("heartbeat_at", "started_at", "created_at")))
  WHERE "executor" = 'client'
    AND "status" IN ('pending', 'queued', 'running', 'streaming', 'recovered');

-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule the backstop. Guarded so a database without pg_cron still migrates.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron not installed — skipping reap-abandoned-workflow-runs schedule';
    RETURN;
  END IF;

  PERFORM cron.unschedule('reap-abandoned-workflow-runs')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reap-abandoned-workflow-runs');

  PERFORM cron.schedule(
    'reap-abandoned-workflow-runs',
    '*/5 * * * *',
    'SELECT public.fn_reap_abandoned_workflow_runs()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'could not schedule reap-abandoned-workflow-runs: %', SQLERRM;
END $$;
