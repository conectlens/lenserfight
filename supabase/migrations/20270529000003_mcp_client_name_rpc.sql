-- Extend fn_mcp_oauth_lookup_client to include the client name so callers
-- don't need direct access to the lensers schema (not exposed via PostgREST).

DROP FUNCTION IF EXISTS public.fn_mcp_oauth_lookup_client(text);

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_lookup_client(p_client_id text)
RETURNS TABLE(id uuid, name text, redirect_uris text[], requires_secret boolean)
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = lensers, public
AS $$
  SELECT id, name, redirect_uris, requires_secret
    FROM lensers.mcp_clients
   WHERE client_id = p_client_id
     AND is_active = true
   LIMIT 1;
$$;

ALTER FUNCTION public.fn_mcp_oauth_lookup_client(text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_lookup_client(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_lookup_client(text) TO service_role;
