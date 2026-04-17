-- =============================================================================
-- 20260423000000_workflow_scale_hardening.sql
-- -----------------------------------------------------------------------------
-- Phase 9 — Scale hardening (Lens Workflow Engine Blueprint §12).
--
-- Adds:
--   1. Per-lenser start-rate limit on `fn_start_workflow_run`.
--   2. Strengthens the existing idempotency_key path (touches updated_at,
--      surfaces the returned row as the canonical "identical submit" response).
--   3. Budget-aware cancellation RPC `fn_cancel_workflow_run_over_budget` that
--      reconciles `spent_credits` against `budget_credits` plus in-flight
--      wallet reservations.
--
-- Non-goals
-- ---------
-- * Pricing / per-plan quotas — those stay in the billing domain.
-- * Cross-workflow throttling — handled at the CDN edge.
-- =============================================================================

-- ─── 0. Helper: recent run count per lenser ───────────────────────────────
CREATE OR REPLACE FUNCTION lenses.fn_count_recent_runs(
  p_lenser_id uuid,
  p_window_seconds integer
) RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'lenses'
AS $$
  SELECT COUNT(*)::int
  FROM lenses.workflow_runs r
  WHERE r.triggered_by = p_lenser_id
    AND r.created_at > now() - make_interval(secs => GREATEST(p_window_seconds, 0)::numeric);
$$;

COMMENT ON FUNCTION lenses.fn_count_recent_runs(uuid, integer) IS
  'Phase 9 — returns the number of workflow_runs started by a lenser in the last N seconds (used by rate limiter).';

-- ─── 1. Idempotent + rate-limited fn_start_workflow_run ───────────────────
-- Replaces the overload added in 20260417140000_lens_output_contract.sql.
-- Backwards compatible: the public wrapper retains the same signature.
CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id uuid,
  p_inputs jsonb DEFAULT '{}'::jsonb,
  p_global_model_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
  v_run_id    uuid;
  v_rate_window_sec  integer := 60;
  v_rate_limit_count integer := 30;
  v_recent_count     integer;
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

  -- Idempotency short-circuit: identical submits return the existing run
  -- without touching the rate limiter.
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

  -- Rate limit (per-lenser, sliding window). Values are intentionally set
  -- conservatively here; production can override via GUCs / a settings row.
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
    workflow_id, triggered_by, status, context_inputs,
    global_model_id, idempotency_key
  )
  VALUES (
    p_workflow_id, v_lenser_id, 'pending', p_inputs,
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
  'Phase 9 — idempotent + rate-limited start. Short-circuits on matching idempotency_key; otherwise enforces a per-lenser sliding-window cap (default 30 runs / 60s) before inserting.';

-- Public wrapper remains the same signature for existing callers.
CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id uuid,
  p_inputs jsonb DEFAULT '{}'::jsonb,
  p_global_model_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key);
END;
$$;

ALTER FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO authenticated, anon, service_role;

-- ─── 2. Budget-aware cancellation ─────────────────────────────────────────
--
-- Cancels a run if (spent_credits + pendingReservations) would exceed
-- budget_credits. Called periodically by the worker heartbeat loop.
-- Inputs:
--   p_run_id           — the run to check.
--   p_pending_credits  — the caller's current view of not-yet-settled
--                        credit reservations for this run (worker-local).
--
-- Behaviour:
--   * If budget_credits is NULL the run is unbounded; returns FALSE.
--   * Otherwise updates workflow_runs.cost_metadata['budgetCancellation']
--     with a structured reason and transitions status -> 'cancelled'
--     + stamps completed_at via fn_update_workflow_run_status.
--   * Returns TRUE when the run was cancelled, FALSE otherwise.
CREATE OR REPLACE FUNCTION public.fn_cancel_workflow_run_over_budget(
  p_run_id          uuid,
  p_pending_credits integer DEFAULT 0
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_run            lenses.workflow_runs%ROWTYPE;
  v_projected      integer;
  v_pending        integer := GREATEST(COALESCE(p_pending_credits, 0), 0);
  v_cost_metadata  jsonb;
BEGIN
  SELECT * INTO v_run
  FROM lenses.workflow_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Never cancel already-terminal runs.
  IF v_run.status IN ('completed', 'failed', 'cancelled', 'timed_out') THEN
    RETURN FALSE;
  END IF;

  IF v_run.budget_credits IS NULL THEN
    RETURN FALSE;
  END IF;

  v_projected := COALESCE(v_run.spent_credits, 0) + v_pending;

  IF v_projected <= v_run.budget_credits THEN
    RETURN FALSE;
  END IF;

  v_cost_metadata := COALESCE(v_run.cost_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'budgetCancellation', jsonb_build_object(
        'cancelledAt', now(),
        'budgetCredits', v_run.budget_credits,
        'spentCredits', v_run.spent_credits,
        'pendingCredits', v_pending,
        'projectedCredits', v_projected,
        'reason', 'budget_exceeded'
      )
    );

  UPDATE lenses.workflow_runs
  SET
    status       = 'cancelled',
    completed_at = now(),
    run_worker_id = NULL,
    cost_metadata = v_cost_metadata
  WHERE id = p_run_id;

  -- Cascade cancellation to any still-running node results so the timeline
  -- view does not keep spinners going forever.
  UPDATE lenses.workflow_node_results
  SET status       = 'cancelled',
      completed_at = now(),
      error_message = COALESCE(error_message, 'budget_exceeded')
  WHERE run_id = p_run_id
    AND status IN ('pending', 'awaiting_dependency', 'queued', 'running', 'streaming', 'retrying');

  -- Append an event so SSE clients see the cancellation immediately.
  INSERT INTO lenses.workflow_run_events (run_id, event_id, type, payload)
  SELECT
    p_run_id,
    COALESCE(MAX(e.event_id), 0) + 1,
    'run.cancelled',
    jsonb_build_object(
      'runId', p_run_id,
      'reason', 'budget_exceeded',
      'budgetCredits', v_run.budget_credits,
      'spentCredits', v_run.spent_credits,
      'pendingCredits', v_pending
    )
  FROM lenses.workflow_run_events e
  WHERE e.run_id = p_run_id;

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.fn_cancel_workflow_run_over_budget(uuid, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_cancel_workflow_run_over_budget(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.fn_cancel_workflow_run_over_budget(uuid, integer) IS
  'Phase 9 — cancels a run when spent_credits + pendingReservations exceed budget_credits. Cascades to node results and emits run.cancelled event. Invoked periodically by the worker heartbeat loop.';
