-- =============================================================================
-- Layer 2 — Route human-initiated workflow runs through the worker queue.
--
-- Problem
-- -------
-- lenses.fn_start_workflow_run inserts a run without naming a trigger_mode, so
-- the column default 'manual' applies. The only server-side claimer filters
-- `trigger_mode IN ('schedule','api')`, so a 'manual' run is claimable by
-- nobody: it sits at status='pending' with a full set of pending node_results
-- until someone deletes it. The browser tab that called executeWorkflow() was
-- the sole executor, and a closed tab abandoned the run silently.
--
-- Root cause
-- ----------
-- `trigger_mode` conflates two independent facts: WHO TRIGGERED the run
-- (human / schedule / headless API / parent workflow) and WHO EXECUTES it
-- (the browser tab, or a worker). Claim logic keyed off the trigger axis, so
-- every new trigger mode had to be remembered in the claimer's IN-list. It was
-- not, twice: first for 'api' (fixed in 20270603000002), now for 'manual'.
--
-- Fix
-- ---
-- Split the axes. `executor` says who runs it and is the ONLY thing the claimer
-- looks at, so a future trigger_mode cannot silently strand runs again:
--
--   executor = 'worker'  → claimable server-side. The default, and correct for
--                          every run whose credentials the server can reach.
--   executor = 'client'  → a browser tab executes it and the server must never
--                          claim it. Reserved for funding_source
--                          'user_byok_local', where the API key lives in the
--                          browser and is physically unreachable by a worker.
--
-- Also closes the kill-switch gap: fn_start_workflow_run had no
-- fn_kill_switch_active check, so human-initiated runs could start while the
-- platform kill switch was active (the scheduled/api claim path checks it, but
-- that check happens at claim time and never ran for 'manual' runs at all).
--
-- ⚠️ Changes the run-claim predicate and the canonical run-start RPC. Apply
--    against a database and confirm: (a) a platform-credit run started from the
--    web builder reaches a terminal status with the tab closed, (b) a
--    user_byok_local run is still browser-driven and never claimed.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The executor axis.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "lenses"."workflow_runs"
  ADD COLUMN IF NOT EXISTS "executor" "text" NOT NULL DEFAULT 'worker';

ALTER TABLE "lenses"."workflow_runs" DROP CONSTRAINT IF EXISTS "workflow_runs_executor_check";
ALTER TABLE "lenses"."workflow_runs" ADD CONSTRAINT "workflow_runs_executor_check"
  CHECK (("executor" = ANY (ARRAY['worker'::"text", 'client'::"text"])));

COMMENT ON COLUMN "lenses"."workflow_runs"."executor" IS
  'Who executes this run: worker (server-side, claimable) or client (a browser tab drives it; the server must never claim it). Independent of trigger_mode, which records who *triggered* the run. Only user_byok_local runs are client-executed, because their API key never leaves the browser.';

-- Backfill. Historical 'manual' runs were browser-driven by construction, so
-- they are client-executed; everything else was already server-executed. The
-- ADD COLUMN default already stamped every row 'worker', so only manual rows
-- need correcting. Orphaned pending manual runs stay 'client' on purpose — the
-- worker cannot know which funding source they used, so adopting them could
-- re-run a local-BYOK graph the server has no key for. The Layer 3 reaper
-- retires them instead.
UPDATE "lenses"."workflow_runs"
SET    "executor" = 'client'
WHERE  "trigger_mode" = 'manual'
  AND  "executor" <> 'client';

-- Claim-path index. The claimer scans pending + worker-executed rows in
-- created_at order; a partial index keeps that an index-only lookup as the runs
-- table grows, instead of a seq scan behind FOR UPDATE SKIP LOCKED.
CREATE INDEX IF NOT EXISTS "idx_workflow_runs_claimable"
  ON "lenses"."workflow_runs" ("created_at")
  WHERE "status" = 'pending' AND "executor" = 'worker';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The claimer keys off `executor`, not the trigger_mode IN-list.
--    Return signature unchanged → CREATE OR REPLACE is valid.
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
    AND  executor = 'worker'
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

COMMENT ON FUNCTION "lenses"."fn_claim_scheduled_workflow_run"("text") IS
  'Atomically claims the next pending worker-executed workflow run, regardless of trigger_mode. Gated on the system kill switch. Stamps run_worker_id + heartbeat_at so the crash-recovery loop cannot steal a freshly claimed run. Client-executed runs (executor=client) are never claimed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Canonical run-start RPC: accepts the executor, enforces the kill switch.
--    public.fn_start_workflow_run has a single overload, so DROP + CREATE is
--    safe here (adding a defaulted arg in place would make 5-arg named calls
--    ambiguous against the old signature).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid");

