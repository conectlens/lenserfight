-- =============================================================================
-- Headless (MCP / webhook) workflow run execution
--
-- Runs started via public.fn_mcp_workflow_run_start (the MCP run_workflow tool
-- and the inbound webhook edge function) were inserted with trigger_mode='manual'
-- and no seeded node_results. But the only server-side claimer,
-- lenses.fn_claim_scheduled_workflow_run, claims trigger_mode='schedule' only, and
-- 'manual' runs are meant to execute in the browser (the web builder's orchestrator).
-- Result: an MCP- or webhook-started run had no executor and never ran.
--
-- Fix: give headless runs their own trigger_mode 'api' (distinct from browser
-- 'manual' so browser runs are NOT double-executed by the worker), seed their
-- node_results, and widen the claimer to pick up 'schedule' OR 'api'.
--
-- ⚠️ Changes the run-claim path. Apply against a database and confirm an
--    MCP/webhook-started run reaches a terminal status with no browser open,
--    and that a web-UI ('manual') run is still browser-driven only.
-- =============================================================================

-- 1. Allow the new headless trigger_mode.
ALTER TABLE "lenses"."workflow_runs" DROP CONSTRAINT IF EXISTS "workflow_runs_trigger_mode_check";
ALTER TABLE "lenses"."workflow_runs" ADD CONSTRAINT "workflow_runs_trigger_mode_check"
  CHECK (("trigger_mode" = ANY (ARRAY['manual'::"text", 'schedule'::"text", 'subflow'::"text", 'api'::"text"])));

-- 2. Headless run creator: mark as 'api' and seed node_results.
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
  v_row record;
BEGIN
  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode, context_inputs,
    global_model_id, idempotency_key, metadata, triggered_by
  )
  VALUES (
    p_workflow_id, 'pending', 'api', COALESCE(p_inputs, '{}'::jsonb),
    p_global_model_id, p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb),
    lensers.get_auth_lenser_id()
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

-- 3. Widen the claimer to pick up headless ('api') runs as well as scheduled ones.
--    Body is otherwise identical to 20270602000000 (return signature unchanged →
--    CREATE OR REPLACE is valid). The public wrapper fn_worker_claim_scheduled_workflow_run
--    passes straight through, so no wrapper change is needed.
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
    AND  trigger_mode IN ('schedule', 'api')
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
