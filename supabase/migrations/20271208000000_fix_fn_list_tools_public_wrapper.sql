-- public.fn_list_tools(p_category) — PostgREST-reachable wrapper around
-- lenses.fn_list_tools which lives in a non-exposed schema.
-- Mirrors the pattern used by public.fn_clone_lens.

CREATE OR REPLACE FUNCTION public.fn_list_tools(
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT lenses.fn_list_tools(p_category);
$$;

ALTER FUNCTION public.fn_list_tools(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_tools(text) TO authenticated, anon, service_role;
