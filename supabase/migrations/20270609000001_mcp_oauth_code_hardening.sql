-- MCP OAuth: authorization codes are single-use, short-lived values that are
-- distinct from bearer tokens. The bearer token is minted at /oauth/token after
-- the client and PKCE checks, so these RPCs now refuse to hand out or overwrite
-- a code that is not in the expected state.

-- Only a completed (non-placeholder), unexpired, unused code can be exchanged.
CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_exchange_code(
  p_code      text,
  p_client_id text
)
RETURNS TABLE(
  id                     uuid,
  redirect_uri           text,
  lenser_id              uuid,
  supabase_refresh_token text,
  code_challenge         text,
  expires_at             timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
  UPDATE lensers.mcp_auth_codes
     SET used_at = now()
   WHERE code       = p_code
     AND code      <> 'pending'
     AND client_id  = p_client_id
     AND lenser_id IS NOT NULL
     AND used_at   IS NULL
     AND expires_at > now()
  RETURNING id, redirect_uri, lenser_id, supabase_refresh_token, code_challenge, expires_at;
$$;

ALTER FUNCTION public.fn_mcp_oauth_exchange_code(text, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_exchange_code(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_exchange_code(text, text) TO service_role;

-- A pending authorization request can be completed once, before it expires.
CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_complete_auth_code(
  p_id                     uuid,
  p_code                   text,
  p_lenser_id              uuid,
  p_supabase_refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
BEGIN
  UPDATE lensers.mcp_auth_codes
     SET code                   = p_code,
         lenser_id              = p_lenser_id,
         supabase_refresh_token = p_supabase_refresh_token
   WHERE id         = p_id
     AND code       = 'pending'
     AND used_at   IS NULL
     AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'authorization request not found, expired or already completed';
  END IF;
END;
$$;

ALTER FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) TO service_role;
