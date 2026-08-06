-- Fixes for the MCP tool audit: agents-schema routing, tokenized lens search,
-- and silent-success revoke/cancel calls that skip existence checks.

-- ─────────────────────────────────────────────────────────────────────────────
-- run_agent_action / start_agent_team_run — public-schema entry points
--
-- agents.fn_agent_action and agents.fn_start_team_run live in the `agents`
-- schema. Every other MCP-facing RPC in this codebase is called against the
-- default (public) schema; these two were the only callers reaching into a
-- non-public schema via PostgREST's schema switch, which fails wherever the
-- `agents` schema is not in that deployment's exposed-schema list. Add thin
-- public wrappers so the MCP server can call them the same way as everything
-- else. agents.fn_start_team_run has no internal ownership check today — its
-- only guard is the service_role-only GRANT — so the wrapper adds one before
-- delegating, otherwise opening it to `authenticated` would let any caller
-- start a team run for an ai_lenser_id they do not own.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_agent_action(
  p_ai_lenser_id  uuid,
  p_action_type   text,
  p_context_type  text DEFAULT NULL,
  p_context_id    uuid DEFAULT NULL,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN agents.fn_agent_action(
    p_ai_lenser_id := p_ai_lenser_id,
    p_action_type  := p_action_type,
    p_context_type := p_context_type,
    p_context_id   := p_context_id,
    p_metadata     := p_metadata
  );
END;
$$;
ALTER FUNCTION public.fn_agent_action(uuid, text, text, uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_agent_action(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_agent_action(uuid, text, text, uuid, jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_agent_action(uuid, text, text, uuid, jsonb)
  IS 'Public-schema entry point for agents.fn_agent_action so MCP/PostgREST clients never need to switch schema.';

CREATE OR REPLACE FUNCTION public.fn_start_team_run(
  p_ai_lenser_id uuid,
  p_workflow_id  uuid,
  p_inputs       jsonb DEFAULT '{}'::jsonb,
  p_policy       text  DEFAULT 'auto'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
  END IF;

  RETURN agents.fn_start_team_run(
    p_ai_lenser_id := p_ai_lenser_id,
    p_workflow_id  := p_workflow_id,
    p_inputs       := p_inputs,
    p_policy       := p_policy
  );
END;
$$;
ALTER FUNCTION public.fn_start_team_run(uuid, uuid, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_start_team_run(uuid, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_start_team_run(uuid, uuid, jsonb, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_start_team_run(uuid, uuid, jsonb, text)
  IS 'Public-schema entry point for agents.fn_start_team_run. Adds the ownership check the inner function relies on its service_role-only grant for, so authenticated callers cannot start a run for an ai_lenser_id they do not manage.';

-- ─────────────────────────────────────────────────────────────────────────────
-- search_lenses — match each query word independently
--
-- The previous WHERE clause required the entire query string as one literal
-- substring, so a natural-language query like "article author archive" only
-- matched when that exact phrase (same word order, single spaces) appeared
-- verbatim in title/description/content. Split the query into words and
-- require each word to appear somewhere across those three fields, matching
-- how a search box is expected to behave.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_search(
  p_query      text,
  p_visibility text    DEFAULT NULL,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'content', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
  v_q     text := lower(trim(p_query));
  v_words text[] := array_remove(regexp_split_to_array(lower(trim(p_query)), '\s+'), '');
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.vw_lenses v
   WHERE v.status::text <> 'archived'
     AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
     AND NOT EXISTS (
       SELECT 1 FROM unnest(v_words) AS word
        WHERE lower(coalesce(v.title, ''))       NOT LIKE '%' || word || '%'
          AND lower(coalesce(v.description, '')) NOT LIKE '%' || word || '%'
          AND lower(coalesce(v.content, ''))     NOT LIKE '%' || word || '%'
     );

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
               'id', v.id,
               'title', v.title,
               'description', v.description,
               'language_code', v.language_code,
               'visibility', v.visibility::text,
               'author_handle', v.author_handle,
               'created_at', v.created_at,
               'head_version_id', v.latest_version_id,
               'tags', public.fn_mcp_lens_tags(v.id)
             ) AS row
        FROM lenses.vw_lenses v
       WHERE v.status::text <> 'archived'
         AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
         AND NOT EXISTS (
           SELECT 1 FROM unnest(v_words) AS word
            WHERE lower(coalesce(v.title, ''))       NOT LIKE '%' || word || '%'
              AND lower(coalesce(v.description, '')) NOT LIKE '%' || word || '%'
              AND lower(coalesce(v.content, ''))     NOT LIKE '%' || word || '%'
         )
       ORDER BY v.created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) sub;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- revoke_agent_tool — report whether an assignment actually existed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_revoke_tool"("p_ai_lenser_id" "uuid", "p_tool_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents'
    AS $$
DECLARE
  v_row_count integer;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  DELETE FROM agents.tool_assignments
   WHERE ai_lenser_id = p_ai_lenser_id
     AND tool_id      = p_tool_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_agent_run — raise not_found instead of silently no-op'ing
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_cancel_agent_run"("p_team_run_id" "uuid", "p_ai_lenser_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_human_lenser_id();
  v_row_count integer;
BEGIN
  UPDATE agents.team_runs
  SET status = 'cancelled'
  WHERE id = p_team_run_id
    AND ai_lenser_id = p_ai_lenser_id
    AND (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE o.ai_lenser_id = p_ai_lenser_id
          AND o.owner_lenser_id = v_lenser_id
          AND o.revoked_at IS NULL
      ) OR public.is_admin()
    );
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count = 0 THEN
    RAISE EXCEPTION 'team_run_not_found' USING HINT = 'p0404';
  END IF;
END;
$$;
