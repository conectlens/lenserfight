-- Tool-invocation dispatcher claim path, per RFC-0006 / issue #462.
--
-- fn_invoke_tool already moves a non-approval-gated invocation to
-- status='running' (see supabase/migrations/20260519131536_remote_schema.sql),
-- and fn_approve_tool_invocation moves an approved one to 'running' too — but
-- nothing ever claims a 'running' row for actual dispatch, and nothing marks
-- it as "currently being dispatched" so two dispatcher ticks can't grab the
-- same row. This adds exactly that, mirroring the existing async-media claim
-- pattern (execution.fn_poll_async_run: FOR UPDATE SKIP LOCKED + a staleness
-- timestamp) instead of inventing a new one.

ALTER TABLE "agents"."tool_invocations"
  ADD COLUMN "dispatched_at" timestamp with time zone;

COMMENT ON COLUMN "agents"."tool_invocations"."dispatched_at" IS 'Set by fn_claim_tool_invocations when a dispatcher tick claims this row. NULL or stale (> stale_after_seconds) rows are eligible for (re-)claiming, mirroring execution.runs.last_polled_at.';

CREATE OR REPLACE FUNCTION "public"."fn_claim_tool_invocations"("p_stale_after_seconds" integer DEFAULT 30, "p_limit" integer DEFAULT 20)
RETURNS TABLE(
  "invocation_id" "uuid",
  "tool_id" "uuid",
  "input" "jsonb",
  "endpoint_url" "text",
  "http_method" "text",
  "request_template" "jsonb",
  "auth_method" "text",
  "auth_placement" "text",
  "auth_param_name" "text"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents'
    AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF NOT public.fn_lifecycle_is_service_role() THEN
    RAISE EXCEPTION 'forbidden: only service_role can claim tool invocations' USING ERRCODE = '42501';
  END IF;

  -- 1. Claim a batch of due, runnable invocations with SKIP LOCKED.
  WITH claimed AS (
    SELECT ti.id
    FROM agents.tool_invocations ti
    WHERE ti.status = 'running'
      AND (
        ti.dispatched_at IS NULL
        OR ti.dispatched_at < now() - (p_stale_after_seconds || ' seconds')::interval
      )
    ORDER BY ti.dispatched_at NULLS FIRST, ti.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 50))
  )
  SELECT array_agg(id) INTO v_ids FROM claimed;

  IF v_ids IS NULL THEN
    RETURN;
  END IF;

  -- 2. Bump dispatched_at so the next tick skips these until the row completes
  -- or the staleness window elapses (covers a dispatcher crash mid-call).
  UPDATE agents.tool_invocations
     SET dispatched_at = now()
   WHERE id = ANY(v_ids);

  -- 3. Return the dispatch shape (join tools_registry for endpoint/auth info).
  RETURN QUERY
    SELECT
      ti.id                 AS invocation_id,
      ti.tool_id,
      ti.input,
      tr.endpoint_url,
      tr.http_method,
      tr.request_template,
      tr.auth_method,
      tr.auth_placement,
      tr.auth_param_name
    FROM agents.tool_invocations ti
    JOIN agents.tools_registry tr ON tr.id = ti.tool_id
    WHERE ti.id = ANY(v_ids);
END;
$$;

ALTER FUNCTION "public"."fn_claim_tool_invocations"("p_stale_after_seconds" integer, "p_limit" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_claim_tool_invocations"("p_stale_after_seconds" integer, "p_limit" integer) IS 'Claims a batch of runnable tool_invocations for dispatch (FOR UPDATE SKIP LOCKED), joined with the owning tool''s dispatch config. service_role only — called by the dispatch-tool-invocations Edge Function on a pg_cron tick.';

REVOKE ALL ON FUNCTION "public"."fn_claim_tool_invocations"("p_stale_after_seconds" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_claim_tool_invocations"("p_stale_after_seconds" integer, "p_limit" integer) TO "service_role";


-- fn_complete_tool_invocation (existing, see remote_schema.sql) currently only
-- authorizes via agents.can_manage_ai_lenser(), i.e. a human owner acting
-- through their own JWT. The dispatcher runs as service_role with no human
-- JWT, so it cannot call the existing function as-is. Widen the check the
-- same way fn_artifact_can_manage already does elsewhere in this schema
-- (service_role OR owner) — purely additive, no existing authenticated caller
-- is affected.
CREATE OR REPLACE FUNCTION "public"."fn_complete_tool_invocation"("p_invocation_id" "uuid", "p_status" "text", "p_output" "jsonb" DEFAULT NULL::"jsonb", "p_error" "text" DEFAULT NULL::"text", "p_cost" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents'
    AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (public.fn_lifecycle_is_service_role() OR agents.can_manage_ai_lenser(v_inv.ai_lenser_id)) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('completed','failed') THEN
    RAISE EXCEPTION 'completion status must be completed or failed' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET status        = p_status,
         output        = COALESCE(p_output, output),
         error         = COALESCE(p_error, error),
         cost_estimate = COALESCE(p_cost, cost_estimate),
         completed_at  = now()
   WHERE id = p_invocation_id;
END;
$$;

COMMENT ON FUNCTION "public"."fn_complete_tool_invocation"("p_invocation_id" "uuid", "p_status" "text", "p_output" "jsonb", "p_error" "text", "p_cost" numeric) IS 'Marks a tool invocation completed or failed. Callable by the owning human lenser (unchanged) or by service_role (added for the dispatch-tool-invocations Edge Function).';
