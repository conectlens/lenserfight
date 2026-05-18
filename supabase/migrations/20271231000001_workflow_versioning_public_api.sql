-- Workflow Versioning: Public-Schema API + Run Version Binding
--
-- Issue #167 — Immutable Workflow Versioning with Minimal Database Changes
--
-- Discovery findings:
--   • lenses.workflow_versions / workflow_version_nodes / workflow_version_edges
--     tables already exist (community_base_schema).
--   • lenses.fn_create_workflow_version, fn_get_workflow_versions,
--     fn_publish_workflow_version, fn_restore_workflow_version exist in the
--     lenses schema but have no public-schema SECURITY DEFINER wrappers —
--     the repository layer calls them as public RPCs and they fail silently.
--   • lenses.workflow_runs.workflow_version_id already exists (added by
--     artifact_lifecycle_governance) but fn_start_workflow_run never populates it.
--   • The immutability trigger (trg_workflow_version_immutable) and head_version_id
--     FK on lenses.workflows are already in place.
--
-- This migration adds the missing pieces only:
--   1. Public-schema wrappers for the 4 versioning RPCs.
--   2. Updated fn_start_workflow_run that resolves and stores workflow_version_id.

-- ── 1. Public wrapper: fn_get_workflow_versions ────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_workflow_versions(p_workflow_id uuid)
RETURNS TABLE(
  id               uuid,
  workflow_id      uuid,
  version_number   integer,
  changelog        text,
  status           text,
  published_at     timestamptz,
  created_by       uuid,
  created_at       timestamptz,
  node_count       bigint,
  edge_count       bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO lenses, public
AS $$
  SELECT * FROM lenses.fn_get_workflow_versions(p_workflow_id);
$$;

ALTER FUNCTION public.fn_get_workflow_versions(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_get_workflow_versions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_versions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_versions(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_workflow_versions(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_get_workflow_versions(uuid) IS
  'Public wrapper: returns versioned snapshots for a workflow the caller can access. '
  'Delegates to lenses.fn_get_workflow_versions which enforces ownership/visibility via RLS.';

-- ── 2. Public wrapper: fn_create_workflow_version ─────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_workflow_version(
  p_workflow_id uuid,
  p_changelog   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
BEGIN
  RETURN lenses.fn_create_workflow_version(p_workflow_id, p_changelog);
END;
$$;

ALTER FUNCTION public.fn_create_workflow_version(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_create_workflow_version(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_workflow_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_workflow_version(uuid, text) TO service_role;

COMMENT ON FUNCTION public.fn_create_workflow_version(uuid, text) IS
  'Public wrapper: snapshots the current workflow DAG into a new draft version. '
  'Owner-only. Delegates ownership/auth check to lenses.fn_create_workflow_version.';

-- ── 3. Public wrapper: fn_publish_workflow_version ────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_publish_workflow_version(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
BEGIN
  PERFORM lenses.fn_publish_workflow_version(p_version_id);
END;
$$;

ALTER FUNCTION public.fn_publish_workflow_version(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_publish_workflow_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_publish_workflow_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_publish_workflow_version(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_publish_workflow_version(uuid) IS
  'Public wrapper: transitions a draft version to published and sets head_version_id. '
  'Owner-only. Delegates auth + immutability guard to lenses.fn_publish_workflow_version.';

-- ── 4. Public wrapper: fn_restore_workflow_version ────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_restore_workflow_version(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
BEGIN
  PERFORM lenses.fn_restore_workflow_version(p_version_id);
END;
$$;

ALTER FUNCTION public.fn_restore_workflow_version(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_restore_workflow_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_restore_workflow_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_restore_workflow_version(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_restore_workflow_version(uuid) IS
  'Public wrapper: copies a historical version DAG back into the live workflow nodes/edges '
  'as a new draft without mutating the historical version. '
  'Owner-only. Delegates auth check to lenses.fn_restore_workflow_version.';

-- ── 5. Update fn_start_workflow_run to bind workflow_version_id ───────────────
--
-- Strategy: replace the canonical 4-arg lenses implementation with a 5-arg
-- version that accepts an optional p_version_id. When NULL, the function
-- resolves the workflow's head_version_id (the latest published version).
-- The version_id is stored in workflow_runs.workflow_version_id so every run
-- is traceable to the exact immutable snapshot it executed against.
--
-- The public wrapper is also updated to accept and forward p_version_id.

CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id    uuid,
  p_inputs         jsonb   DEFAULT '{}',
  p_global_model_id text   DEFAULT NULL,
  p_idempotency_key text   DEFAULT NULL,
  p_version_id     uuid   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
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

ALTER FUNCTION lenses.fn_start_workflow_run(uuid, jsonb, text, text, uuid) OWNER TO postgres;

COMMENT ON FUNCTION lenses.fn_start_workflow_run(uuid, jsonb, text, text, uuid) IS
  'Creates a workflow_run, seeds pending node_results, and binds workflow_version_id. '
  'When p_version_id is NULL, resolves to head_version_id (latest published version). '
  'Preserves D2 anon-block and D4 idempotency TTL guards. '
  'Runs against unversioned workflows (no head_version_id) proceed with NULL version for backward compat.';

-- ── 6. Update the public wrapper to forward p_version_id ──────────────────────
--
-- Replace the existing 4-arg public wrapper with a 5-arg version.
-- Existing callers that omit p_version_id are unaffected (DEFAULT NULL).

CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id     uuid,
  p_inputs          jsonb  DEFAULT '{}',
  p_global_model_id text   DEFAULT NULL,
  p_idempotency_key text   DEFAULT NULL,
  p_version_id      uuid   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(
    p_workflow_id,
    p_inputs,
    p_global_model_id,
    p_idempotency_key,
    p_version_id
  );
END;
$$;

ALTER FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) TO service_role;

COMMENT ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) IS
  'Public entry point for starting a workflow run. '
  'Accepts optional p_version_id to pin execution to a specific immutable version. '
  'When omitted, resolves to the workflow head_version_id (latest published snapshot). '
  'D2+D4+Z2: anon callers rejected; idempotency_key window capped at 24h.';
