-- Phase AJ: fn_build_lenser_prompt_context
-- Builds a formatted memory context block for server-side prompt injection.
-- Called by the scheduled-workflow-worker before resolving lens templates.
-- Returns NULL when no eligible memory entries exist (caller prepends nothing).
CREATE OR REPLACE FUNCTION agents.fn_build_lenser_prompt_context(
  p_ai_lenser_id  uuid,
  p_scope         text    DEFAULT NULL,
  p_limit         integer DEFAULT 20
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_limit  integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_rows   RECORD;
  v_lines  text[]  := ARRAY[]::text[];
BEGIN
  FOR v_rows IN
    SELECT scope, source, content
    FROM   agents.memories
    WHERE  ai_lenser_id = p_ai_lenser_id
      AND  is_redacted  = FALSE
      AND  (p_scope IS NULL OR scope = p_scope)
      AND  (expires_at IS NULL OR expires_at > now())
    ORDER  BY created_at DESC
    LIMIT  v_limit
  LOOP
    v_lines := array_append(
      v_lines,
      format('- (%s/%s) %s', v_rows.scope, v_rows.source, v_rows.content)
    );
  END LOOP;

  IF array_length(v_lines, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN '## Context Memory' || E'\n' || array_to_string(v_lines, E'\n') || E'\n\n';
END;
$$;

COMMENT ON FUNCTION agents.fn_build_lenser_prompt_context(uuid, text, integer) IS
  'Phase AJ: Returns a formatted memory context block prepended to lens templates '
  'during server-side workflow execution. Returns NULL when no eligible entries exist. '
  'SECURITY DEFINER — caller must ensure p_ai_lenser_id is authorized.';

REVOKE ALL ON FUNCTION agents.fn_build_lenser_prompt_context(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_build_lenser_prompt_context(uuid, text, integer)
  TO service_role;

-- Phase AJ: extend fn_claim_scheduled_workflow_run to return ai_lenser_id so
-- the scheduled-workflow-worker can inject memory context without a second query.
CREATE OR REPLACE FUNCTION lenses.fn_claim_scheduled_workflow_run(p_worker_id TEXT)
RETURNS TABLE (
  run_id          UUID,
  workflow_id     UUID,
  schedule_id     UUID,
  triggered_by    UUID,
  context_inputs  JSONB,
  global_model_id TEXT,
  ai_lenser_id    UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_run lenses.workflow_runs;
BEGIN
  SELECT *
  INTO v_run
  FROM lenses.workflow_runs
  WHERE status       = 'pending'
    AND trigger_mode = 'schedule'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE lenses.workflow_runs
  SET status     = 'running',
      started_at = COALESCE(started_at, now())
  WHERE id = v_run.id;

  RETURN QUERY
  SELECT
    v_run.id,
    v_run.workflow_id,
    v_run.schedule_id,
    v_run.triggered_by,
    v_run.context_inputs,
    v_run.global_model_id,
    v_run.ai_lenser_id;
END;
$$;

REVOKE ALL ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION lenses.fn_claim_scheduled_workflow_run(TEXT) TO service_role;
