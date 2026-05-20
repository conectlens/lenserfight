-- Migration: Chainabit OAuth token persistence helpers
--
-- Problem: Supabase GoTrue stores only the userinfo endpoint response as
-- auth.identities.identity_data for custom OAuth providers.  The Chainabit
-- userinfo endpoint now returns access_token + expires_at (Fix 1), but does
-- NOT return refresh_token (it's stored server-side only).  To support
-- server-side token refresh in edge functions, the refresh_token must be
-- persisted into identity_data from the client immediately after linkIdentity().
--
-- Two functions:
--   fn_store_my_chainabit_tokens  — called by the browser after OAuth callback;
--                                   uses auth.uid() so users can only update
--                                   their own record.  Stores refresh_token only
--                                   (access_token comes from userinfo fix).
--
--   fn_upsert_chainabit_tokens    — called by edge functions (service_role);
--                                   accepts p_user_id explicitly and updates
--                                   access_token, refresh_token, expires_at
--                                   after a server-side token refresh.

-- ── Client-side: store refresh_token after linkIdentity() callback ────────────
CREATE OR REPLACE FUNCTION public.fn_store_my_chainabit_tokens(
  p_refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE auth.identities
  SET
    identity_data = identity_data || jsonb_build_object('refresh_token', p_refresh_token),
    updated_at    = now()
  WHERE provider = 'custom:chainabit'
    AND user_id  = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text) TO authenticated;

-- ── Server-side (edge function / service_role): full token upsert ─────────────
CREATE OR REPLACE FUNCTION public.fn_upsert_chainabit_tokens(
  p_user_id      uuid,
  p_access_token  text,
  p_refresh_token text,
  p_expires_at    bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.identities
  SET
    identity_data = identity_data || jsonb_build_object(
      'access_token',  p_access_token,
      'refresh_token', p_refresh_token,
      'expires_at',    p_expires_at
    ),
    updated_at = now()
  WHERE provider = 'custom:chainabit'
    AND user_id  = p_user_id;
END;
$$;

-- Only service_role (edge functions with SUPABASE_SERVICE_ROLE_KEY) may call
-- this function.  Regular authenticated users use fn_store_my_chainabit_tokens.
REVOKE EXECUTE ON FUNCTION public.fn_upsert_chainabit_tokens(uuid, text, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_upsert_chainabit_tokens(uuid, text, text, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_upsert_chainabit_tokens(uuid, text, text, bigint) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_upsert_chainabit_tokens(uuid, text, text, bigint) TO service_role;
