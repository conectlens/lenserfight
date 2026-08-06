-- Bug fix (pre-existing, unrelated to RFC-0006): fn_approve_tool_invocation and
-- fn_reject_tool_invocation set tool_invocations.approval_decided_by = auth.uid(),
-- but that column is FK'd to lensers.profiles(id) (see
-- supabase/migrations/20260519131536_remote_schema.sql), not to auth.users(id).
-- auth.uid() is never a lensers.profiles.id in this schema, so both RPCs fail
-- with a foreign key violation for every real caller, not just test data.
-- Fix: resolve to lensers.get_auth_human_lenser_id(), matching every other
-- RPC in this schema that records an acting profile id (e.g.
-- fn_register_tool's v_owner).

CREATE OR REPLACE FUNCTION "public"."fn_approve_tool_invocation"("p_invocation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_inv.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF v_inv.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'invocation is not pending approval' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET approval_status     = 'approved',
         approval_decided_by = lensers.get_auth_human_lenser_id(),
         status              = 'running',
         started_at          = now()
   WHERE id = p_invocation_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."fn_reject_tool_invocation"("p_invocation_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_inv agents.tool_invocations;
BEGIN
  SELECT * INTO v_inv FROM agents.tool_invocations WHERE id = p_invocation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invocation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_inv.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  IF v_inv.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'invocation is not pending approval' USING ERRCODE = '22023';
  END IF;

  UPDATE agents.tool_invocations
     SET approval_status     = 'rejected',
         approval_decided_by = lensers.get_auth_human_lenser_id(),
         approval_reason     = p_reason,
         status              = 'rejected',
         completed_at        = now()
   WHERE id = p_invocation_id;
END;
$$;
