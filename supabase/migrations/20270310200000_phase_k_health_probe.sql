-- Phase K4: lightweight health probe RPC
--
-- Returns 1. Used by GET /health on the platform-api to verify database
-- reachability without taking a dependency on any specific application table.
--
-- Uses STABLE so the planner can short-circuit; no side effects.

CREATE OR REPLACE FUNCTION public.fn_health()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 1;
$$;

ALTER FUNCTION public.fn_health() OWNER TO postgres;

COMMENT ON FUNCTION public.fn_health() IS
  'Phase K4 health probe. Returns 1. Called by the platform-api GET /health '
  'route to verify database reachability.';

GRANT EXECUTE ON FUNCTION public.fn_health() TO authenticated, service_role, anon;
