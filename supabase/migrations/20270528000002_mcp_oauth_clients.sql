-- MCP OAuth client registration, authorization codes, and access tokens.
-- Supports OAuth 2.0 Authorization Code + PKCE for Claude.ai / Cursor connectors.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE lensers.mcp_clients (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id         uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  client_id         text        NOT NULL UNIQUE,           -- e.g. lf_mcp_client_<hex>
  client_secret_hash text       NULL,                     -- bcrypt via pgcrypto; NULL = public/PKCE-only client
  name              text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description       text        NULL CHECK (char_length(description) <= 500),
  redirect_uris     text[]      NOT NULL DEFAULT '{}',
  requires_secret   boolean     NOT NULL DEFAULT false,   -- false = PKCE-only allowed
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz NULL
);

CREATE INDEX idx_mcp_clients_lenser_id  ON lensers.mcp_clients(lenser_id);
CREATE INDEX idx_mcp_clients_client_id  ON lensers.mcp_clients(client_id) WHERE is_active;

COMMENT ON TABLE lensers.mcp_clients IS 'OAuth 2.0 client registrations for MCP server connections.';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE lensers.mcp_auth_codes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             text        NOT NULL,
  lenser_id             uuid        NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  code                  text        NOT NULL DEFAULT 'pending',
  redirect_uri          text        NOT NULL,
  code_challenge        text        NULL,    -- PKCE S256 challenge
  original_state        text        NULL,    -- client's state parameter, echoed back
  supabase_refresh_token text       NULL,    -- stored after Supabase Auth callback
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at               timestamptz NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_auth_codes_code      ON lensers.mcp_auth_codes(code) WHERE used_at IS NULL;
CREATE INDEX idx_mcp_auth_codes_client_id ON lensers.mcp_auth_codes(client_id, created_at DESC);

