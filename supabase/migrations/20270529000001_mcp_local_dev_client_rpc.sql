-- MCP OAuth helper RPCs for the HTTP transport.
--
-- All lensers.mcp_* tables live outside the public schema, so the MCP server
-- cannot reach them via PostgREST table access. Every OAuth operation goes
-- through a public.fn_mcp_oauth_* SECURITY DEFINER wrapper here.
--
-- fn_mcp_ensure_local_dev_client — idempotent boot upsert (service_role only)
-- fn_mcp_oauth_lookup_client     — verify client_id + redirect_uri (service_role)
-- fn_mcp_oauth_create_auth_code  — insert pending auth code (service_role)
-- fn_mcp_oauth_lookup_auth_code  — fetch auth code by id (service_role)
-- fn_mcp_oauth_complete_auth_code— stamp code + lenser + refresh token (service_role)
-- fn_mcp_oauth_exchange_code     — redeem code → token row (service_role)
-- fn_mcp_oauth_issue_token       — insert mcp_tokens row (service_role)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Boot-time upsert of the stable local-dev client
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_ensure_local_dev_client(p_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
    FROM lensers.profiles
   ORDER BY created_at
   LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'no lenser profile found — run seed first';
  END IF;

  INSERT INTO lensers.mcp_clients (
    lenser_id, client_id, client_secret_hash,
    name, redirect_uris, requires_secret, is_active
  )
  VALUES (
    v_lenser_id,
    p_client_id,
    NULL,   -- PKCE-only; no secret needed
    'LenserFight Local Dev',
    ARRAY[
      'https://claude.ai/api/mcp/auth_callback',
      'http://localhost:3001/oauth/callback'
    ],
    false,  -- PKCE-only
    true
  )
  ON CONFLICT (client_id) DO UPDATE
    SET client_secret_hash = NULL,
        requires_secret    = false,
        redirect_uris      = EXCLUDED.redirect_uris,
        is_active          = true,
        revoked_at         = NULL;
END;
$$;

ALTER FUNCTION public.fn_mcp_ensure_local_dev_client(text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_ensure_local_dev_client(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_ensure_local_dev_client(text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RFC 7591 dynamic registration — inserts a PKCE-only client, first profile as owner
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_register_dynamic_client(
  p_client_id     text,
  p_name          text,
  p_redirect_uris text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id FROM lensers.profiles ORDER BY created_at LIMIT 1;
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'no lenser profile found';
  END IF;

  INSERT INTO lensers.mcp_clients (
    lenser_id, client_id, name, redirect_uris, requires_secret, is_active
  )
  VALUES (
    v_lenser_id, p_client_id, p_name, p_redirect_uris, false, true
  );
END;
$$;

ALTER FUNCTION public.fn_mcp_oauth_register_dynamic_client(text, text, text[]) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_register_dynamic_client(text, text, text[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_register_dynamic_client(text, text, text[]) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Look up a client by client_id — returns id + redirect_uris or NULL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_lookup_client(p_client_id text)
RETURNS TABLE(id uuid, redirect_uris text[], requires_secret boolean)
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = lensers, public
AS $$
  SELECT id, redirect_uris, requires_secret
    FROM lensers.mcp_clients
   WHERE client_id = p_client_id
     AND is_active = true
   LIMIT 1;
$$;

ALTER FUNCTION public.fn_mcp_oauth_lookup_client(text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_lookup_client(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_lookup_client(text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Insert a pending auth code; returns the new row id
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_create_auth_code(
  p_client_id      text,
  p_redirect_uri   text,
  p_code_challenge text,
  p_state          text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
  INSERT INTO lensers.mcp_auth_codes (
    client_id, redirect_uri, code_challenge, original_state, code
  )
  VALUES (
    p_client_id, p_redirect_uri, p_code_challenge, p_state, 'pending'
  )
  RETURNING id;
$$;

ALTER FUNCTION public.fn_mcp_oauth_create_auth_code(text, text, text, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_create_auth_code(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_create_auth_code(text, text, text, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Look up a pending auth code row by id
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_mcp_oauth_lookup_auth_code(uuid);
CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_lookup_auth_code(p_id uuid)
RETURNS TABLE(
  id             uuid,
  client_id      text,
  redirect_uri   text,
  original_state text,
  code_challenge text
)
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = lensers, public
AS $$
  SELECT id, client_id, redirect_uri, original_state, code_challenge
    FROM lensers.mcp_auth_codes
   WHERE id = p_id
   LIMIT 1;
$$;

ALTER FUNCTION public.fn_mcp_oauth_lookup_auth_code(uuid) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_lookup_auth_code(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_lookup_auth_code(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Stamp the auth code with the real code + lenser + supabase refresh token
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_complete_auth_code(
  p_id                    uuid,
  p_code                  text,
  p_lenser_id             uuid,
  p_supabase_refresh_token text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
  UPDATE lensers.mcp_auth_codes
     SET code                   = p_code,
         lenser_id              = p_lenser_id,
         supabase_refresh_token = p_supabase_refresh_token
   WHERE id = p_id;
$$;

ALTER FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_complete_auth_code(uuid, text, uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Exchange an auth code for its stored data and mark it used
-- ─────────────────────────────────────────────────────────────────────────────

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
     AND client_id  = p_client_id
     AND used_at   IS NULL
  RETURNING id, redirect_uri, lenser_id, supabase_refresh_token, code_challenge, expires_at;
$$;

ALTER FUNCTION public.fn_mcp_oauth_exchange_code(text, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_exchange_code(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_exchange_code(text, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Insert an issued MCP bearer token
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_oauth_issue_token(
  p_client_id             text,
  p_lenser_id             uuid,
  p_token                 text,
  p_supabase_refresh_token text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
  INSERT INTO lensers.mcp_tokens (
    client_id, lenser_id, token, supabase_refresh_token, is_active
  )
  VALUES (
    p_client_id, p_lenser_id, p_token, p_supabase_refresh_token, true
  );
$$;

ALTER FUNCTION public.fn_mcp_oauth_issue_token(text, uuid, text, text) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_oauth_issue_token(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_mcp_oauth_issue_token(text, uuid, text, text) TO service_role;
