-- Worker runtime follow-ups (pre-existing latent issues surfaced during the
-- worker-runtime-stability review). All additive or signature-reconciling.
--
--   • fn_worker_get_workflow_context — now also returns workspace_id (resolved
--     from the workflow owner's personal workspace). The worker reads
--     wfCtxRow.workspace_id to attribute workflow-output media, but the function
--     only returned (workflow_id, triggered_by), so workspace_id was always NULL
--     and the media-object insert never fired.
--   • fn_worker_render_template(text, jsonb) — body-based overload the worker
--     actually calls. Only the version-based (uuid, jsonb) overload existed in
--     committed migrations; the raw-body call had no matching signature.
--     Substitutes [[key]] tokens (the repo-wide convention) from p_inputs.
--   • fn_build_lenser_prompt_context — public wrapper. The fn existed only in the
--     agents schema; the worker's public-schema rpc() call could never resolve
--     it, so agent memory context was silently dropped.

-- ─────────────────────────────────────────────────────────────────────────────
-- #2: workspace_id in workflow context. Return type changes (extra column), so
-- drop + recreate (CREATE OR REPLACE cannot change a return type). Grants
-- restored to match the original (anon/authenticated/service_role).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."fn_worker_get_workflow_context"("uuid");

CREATE FUNCTION "public"."fn_worker_get_workflow_context"(
  "p_run_id" "uuid"
) RETURNS TABLE("workflow_id" "uuid", "triggered_by" "uuid", "workspace_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'tenancy'
    AS $$
  SELECT
    wr.workflow_id,
    wr.triggered_by,
    (
      SELECT w.id
      FROM   tenancy.workspaces w
      WHERE  w.owner_lenser_id = wf.lenser_id
        AND  w.type   = 'personal'
        AND  w.status = 'active'
      ORDER  BY w.created_at ASC
      LIMIT  1
    ) AS workspace_id
  FROM lenses.workflow_runs wr
  JOIN lenses.workflows wf ON wf.id = wr.workflow_id
  WHERE wr.id = p_run_id;
$$;

ALTER FUNCTION "public"."fn_worker_get_workflow_context"("uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_get_workflow_context"("uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_get_workflow_context"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_worker_get_workflow_context"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_worker_get_workflow_context"("uuid") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_get_workflow_context"("uuid") IS
  'Worker-only: workflow_id, triggered_by, and the workflow owner''s personal workspace_id for a run.';

-- ─────────────────────────────────────────────────────────────────────────────
-- #3a: body-based render overload. Distinct signature (text vs uuid first arg)
-- so it coexists with the version-based fn_worker_render_template(uuid, jsonb).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_worker_render_template"(
  "p_template_body" "text",
  "p_inputs" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_out text := COALESCE(p_template_body, '');
  k     text;
  v     text;
BEGIN
  IF p_inputs IS NOT NULL THEN
    FOR k, v IN SELECT key, value FROM jsonb_each_text(p_inputs) LOOP
      v_out := replace(v_out, '[[' || k || ']]', COALESCE(v, ''));
    END LOOP;
  END IF;
  RETURN v_out;
END;
$$;

ALTER FUNCTION "public"."fn_worker_render_template"("text", "jsonb") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_worker_render_template"("text", "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_worker_render_template"("text", "jsonb") TO "service_role";
COMMENT ON FUNCTION "public"."fn_worker_render_template"("text", "jsonb") IS
  'Worker-only: render a raw template body by substituting [[key]] tokens from p_inputs. Body-based companion to the version-based fn_worker_render_template(uuid, jsonb).';

-- ─────────────────────────────────────────────────────────────────────────────
-- #3b: public wrapper for agents.fn_build_lenser_prompt_context so the worker's
-- public-schema rpc() resolves. Two-arg shape matching the worker call.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_build_lenser_prompt_context"(
  "p_ai_lenser_id" "uuid",
  "p_limit" integer DEFAULT 20
) RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'agents'
    AS $$
  SELECT agents.fn_build_lenser_prompt_context(p_ai_lenser_id, NULL::text, p_limit);
$$;

ALTER FUNCTION "public"."fn_build_lenser_prompt_context"("uuid", integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fn_build_lenser_prompt_context"("uuid", integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_build_lenser_prompt_context"("uuid", integer) TO "service_role";
COMMENT ON FUNCTION "public"."fn_build_lenser_prompt_context"("uuid", integer) IS
  'Worker-only public wrapper delegating to agents.fn_build_lenser_prompt_context (p_scope = NULL).';
