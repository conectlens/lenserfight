-- Migration: expand fn_store_my_chainabit_tokens to store access_token + expires_at
--
-- Background: the original function (20260520200000) only accepted p_refresh_token
-- because Fix 1 (Chainabit userinfo returning access_token) was planned but not
-- shipped.  Until Fix 1 lands, OAuthCallbackPage captures both tokens from
-- session.provider_token / session.provider_refresh_token immediately after
-- linkIdentity() and stores them here.
--
-- Changes:
--   fn_store_my_chainabit_tokens — add p_access_token text DEFAULT NULL
--                                      p_expires_at   bigint DEFAULT NULL
--   All parameters are now optional (DEFAULT NULL) so callers that only have
--   the refresh_token continue to work without changes.

CREATE OR REPLACE FUNCTION public.fn_store_my_chainabit_tokens(
  p_refresh_token text    DEFAULT NULL,
  p_access_token  text    DEFAULT NULL,
  p_expires_at    bigint  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_patch   jsonb := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_access_token  IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('access_token',  p_access_token);
  END IF;
  IF p_expires_at    IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('expires_at',    p_expires_at);
  END IF;
  IF p_refresh_token IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('refresh_token', p_refresh_token);
  END IF;

  IF v_patch = '{}'::jsonb THEN
    RETURN; -- nothing to update
  END IF;

  UPDATE auth.identities
  SET
    identity_data = identity_data || v_patch,
    updated_at    = now()
  WHERE provider = 'custom:chainabit'
    AND user_id  = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text, text, bigint) FROM anon;
GRANT  EXECUTE ON FUNCTION public.fn_store_my_chainabit_tokens(text, text, bigint) TO authenticated;
