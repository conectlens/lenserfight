-- Resolve PostgREST RPC ambiguity for fn_start_workflow_run.
--
-- Why:
--   Both 3-arg and 4-arg overloads exist on public.fn_start_workflow_run.
--   PostgREST cannot choose a best candidate when the payload includes
--   p_workflow_id + p_inputs + p_global_model_id only, and raises PGRST203.
--
-- Fix:
--   Keep a single public RPC signature with optional p_idempotency_key.
--   Remove older 2-arg/3-arg public overloads.

DROP FUNCTION IF EXISTS public.fn_start_workflow_run(uuid, jsonb);
DROP FUNCTION IF EXISTS public.fn_start_workflow_run(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.fn_start_workflow_run(
  p_workflow_id uuid,
  p_inputs jsonb DEFAULT '{}'::jsonb,
  p_global_model_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO lenses, lensers, public
AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(
    p_workflow_id,
    p_inputs,
    p_global_model_id,
    p_idempotency_key
  );
END;
$$;

ALTER FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO service_role;

COMMENT ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) IS
  'Canonical workflow-start RPC. Supports idempotent replay via optional p_idempotency_key. Old 2-arg/3-arg overloads are removed to avoid PostgREST PGRST203 ambiguity.';
