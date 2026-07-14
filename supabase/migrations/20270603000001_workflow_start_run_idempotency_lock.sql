-- =============================================================================
-- Idempotency race hardening for lenses.fn_start_workflow_run
--
-- The idempotency short-circuit did SELECT-then-INSERT with no lock, so two
-- concurrent submissions sharing an idempotency key could both miss the SELECT
-- and each create a run (TOCTOU) — defeating the dedupe on a retried webhook or
-- a double-click. Acquire a transaction-scoped advisory lock keyed by
-- (workflow_id, idempotency_key) as the first step of the idempotency block so
-- same-key submits serialize: the second waits until the first commits, then its
-- SELECT finds the first run and returns it. The lock is xact-scoped, so it also
-- covers the INSERT below.
--
-- The body is otherwise byte-for-byte the prior definition (5-arg overload).
--
-- ⚠️ Changes a core run-creation function. Run `supabase test db` / apply against
--    a database and exercise concurrent same-key submits before merging.
-- =============================================================================

CREATE OR REPLACE FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_global_model_id" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id        uuid;
  v_run_id           uuid;
  v_rate_window_sec  integer := 60;
  v_rate_limit_count integer := 30;
  v_recent_count     integer;
  v_role             text;
  v_resolved_version uuid;
  v_head_version     uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden'
      USING ERRCODE = '42501';
  END IF;

  -- ── Idempotency short-circuit with TTL ────────────────────────────────────
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    -- Serialize concurrent submissions sharing this key so the check-then-insert
    -- below cannot race into duplicate runs. Transaction-scoped: released on commit.
    PERFORM pg_advisory_xact_lock(hashtext(p_workflow_id::text || ':' || p_idempotency_key));

    SELECT id INTO v_run_id
    FROM   lenses.workflow_runs
    WHERE  workflow_id     = p_workflow_id
      AND  idempotency_key = p_idempotency_key
      AND  (idempotency_expires_at IS NULL OR idempotency_expires_at > now())
    ORDER  BY created_at DESC
    LIMIT  1;
    IF v_run_id IS NOT NULL THEN
      RETURN v_run_id;
    END IF;
  END IF;

  -- ── Rate limit (anon blocked; authenticated bucketed per-lenser) ──────────
  BEGIN
    v_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_lenser_id IS NULL THEN
    IF v_role = 'anon' THEN
      RAISE EXCEPTION 'fn_start_workflow_run: anon not permitted'
        USING ERRCODE = '42501',
              HINT    = 'D2: rate limit cannot be enforced for anon';
    END IF;
    -- service_role callers (workers/test) bypass the limit intentionally.
  ELSE
    v_recent_count := lenses.fn_count_recent_runs(v_lenser_id, v_rate_window_sec);
    IF v_recent_count >= v_rate_limit_count THEN
      RAISE EXCEPTION
        'rate_limited: % runs in the last % seconds (cap %)',
        v_recent_count, v_rate_window_sec, v_rate_limit_count
        USING ERRCODE = '54000', HINT = 'phase9_run_rate_limit';
    END IF;
  END IF;

  -- ── Version resolution ────────────────────────────────────────────────────
  -- Caller may pass an explicit version_id (e.g. to pin a specific published
  -- version or to dry-run a draft).  When absent, fall back to the workflow's
  -- head_version_id (the most recently published version).  A NULL result
  -- means the workflow has never had a published version — the run proceeds
  -- without version binding for backward compatibility.
  IF p_version_id IS NOT NULL THEN
    -- Validate the version belongs to this workflow.
    IF NOT EXISTS (
      SELECT 1 FROM lenses.workflow_versions wv
      WHERE wv.id = p_version_id AND wv.workflow_id = p_workflow_id
    ) THEN
      RAISE EXCEPTION 'version_not_found_or_wrong_workflow'
        USING ERRCODE = '42501';
    END IF;
    v_resolved_version := p_version_id;
  ELSE
    SELECT head_version_id INTO v_head_version
    FROM   lenses.workflows
    WHERE  id = p_workflow_id;
    v_resolved_version := v_head_version;  -- may be NULL for unversioned workflows
  END IF;

  -- ── Create the run ────────────────────────────────────────────────────────
  INSERT INTO lenses.workflow_runs (
    workflow_id, triggered_by, status, context_inputs,
    global_model_id, idempotency_key, idempotency_expires_at,
    workflow_version_id
  )
  VALUES (
    p_workflow_id, v_lenser_id, 'pending', p_inputs,
    p_global_model_id, p_idempotency_key,
    CASE
      WHEN p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0
      THEN now() + interval '24 hours'
      ELSE NULL
    END,
    v_resolved_version
  )
  RETURNING id INTO v_run_id;

  -- Seed one node_result row per node (all pending)
  INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
  SELECT v_run_id, n.id, 'pending'
  FROM   lenses.workflow_nodes n
  WHERE  n.workflow_id = p_workflow_id;

  RETURN v_run_id;
END;
$$;

ALTER FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text", "p_idempotency_key" "text", "p_version_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text", "p_idempotency_key" "text", "p_version_id" "uuid") IS 'Creates a workflow_run, seeds pending node_results, and binds workflow_version_id. When p_version_id is NULL, resolves to head_version_id (latest published version). Idempotent per (workflow_id, idempotency_key) within a 24h TTL, serialized by a transaction-scoped advisory lock to close the check-then-insert race. Preserves D2 anon-block. Runs against unversioned workflows (no head_version_id) proceed with NULL version for backward compat.';