COMMENT ON TABLE lensers.mcp_auth_codes IS 'Short-lived OAuth authorization codes issued during PKCE flow.';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE lensers.mcp_tokens (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             text        NOT NULL,
  lenser_id             uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  token                 text        NOT NULL UNIQUE,       -- lf_mcp_<hex>; bearer token given to client
  supabase_refresh_token text       NOT NULL,              -- used to mint fresh Supabase JWTs on each request
  is_active             boolean     NOT NULL DEFAULT true,
  expires_at            timestamptz NULL,                  -- NULL = non-expiring until revoked
  revoked_at            timestamptz NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_tokens_token     ON lensers.mcp_tokens(token) WHERE is_active;
CREATE INDEX idx_mcp_tokens_lenser_id ON lensers.mcp_tokens(lenser_id, created_at DESC);
CREATE INDEX idx_mcp_tokens_client_id ON lensers.mcp_tokens(client_id);

COMMENT ON TABLE lensers.mcp_tokens IS 'Active MCP bearer tokens; each maps to a Supabase refresh token for user-scoped queries.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lensers.mcp_clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lensers.mcp_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lensers.mcp_tokens     ENABLE ROW LEVEL SECURITY;

-- mcp_clients: only the owning lenser sees / manages their clients
CREATE POLICY mcp_clients_owner_select ON lensers.mcp_clients
  FOR SELECT USING (
    lenser_id IN (
      SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY mcp_clients_owner_insert ON lensers.mcp_clients
  FOR INSERT WITH CHECK (
    lenser_id IN (
      SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY mcp_clients_owner_update ON lensers.mcp_clients
  FOR UPDATE USING (
    lenser_id IN (
      SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
    )
  );

-- mcp_auth_codes: no direct user access (managed exclusively by SECURITY DEFINER RPCs)
-- No SELECT/INSERT/UPDATE policies — only service_role can touch this table directly.

-- mcp_tokens: only the owning lenser may view their tokens
CREATE POLICY mcp_tokens_owner_select ON lensers.mcp_tokens
  FOR SELECT USING (
    lenser_id IN (
      SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- Verifies a client_id / client_secret pair using bcrypt.
-- Returns true if credentials match an active client with a secret hash.
CREATE OR REPLACE FUNCTION lensers.verify_mcp_client_secret(
  p_client_id text,
  p_secret    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, extensions, public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT client_secret_hash
    INTO v_hash
    FROM lensers.mcp_clients
   WHERE client_id  = p_client_id
     AND is_active  = true
     AND client_secret_hash IS NOT NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN extensions.crypt(p_secret, v_hash) = v_hash;
END;
$$;

REVOKE ALL    ON FUNCTION lensers.verify_mcp_client_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION lensers.verify_mcp_client_secret(text, text) TO service_role;

COMMENT ON FUNCTION lensers.verify_mcp_client_secret IS
  'Constant-time bcrypt check for MCP OAuth client credentials. Only callable by service_role.';

-- ─────────────────────────────────────────────────────────────────────────────

-- Creates a new OAuth client for the calling lenser.
-- Returns the plain-text secret ONCE (caller must store it); subsequent calls cannot retrieve it.
CREATE OR REPLACE FUNCTION lensers.fn_create_mcp_client(
  p_name            text,
  p_redirect_uris   text[]           DEFAULT '{}',
  p_requires_secret boolean          DEFAULT false,
  p_description     text             DEFAULT NULL
)
RETURNS TABLE (client_id text, client_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, extensions, public
AS $$
DECLARE
  v_lenser_id   uuid;
  v_client_id   text;
  v_secret      text;
  v_secret_hash text;
BEGIN
  SELECT id INTO v_lenser_id
    FROM lensers.profiles
   WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'authenticated lenser not found';
  END IF;

  v_client_id := 'lf_mcp_client_' || encode(gen_random_bytes(16), 'hex');

  IF p_requires_secret THEN
    v_secret      := encode(gen_random_bytes(32), 'hex');
    v_secret_hash := extensions.crypt(v_secret, extensions.gen_salt('bf', 10));
  ELSE
    v_secret      := NULL;
    v_secret_hash := NULL;
  END IF;

  INSERT INTO lensers.mcp_clients
    (lenser_id, client_id, client_secret_hash, name, description, redirect_uris, requires_secret)
  VALUES
    (v_lenser_id, v_client_id, v_secret_hash, p_name, p_description, p_redirect_uris, p_requires_secret);

  RETURN QUERY SELECT v_client_id, v_secret;
END;
$$;

REVOKE ALL     ON FUNCTION lensers.fn_create_mcp_client(text, text[], boolean, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION lensers.fn_create_mcp_client(text, text[], boolean, text) TO authenticated;

COMMENT ON FUNCTION lensers.fn_create_mcp_client IS
  'Creates a new MCP OAuth client for the calling lenser. Returns (client_id, client_secret); secret is shown once and cannot be retrieved again. Pass p_requires_secret=false for PKCE-only (ngrok/local dev) clients.';

-- ─────────────────────────────────────────────────────────────────────────────

-- Lists all active OAuth clients owned by the calling lenser.
CREATE OR REPLACE FUNCTION lensers.fn_list_mcp_clients()
RETURNS TABLE (
  id              uuid,
  client_id       text,
  name            text,
  description     text,
  redirect_uris   text[],
  requires_secret boolean,
  is_active       boolean,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
    FROM lensers.profiles
   WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'authenticated lenser not found';
  END IF;

  RETURN QUERY
    SELECT c.id, c.client_id, c.name, c.description,
           c.redirect_uris, c.requires_secret, c.is_active, c.created_at
      FROM lensers.mcp_clients c
     WHERE c.lenser_id = v_lenser_id
     ORDER BY c.created_at DESC;
END;
$$;

REVOKE ALL     ON FUNCTION lensers.fn_list_mcp_clients() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION lensers.fn_list_mcp_clients() TO authenticated;

COMMENT ON FUNCTION lensers.fn_list_mcp_clients IS
  'Returns all MCP OAuth clients owned by the calling lenser. Secret hashes are never returned.';

-- ─────────────────────────────────────────────────────────────────────────────

-- Revokes an OAuth client and all its issued tokens.
CREATE OR REPLACE FUNCTION lensers.fn_revoke_mcp_client(
  p_client_id text
)
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
   WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'authenticated lenser not found';
  END IF;

  -- Revoke the client
  UPDATE lensers.mcp_clients
     SET is_active  = false,
         revoked_at = now()
   WHERE client_id  = p_client_id
     AND lenser_id  = v_lenser_id
     AND is_active  = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client not found or already revoked';
  END IF;

  -- Revoke all tokens issued for this client
  UPDATE lensers.mcp_tokens
     SET is_active  = false,
         revoked_at = now()
   WHERE client_id  = p_client_id
     AND is_active  = true;
END;
$$;

REVOKE ALL     ON FUNCTION lensers.fn_revoke_mcp_client(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION lensers.fn_revoke_mcp_client(text) TO authenticated;

COMMENT ON FUNCTION lensers.fn_revoke_mcp_client IS
  'Revokes an MCP OAuth client and all its active access tokens. Only the owning lenser may call this.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup cron: expire old auth codes (runs every 10 minutes via pg_cron)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'mcp-expire-auth-codes',
  '*/10 * * * *',
  $$
    DELETE FROM lensers.mcp_auth_codes
     WHERE expires_at < now() - interval '1 hour';
  $$
);
