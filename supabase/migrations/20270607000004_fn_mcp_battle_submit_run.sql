-- apps/mcp-server's submit_battle_run tool calls public.fn_battles_submit with
-- a p_contender_id argument, but no deployed version of that function accepts
-- one (only p_agent_id, added for the multi-owned-agent disambiguation case) —
-- PostgREST rejects every call with "Could not find the function ... in the
-- schema cache" since no overload matches. This blocks every MCP submission.
--
-- Add a dedicated fn_mcp_battle_* wrapper (matching the convention in
-- 20270528000003_add_public_fn_mcp_rpcs.sql) that accepts contender_id
-- directly, since the MCP tool already has it from add_battle_contender's
-- response — no need to re-derive it via ai_lenser ownership lookup the way
-- fn_battles_submit does for the human-facing API.

CREATE OR REPLACE FUNCTION public.fn_mcp_battle_submit_run(
  p_battle_id    uuid,
  p_contender_id uuid,
  p_content_text text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'battles', 'lensers', 'agents', 'public'
AS $$
DECLARE
  v_caller        uuid;
  v_contender     record;
  v_battle        record;
  v_submission_id uuid;
BEGIN
  v_caller := lensers.get_auth_lenser_id();

  SELECT * INTO v_battle
    FROM battles.battles
   WHERE id = p_battle_id AND deleted_at IS NULL;

  IF v_battle IS NULL THEN
    RAISE EXCEPTION 'battle_not_found' USING HINT = 'p0404';
  END IF;

  IF v_battle.status NOT IN ('open', 'executing') THEN
    RAISE EXCEPTION 'Battle is not open for submissions';
  END IF;

  SELECT * INTO v_contender
    FROM battles.contenders
   WHERE id = p_contender_id AND battle_id = p_battle_id;

  IF v_contender IS NULL THEN
    RAISE EXCEPTION 'contender_not_found' USING HINT = 'p0404';
  END IF;

  IF v_caller IS NOT NULL THEN
    IF NOT (
      v_contender.contender_ref_id = v_caller
      OR EXISTS (
        SELECT 1
          FROM agents.ai_lensers al
          JOIN agents.ownerships o
            ON o.ai_lenser_id = al.id
           AND o.owner_lenser_id = v_caller
           AND o.revoked_at IS NULL
         WHERE al.profile_id = v_contender.contender_ref_id
      )
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  IF p_content_text IS NULL OR length(trim(p_content_text)) = 0 THEN
    RAISE EXCEPTION 'content_text is required';
  END IF;

  INSERT INTO battles.submissions (battle_id, contender_id, status, content_text, submitted_at)
  VALUES (p_battle_id, p_contender_id, 'submitted', p_content_text, now())
  ON CONFLICT (battle_id, contender_id) DO UPDATE SET
    status       = 'submitted',
    content_text = EXCLUDED.content_text,
    submitted_at = now(),
    updated_at   = now()
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object('id', v_submission_id, 'submitted', true);
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_submit_run(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_submit_run(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_submit_run(uuid, uuid, text) TO authenticated, service_role;
