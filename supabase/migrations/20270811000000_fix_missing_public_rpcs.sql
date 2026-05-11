-- Migration: fix_missing_public_rpcs
-- Purpose:
--   1. Create public.fn_get_workspace_controls — was missing from public schema (404 on profile +
--      agent control room pages). Wraps agents.v_run_unified with a mandatory limit.
--   2. Create public.fn_get_lens_execution_history — was in execution schema only (404 on lens
--      detail page). Delegates to execution.fn_get_lens_execution_history.
-- Both functions are SECURITY DEFINER so the caller's JWT is forwarded for RLS enforcement.

-- ─── 1. fn_get_workspace_controls ─────────────────────────────────────────────
-- Returns a unified run list (team runs + workflow runs) for an AI agent.
-- Replaces the client-side filter pattern: always fetch server-limited data;
-- callers may still slice further on the client.

DROP FUNCTION IF EXISTS public.fn_get_workspace_controls(uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_get_workspace_controls(
  p_ai_lenser_id uuid,
  p_limit        integer DEFAULT 50
)
RETURNS TABLE (
  run_id                   uuid,
  run_type                 text,
  ai_lenser_id             uuid,
  status                   text,
  approval_status          text,
  total_cost               numeric,
  step_count               bigint,
  memory_write_count       bigint,
  latest_evaluation_score  numeric,
  started_at               timestamptz,
  completed_at             timestamptz,
  duration_seconds         numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lenses', 'lensers', 'auth'
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
BEGIN
  IF p_ai_lenser_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.run_id,
    v.run_type,
    v.ai_lenser_id,
    v.status,
    v.approval_status,
    v.total_cost,
    v.step_count,
    v.memory_write_count,
    v.latest_evaluation_score,
    v.started_at,
    v.completed_at,
    v.duration_seconds
  FROM agents.v_run_unified v
  WHERE v.ai_lenser_id = p_ai_lenser_id
  ORDER BY v.started_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.fn_get_workspace_controls(uuid, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_workspace_controls(uuid, integer)
  TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_workspace_controls(uuid, integer) IS
  'Public SECURITY DEFINER wrapper around agents.v_run_unified. '
  'Returns up to p_limit (max 200, default 50) unified runs for the given AI agent. '
  'RLS enforcement is via agents.can_manage_ai_lenser inside the view. '
  'Returns empty set instead of 404/500 for unknown or inaccessible agents.';


-- ─── 2. fn_get_lens_execution_history ────────────────────────────────────────
-- The canonical implementation lives in the execution schema which PostgREST
-- cannot call directly (only public schema is exposed). This wrapper delegates
-- to the original while keeping the call site unchanged.

DROP FUNCTION IF EXISTS public.fn_get_lens_execution_history(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.fn_get_lens_execution_history(
  p_lens_id uuid,
  p_limit   integer DEFAULT 20,
  p_offset  integer DEFAULT 0
)
RETURNS TABLE (
  request_id    uuid,
  lens_id       uuid,
  version_id    uuid,
  version_number integer,
  model_id      uuid,
  model_key     text,
  provider_key  text,
  funding_source text,
  run_id        uuid,
  run_status    text,
  latency_ms    integer,
  token_input   integer,
  token_output  integer,
  credit_cost   bigint,
  created_at    timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'execution', 'lenses', 'ai', 'lensers', 'auth'
AS $$
DECLARE
  v_limit  integer := LEAST(GREATEST(COALESCE(p_limit,  20), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF p_lens_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM execution.fn_get_lens_execution_history(p_lens_id, v_limit, v_offset);
END;
$$;

ALTER FUNCTION public.fn_get_lens_execution_history(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_execution_history(uuid, integer, integer)
  TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_lens_execution_history(uuid, integer, integer) IS
  'Public SECURITY DEFINER wrapper exposing execution.fn_get_lens_execution_history via '
  'PostgREST. Caps p_limit to 100, p_offset to >= 0. Returns empty set (not 404) for '
  'unknown lenses or unauthenticated callers — the inner function enforces auth.';
