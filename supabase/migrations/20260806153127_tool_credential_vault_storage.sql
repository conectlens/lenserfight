-- Tool credential storage (Supabase Vault), per RFC-0006 / issue #461.
--
-- Mirrors the existing BYOK pattern (ai.fn_store_api_key / ai.fn_decrypt_api_key,
-- see supabase/migrations/20260519131536_remote_schema.sql) instead of inventing
-- a new one: raw secret goes into vault.secrets via vault.create_secret, and
-- agents.tools_registry.credential_ref (added in #460) stores only the opaque
-- vault.secrets(id). The raw secret is never stored, logged, or returned by
-- fn_store_tool_credential — only fn_resolve_tool_credential can decrypt it,
-- and that function is restricted to service_role.
--
-- Rotation: calling fn_store_tool_credential again for a tool that already has
-- a credential_ref updates the existing vault secret in place (vault.update_secret)
-- instead of creating a new one, so agents.tool_assignments (which references
-- tool_id, never credential_ref) is never disturbed by a rotation.

CREATE OR REPLACE FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'vault', 'lensers'
    AS $$
DECLARE
  v_owner     uuid := lensers.get_auth_human_lenser_id();
  v_tool      agents.tools_registry;
  v_secret_id uuid;
  v_secret_name text;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'authentication required or no human lenser profile found' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tool FROM agents.tools_registry WHERE id = p_tool_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tool not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_tool.owner_lenser_id <> v_owner THEN
    RAISE EXCEPTION 'not authorized for this tool' USING ERRCODE = '42501';
  END IF;

  IF v_tool.auth_method = 'none' THEN
    RAISE EXCEPTION 'tool % has auth_method = none and does not accept a credential', v_tool.key;
  END IF;

  IF p_raw_secret IS NULL OR length(trim(p_raw_secret)) < 8 THEN
    RAISE EXCEPTION 'invalid credential: must be at least 8 characters';
  END IF;

  IF v_tool.credential_ref IS NOT NULL THEN
    -- Rotate in place: same vault secret id, tool_assignments untouched.
    PERFORM vault.update_secret(v_tool.credential_ref, trim(p_raw_secret));
    v_secret_id := v_tool.credential_ref;
  ELSE
    v_secret_name := 'tool_cred_' || v_owner::text || '_' || v_tool.key || '_' || gen_random_uuid()::text;
    v_secret_id := vault.create_secret(
      trim(p_raw_secret),
      v_secret_name,
      'Credential for tool ' || v_tool.key
    );

    UPDATE agents.tools_registry
       SET credential_ref = v_secret_id, updated_at = now()
     WHERE id = p_tool_id;
  END IF;

  RETURN v_secret_id;
END;
$$;

ALTER FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") IS 'Encrypts and stores (or rotates) the credential for a tool the caller owns, via Supabase Vault. Never returns or logs the raw secret. Only callable by the tool''s owner_lenser_id.';


CREATE OR REPLACE FUNCTION "public"."fn_resolve_tool_credential"("p_tool_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'vault', 'auth'
    AS $$
DECLARE
  v_tool      agents.tools_registry;
  v_decrypted text;
BEGIN
  -- Primary guard: GRANT below restricts this function to service_role only.
  -- Secondary guard: verify JWT role as defence-in-depth (matches ai.fn_decrypt_api_key).
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: only service_role can resolve tool credentials';
  END IF;

  SELECT * INTO v_tool FROM agents.tools_registry WHERE id = p_tool_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tool not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_tool.auth_method = 'none' THEN
    RETURN NULL;
  END IF;

  IF v_tool.credential_ref IS NULL THEN
    RAISE EXCEPTION 'tool % has no stored credential', v_tool.key;
  END IF;

  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = v_tool.credential_ref;

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'failed to decrypt credential for tool %', v_tool.key;
  END IF;

  RETURN v_decrypted;
END;
$$;

ALTER FUNCTION "public"."fn_resolve_tool_credential"("p_tool_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_resolve_tool_credential"("p_tool_id" "uuid") IS 'Decrypts a tool''s stored credential from Vault. Restricted to service_role only. Used by the tool-invocation dispatcher (#462) at execution time. Never exposed to authenticated/anon clients.';

REVOKE ALL ON FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_store_tool_credential"("p_tool_id" "uuid", "p_raw_secret" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."fn_resolve_tool_credential"("p_tool_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_resolve_tool_credential"("p_tool_id" "uuid") TO "service_role";
