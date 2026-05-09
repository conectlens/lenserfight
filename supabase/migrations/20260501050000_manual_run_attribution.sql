-- Phase 3 actor attribution — manual workflow run path:
--   Extends fn_start_workflow_run to automatically resolve and write ai_lenser_id
--   from the caller's active workspace. When the user is acting as an AI agent
--   (active_lenser_id in lensers.preferences points to an AI profile), the run is
--   attributed to that AI lenser — matching what the scheduled dispatcher already does.
--   No API change required: the attribution is derived server-side from the active session.

-- ─── lenses.fn_start_workflow_run (internal) ─────────────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id      uuid,
  p_inputs           jsonb    DEFAULT '{}'::jsonb,
  p_global_model_id  text     DEFAULT NULL,
  p_idempotency_key  text     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'agents', 'public'
AS $$
DECLARE
  v_lenser_id        uuid;
  v_ai_lenser_id     uuid;
  v_run_id           uuid;
  v_rate_window_sec  integer := 60;
  v_rate_limit_count integer := 30;
  v_recent_count     integer;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Automatically resolve ai_lenser_id when the caller is acting as an AI workspace.
  -- get_auth_lenser_id() returns the AI profile id when active; join to agents.ai_lensers
  -- to get the canonical ai_lenser_id (mirrors what fn_dispatch_scheduled_workflows does).
  SELECT al.id INTO v_ai_lenser_id
  FROM agents.ai_lensers al
  JOIN lensers.profiles  p  ON p.id = al.profile_id
  WHERE p.id   = v_lenser_id
    AND p.type = 'ai'
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden'
      USING ERRCODE = '42501';
  END IF;

  -- Idempotency short-circuit.
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    SELECT id INTO v_run_id
    FROM lenses.workflow_runs
    WHERE workflow_id = p_workflow_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_run_id IS NOT NULL THEN
      RETURN v_run_id;
    END IF;
  END IF;

  -- Rate limit (per-lenser, sliding window).
  IF v_lenser_id IS NOT NULL THEN
    v_recent_count := lenses.fn_count_recent_runs(v_lenser_id, v_rate_window_sec);
    IF v_recent_count >= v_rate_limit_count THEN
      RAISE EXCEPTION
        'rate_limited: % runs in the last % seconds (cap %)',
        v_recent_count, v_rate_window_sec, v_rate_limit_count
        USING ERRCODE = '54000', HINT = 'phase9_run_rate_limit';
    END IF;
  END IF;

  INSERT INTO lenses.workflow_runs (
    workflow_id, triggered_by, ai_lenser_id, status, context_inputs,
    global_model_id, idempotency_key
  )
  VALUES (
    p_workflow_id, v_lenser_id, v_ai_lenser_id, 'pending', p_inputs,
    p_global_model_id, p_idempotency_key
  )
  RETURNING id INTO v_run_id;

  INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
  SELECT v_run_id, n.id, 'pending'
  FROM lenses.workflow_nodes n
  WHERE n.workflow_id = p_workflow_id;

  RETURN v_run_id;
END;
$$;

ALTER FUNCTION lenses.fn_start_workflow_run(uuid, jsonb, text, text) OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_start_workflow_run(uuid, jsonb, text, text) IS
  'Phase 3 — auto-attributes ai_lenser_id from the caller''s active workspace.
   When the authenticated user is acting as an AI agent profile, the run record is
   tagged with that agent''s ai_lenser_id. Human workspace runs leave ai_lenser_id NULL.
   Signature is unchanged; attribution is fully server-side.';

-- ─── public.fn_start_workflow_run (client-callable wrapper) ──────────────────
-- Signature unchanged; retained for backward compatibility.

CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id      uuid,
  p_inputs           jsonb    DEFAULT '{}'::jsonb,
  p_global_model_id  text     DEFAULT NULL,
  p_idempotency_key  text     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key);
END;
$$;

ALTER FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) IS
  'Client-callable wrapper. Signature unchanged from 20260423000000; no existing callers
   need updating. Actor attribution is resolved automatically inside lenses.fn_start_workflow_run.';
