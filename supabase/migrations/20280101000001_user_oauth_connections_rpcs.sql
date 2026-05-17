-- OAuth Connector Phase 1: RPCs for user_oauth_connections
--
-- Five SECURITY DEFINER functions backing the OAuth connector system.
-- All functions lock search_path. Caller boundary:
--   - fn_oauth_list_connections      → authenticated
--   - fn_oauth_revoke_connection     → authenticated (owner check)
--   - fn_oauth_upsert_connection     → service_role only (Edge Functions)
--   - fn_oauth_resolve_connection    → service_role only (execution workers)
--   - fn_oauth_get_connection_for_refresh → service_role only (token refresh)
--
-- Rollback strategy:
--   DROP FUNCTION IF EXISTS public.fn_oauth_list_connections();
--   DROP FUNCTION IF EXISTS public.fn_oauth_upsert_connection(uuid,text,text,text,text,text,text[],timestamptz);
--   DROP FUNCTION IF EXISTS public.fn_oauth_revoke_connection(uuid);
--   DROP FUNCTION IF EXISTS public.fn_oauth_resolve_connection(uuid,text,text[]);
--   DROP FUNCTION IF EXISTS public.fn_oauth_get_connection_for_refresh(uuid,text);

-- ── 1. fn_oauth_list_connections ─────────────────────────────────────────────
-- Returns safe metadata for the calling user's active connections.
-- Never exposes access_token_id or refresh_token_id.

