-- fn_get_my_key_secret — authenticated vault accessor for local dev BYOK bypass.
-- Allows a user to decrypt their OWN active cloud BYOK key client-side.
-- Client code MUST guard calls with import.meta.env.DEV (tree-shaken in prod builds).
--
-- Why a new function (not reusing ai.fn_decrypt_api_key):
--   ai.fn_decrypt_api_key is service_role-only and performs no ownership check.
--   This function adds the ownership guard (lenser_id = caller) required for
--   authenticated-role exposure, and is the ONLY entry point authenticated users
--   may call to read vault.decrypted_secrets.
--
-- Why only the public schema:
--   PostgREST exposes the public schema only — there is no value in also defining
--   ai.fn_get_my_key_secret since no client can reach it. Keeping a single
--   definition avoids duplicated bodies drifting out of sync.

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
  -- SECURITY GATE: this function decrypts plaintext API keys and returns them
  -- over PostgREST to the browser. It MUST NOT run in production. The DB owner
  -- must explicitly opt in by setting:
  --   ALTER DATABASE postgres SET app.allow_dev_byok_resolver = 'true';
  -- Anything else (missing, false, or wrong value) blocks the call. This is a
  -- server-side guard — relying solely on `import.meta.env.DEV` on the client
  -- is insufficient because any authenticated REST client can call this RPC.
  IF coalesce(current_setting('app.allow_dev_byok_resolver', true), 'false') <> 'true' THEN
    RAISE EXCEPTION 'fn_get_my_key_secret is disabled in this environment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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
  'Decrypts a caller-owned BYOK API key from Vault for local dev streaming bypass. '
  'SECURITY DEFINER — runs as postgres to read vault.decrypted_secrets. '
  'Ownership enforced: lenser_id must match the authenticated caller. '
  'Only active (non-revoked) keys are returned. '
  'Gated by GUC app.allow_dev_byok_resolver = ''true'' — disabled by default. '
  'Client calls MUST also be guarded by import.meta.env.DEV. '
  'Added in migration 20271226000000; server-side gate added 2026-05-16.';
