-- Remove the app.allow_dev_byok_resolver GUC gate from fn_get_my_key_secret.
--
-- Why: the function must work in both local and cloud Supabase environments.
-- The real security controls are:
--   1. GRANT EXECUTE only to `authenticated` (no anon access).
--   2. Ownership check: lenser_id must match the authenticated caller.
--   3. is_active = true: revoked keys cannot be decrypted.
--   4. Supabase Vault decryption is server-side only.
--
-- The GUC gate was added to prevent key exfiltration in staging/preview
-- environments, but it also blocks legitimate cloud Supabase deployments.
-- The ownership check is the sufficient server-side guard.

CREATE OR REPLACE FUNCTION public.fn_get_my_key_secret(p_key_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, vault, lensers, auth
AS $$
DECLARE
  v_lenser_id    uuid;
  v_encrypted_id uuid;
  v_decrypted    text;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: no lenser profile found';
  END IF;

  SELECT encrypted_key_id INTO v_encrypted_id
  FROM ai.keys
  WHERE id = p_key_id
    AND lenser_id = v_lenser_id
    AND is_active = true;

  IF v_encrypted_id IS NULL THEN
    RAISE EXCEPTION 'Key not found, revoked, or not owned by caller';
  END IF;

  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = v_encrypted_id;

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'Failed to decrypt key from vault';
  END IF;

  RETURN v_decrypted;
END;
$$;

ALTER FUNCTION public.fn_get_my_key_secret(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_get_my_key_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_my_key_secret(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_get_my_key_secret(uuid) IS
  'Decrypts a caller-owned BYOK API key from Vault. '
  'SECURITY DEFINER — runs as postgres to read vault.decrypted_secrets. '
  'Ownership enforced: lenser_id must match the authenticated caller. '
  'Only active (non-revoked) keys are returned. '
  'Works in both local and cloud Supabase environments. '
  'GUC gate removed in migration 20280116000003 — ownership check is the sufficient guard.';