CREATE FUNCTION "public"."fn_start_workflow_run"(
  "p_workflow_id" "uuid",
  "p_inputs" "jsonb" DEFAULT '{}'::"jsonb",
  "p_global_model_id" "text" DEFAULT NULL::"text",
  "p_idempotency_key" "text" DEFAULT NULL::"text",
  "p_version_id" "uuid" DEFAULT NULL::"uuid",
  "p_executor" "text" DEFAULT 'worker'
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_run_id uuid;
BEGIN
  IF p_executor NOT IN ('worker', 'client') THEN
    RAISE EXCEPTION 'fn_start_workflow_run: invalid executor %', p_executor
      USING ERRCODE = '22023';
  END IF;

  -- Kill switch. The scheduled/api claim path already refuses to claim while the
  -- switch is active, but a client-executed run never passes through a claim, so
  -- without this check it would start anyway. Refuse at creation for both.
  IF public.fn_kill_switch_active('system') THEN
    RAISE EXCEPTION 'kill_switch_active: workflow runs are temporarily disabled'
      USING ERRCODE = '57P03', HINT = 'system kill switch';
  END IF;

  v_run_id := lenses.fn_start_workflow_run(
    p_workflow_id,
    p_inputs,
    p_global_model_id,
    p_idempotency_key,
    p_version_id
  );

  -- Stamp the executor in the same transaction as the insert, so the row is
  -- never visible to a claimer with the wrong value.
  --
  -- Only the worker→client direction is allowed, and only while still pending:
  --   • status='pending'    — an idempotent replay that returned an in-flight run
  --                           must not have its executor rewritten underneath it.
  --   • executor='worker'   — client→worker would hand a run a browser is already
  --                           driving to the claimer, double-executing it. A run
  --                           declared client-executed stays that way; if its tab
  --                           dies, the Layer 3 reaper retires it.
  UPDATE lenses.workflow_runs
  SET    executor = p_executor
  WHERE  id = v_run_id
    AND  status = 'pending'
    AND  executor = 'worker'
    AND  p_executor = 'client';

  RETURN v_run_id;
END;
$$;

ALTER FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") TO "service_role";

COMMENT ON FUNCTION "public"."fn_start_workflow_run"("uuid", "jsonb", "text", "text", "uuid", "text") IS
  'Canonical workflow-start RPC (single overload). p_executor defaults to worker, so a run started with no browser attached is picked up server-side; callers that will drive the graph in-page (user_byok_local, whose key never leaves the browser) pass client. Refuses to start while the system kill switch is active. D2+D4+Z2 preserved: anon rejected, idempotency window capped at 24h.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Headless (MCP / webhook) runs are worker-executed by definition.
--    Explicit rather than relying on the column default, so the intent survives
--    any future change to that default.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_run_start(
  p_workflow_id     uuid,
  p_inputs          jsonb   DEFAULT '{}'::jsonb,
  p_global_model_id text    DEFAULT NULL,
  p_idempotency_key text    DEFAULT NULL,
  p_metadata        jsonb   DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_row       record;
  v_lenser_id uuid;
  v_role      text;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  BEGIN
    v_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  -- Authorization. This function is SECURITY DEFINER and granted to
  -- `authenticated`, so without a gate any signed-in caller could start a run on
  -- any workflow UUID — including private workflows they do not own — and read
  -- the results back through fn_mcp_workflow_run_status.
  --
  -- service_role is exempt: the inbound-webhook path runs as the backend itself
  -- with no end-user JWT, so there is no lenser to check it against. Every other
  -- caller must own the workflow or find it public, mirroring the predicate in
  -- lenses.fn_start_workflow_run.
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_lenser_id IS NULL THEN
      RAISE EXCEPTION 'fn_mcp_workflow_run_start: authentication required'
        USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = p_workflow_id
        AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id)
    ) THEN
      RAISE EXCEPTION 'workflow_not_found_or_forbidden'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF public.fn_kill_switch_active('system') THEN
    RAISE EXCEPTION 'kill_switch_active: workflow runs are temporarily disabled'
      USING ERRCODE = '57014', HINT = 'system kill switch';
  END IF;

  -- Per-lenser rate limit, matching lenses.fn_start_workflow_run. Without it the
  -- MCP surface is an unmetered bypass of the web app's cap.
  IF v_lenser_id IS NOT NULL THEN
    IF lenses.fn_count_recent_runs(v_lenser_id, 60) >= 30 THEN
      RAISE EXCEPTION 'rate_limited: too many runs in the last 60 seconds (cap 30)'
        USING ERRCODE = '54000', HINT = 'phase9_run_rate_limit';
    END IF;
  END IF;

  -- Idempotency, serialized by a transaction-scoped advisory lock on
  -- (workflow, key) so concurrent retries of the same webhook cannot both
  -- insert. Mirrors 20270603000001 for the browser path.
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_workflow_id::text || ':' || p_idempotency_key));

    SELECT id, status, created_at INTO v_row
    FROM   lenses.workflow_runs
    WHERE  workflow_id     = p_workflow_id
      AND  idempotency_key = p_idempotency_key
      AND  (idempotency_expires_at IS NULL OR idempotency_expires_at > now())
    ORDER  BY created_at DESC
    LIMIT  1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', v_row.id, 'status', v_row.status, 'created_at', v_row.created_at
      );
    END IF;
  END IF;

  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode, executor, context_inputs,
    global_model_id, idempotency_key, idempotency_expires_at, metadata, triggered_by
  )
  VALUES (
    p_workflow_id, 'pending', 'api', 'worker', COALESCE(p_inputs, '{}'::jsonb),
    p_global_model_id, p_idempotency_key,
    CASE
      WHEN p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0
      THEN now() + interval '24 hours'
      ELSE NULL
    END,
    COALESCE(p_metadata, '{}'::jsonb),
    v_lenser_id
  )
  RETURNING id, status, created_at INTO v_row;

  -- Seed one pending node_result per node so status/logs reflect the run before
  -- the worker starts, mirroring lenses.fn_start_workflow_run.
  INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
  SELECT v_row.id, n.id, 'pending'
  FROM   lenses.workflow_nodes n
  WHERE  n.workflow_id = p_workflow_id;

  RETURN jsonb_build_object(
    'id', v_row.id, 'status', v_row.status, 'created_at', v_row.created_at
  );
END;
$$;

ALTER FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) IS
  'Headless (MCP tool / inbound webhook) workflow start. Creates a worker-executed run with trigger_mode=api and seeds pending node_results. Gated on workflow ownership/visibility, the system kill switch, and the same per-lenser rate limit as the browser path; idempotent per (workflow, key) within 24h under an advisory lock.';