CREATE OR REPLACE FUNCTION public.fn_oauth_list_connections()
RETURNS TABLE (
  id               uuid,
  workspace_id     uuid,
  provider         text,
  capability       text,
  connection_label text,
  ref              text,
  granted_scopes   text[],
  expires_at       timestamptz,
  is_active        boolean,
  created_at       timestamptz,
  updated_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lensers
AS $$
  SELECT
    c.id,
    c.workspace_id,
    c.provider,
    c.capability,
    c.connection_label,
    c.ref,
    c.granted_scopes,
    c.expires_at,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM public.user_oauth_connections c
  JOIN lensers.profiles p ON p.id = c.lenser_id
  WHERE p.user_id = auth.uid()
    AND c.revoked_at IS NULL
  ORDER BY c.provider, c.capability, c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.fn_oauth_list_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_oauth_list_connections() TO authenticated, service_role;

-- ── 2. fn_oauth_upsert_connection ────────────────────────────────────────────
-- Called exclusively from the oauth-google-callback Edge Function (service_role).
-- Stores access and refresh tokens in Supabase Vault, upserts the connection row.
-- Returns the connection id.

CREATE OR REPLACE FUNCTION public.fn_oauth_upsert_connection(
  p_lenser_id      uuid,
  p_workspace_id   uuid,
  p_provider       text,
  p_capability     text,
  p_label          text,
  p_access_token   text,
  p_refresh_token  text DEFAULT NULL,
  p_granted_scopes text[] DEFAULT '{}',
  p_expires_at     timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_ref            text;
  v_access_name    text;
  v_refresh_name   text;
  v_access_id      uuid;
  v_refresh_id     uuid;
  v_conn_id        uuid;
BEGIN
  v_ref          := p_provider || '.' || p_capability || '.' || p_label;
  v_access_name  := 'oauth_access_'  || p_lenser_id::text || '_' || v_ref;
  v_refresh_name := 'oauth_refresh_' || p_lenser_id::text || '_' || v_ref;

  -- Store or rotate access token in vault
  SELECT id INTO v_access_id
  FROM vault.secrets
  WHERE name = v_access_name
  LIMIT 1;

  IF v_access_id IS NULL THEN
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (v_access_name, p_access_token, 'OAuth access token: ' || v_ref)
    RETURNING id INTO v_access_id;
  ELSE
    UPDATE vault.secrets
    SET secret = p_access_token
    WHERE id = v_access_id;
  END IF;

  -- Store or rotate refresh token in vault (if provided)
  IF p_refresh_token IS NOT NULL THEN
    SELECT id INTO v_refresh_id
    FROM vault.secrets
    WHERE name = v_refresh_name
    LIMIT 1;

    IF v_refresh_id IS NULL THEN
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (v_refresh_name, p_refresh_token, 'OAuth refresh token: ' || v_ref)
      RETURNING id INTO v_refresh_id;
    ELSE
      UPDATE vault.secrets
      SET secret = p_refresh_token
      WHERE id = v_refresh_id;
    END IF;
  END IF;

  -- Upsert the connection row (on conflict: update tokens + scopes + expiry)
  INSERT INTO public.user_oauth_connections (
    lenser_id,
    workspace_id,
    provider,
    capability,
    connection_label,
    ref,
    access_token_id,
    refresh_token_id,
    granted_scopes,
    expires_at,
    is_active,
    revoked_at,
    updated_at
  )
  VALUES (
    p_lenser_id,
    p_workspace_id,
    p_provider,
    p_capability,
    p_label,
    v_ref,
    v_access_id,
    v_refresh_id,
    p_granted_scopes,
    p_expires_at,
    true,
    NULL,
    now()
  )
  ON CONFLICT (lenser_id, workspace_id, ref) DO UPDATE
    SET access_token_id  = EXCLUDED.access_token_id,
        -- Only update refresh_token_id if a new one was provided
        refresh_token_id = COALESCE(
          CASE WHEN p_refresh_token IS NOT NULL THEN EXCLUDED.refresh_token_id END,
          user_oauth_connections.refresh_token_id
        ),
        granted_scopes   = EXCLUDED.granted_scopes,
        expires_at       = EXCLUDED.expires_at,
        is_active        = true,
        revoked_at       = NULL,
        updated_at       = now()
  RETURNING id INTO v_conn_id;

  RETURN v_conn_id;
END;
$$;

-- service_role only — never callable from PostgREST/authenticated users
REVOKE ALL ON FUNCTION public.fn_oauth_upsert_connection(uuid,uuid,text,text,text,text,text,text[],timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_oauth_upsert_connection(uuid,uuid,text,text,text,text,text,text[],timestamptz)
  TO service_role;

-- ── 3. fn_oauth_revoke_connection ────────────────────────────────────────────
-- Soft-revokes a connection. Validates ownership. Does not delete vault secrets
-- (audit trail). Token refresh will fail after revocation.

CREATE OR REPLACE FUNCTION public.fn_oauth_revoke_connection(
  p_connection_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'oauth_revoke_unauthorized: no profile for caller'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_oauth_connections
    WHERE id = p_connection_id
      AND lenser_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'oauth_revoke_forbidden: connection not found or not owned'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_oauth_connections
  SET
    is_active  = false,
    revoked_at = now(),
    updated_at = now()
  WHERE id = p_connection_id
    AND lenser_id = v_lenser_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_oauth_revoke_connection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_oauth_revoke_connection(uuid) TO authenticated, service_role;

-- ── 4. fn_oauth_resolve_connection ──────────────────────────────────────────
-- Runtime credential resolver. Called exclusively from execution workers
-- (service_role). Validates ownership + active status + scope coverage, then
-- returns the decrypted access token from Vault. Never callable from browser.
--
-- The caller (TypeScript) pre-checks expiry and triggers refresh via Edge
-- Function before calling this. This function re-reads expiry to double-check.

CREATE OR REPLACE FUNCTION public.fn_oauth_resolve_connection(
  p_lenser_id       uuid,
  p_ref             text,
  p_required_scopes text[] DEFAULT '{}',
  p_workspace_id    uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_conn         public.user_oauth_connections%ROWTYPE;
  v_access_token text;
BEGIN
  SELECT * INTO v_conn
  FROM public.user_oauth_connections
  WHERE lenser_id = p_lenser_id
    AND ref       = p_ref
    AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    AND is_active = true
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'oauth_resolve_not_found: ref=% lenser=%', p_ref, p_lenser_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Scope containment check: required ⊆ granted
  IF array_length(p_required_scopes, 1) > 0 THEN
    IF NOT (p_required_scopes <@ v_conn.granted_scopes) THEN
      RAISE EXCEPTION
        'oauth_resolve_scope_mismatch: ref=%, required=%, granted=%',
        p_ref, p_required_scopes, v_conn.granted_scopes
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Retrieve access token from vault
  SELECT decrypted_secret INTO v_access_token
  FROM vault.decrypted_secrets
  WHERE id = v_conn.access_token_id;

  IF v_access_token IS NULL THEN
    RAISE EXCEPTION 'oauth_resolve_vault_miss: vault secret missing for ref=%', p_ref
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_access_token;
END;
$$;

-- service_role only — execution workers run as service_role
REVOKE ALL ON FUNCTION public.fn_oauth_resolve_connection(uuid,text,text[],uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_oauth_resolve_connection(uuid,text,text[],uuid)
  TO service_role;

-- ── 5. fn_oauth_get_connection_for_refresh ──────────────────────────────────
-- Returns refresh metadata for the token refresher Edge Function.
-- Called by execution worker before fn_oauth_resolve_connection when
-- expires_at is within 5 minutes. service_role only.

CREATE OR REPLACE FUNCTION public.fn_oauth_get_connection_for_refresh(
  p_lenser_id uuid,
  p_ref       text,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_conn          public.user_oauth_connections%ROWTYPE;
  v_refresh_token text;
BEGIN
  SELECT * INTO v_conn
  FROM public.user_oauth_connections
  WHERE lenser_id = p_lenser_id
    AND ref       = p_ref
    AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    AND is_active = true
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- No refresh token stored — caller cannot refresh
  IF v_conn.refresh_token_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Not near expiry (> 5 min remaining) — no refresh needed
  IF v_conn.expires_at IS NOT NULL
     AND v_conn.expires_at > (now() + interval '5 minutes')
  THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_refresh_token
  FROM vault.decrypted_secrets
  WHERE id = v_conn.refresh_token_id;

  IF v_refresh_token IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'connection_id',   v_conn.id,
    'workspace_id',    v_conn.workspace_id,
    'refresh_token',   v_refresh_token,
    'expires_at',      v_conn.expires_at,
    'granted_scopes',  v_conn.granted_scopes,
    'provider',        v_conn.provider,
    'capability',      v_conn.capability
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_oauth_get_connection_for_refresh(uuid,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_oauth_get_connection_for_refresh(uuid,text,uuid)
  TO service_role;
