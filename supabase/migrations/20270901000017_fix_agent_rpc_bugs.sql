-- Fix 6 RPC bugs surfaced after phase AN-AT rollout:
--
-- 1. public.fn_clone_lens            → PostgREST wrapper for lenses.fn_clone_lens
-- 2. public.fn_list_agent_tools      → Missing function (was referenced but never created)
-- 3. public.fn_update_agent_profile  → Ownership check used al.profile_id = p_ai_lenser_id
--                                       but callers pass agents.ai_lensers.id, not profile_id
-- 4. public.fn_byok_key_register     → Same ownership pattern bug; now uses ownerships table
-- 5. public.fn_byok_key_revoke       → Same ownership pattern bug; now uses ownerships table
-- 6. public.fn_byok_key_hint         → Same ownership pattern bug missed by the original fix;
--                                       joined lensers.profiles on al.profile_id and checked
--                                       p.user_id = auth.uid(), which always filters every row
--                                       because AI profiles have no user_id. Fixed to use
--                                       agents.ownerships via get_auth_human_lenser_id().


-- ─── 1. public.fn_clone_lens ─────────────────────────────────────────────────
-- PostgREST can only call public.* functions. lenses.fn_clone_lens exists but
-- is unreachable from the REST API. This wrapper delegates directly.

CREATE OR REPLACE FUNCTION public.fn_clone_lens(
  p_source_lens_id uuid,
  p_version_id     uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers', 'content'
AS $$
  SELECT lenses.fn_clone_lens(p_source_lens_id, p_version_id);
$$;

ALTER FUNCTION public.fn_clone_lens(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_clone_lens(uuid, uuid) TO authenticated;


-- ─── 2. public.fn_list_agent_tools ────────────────────────────────────────────
-- Returns tool invocations for an AI lenser, newest-first, with keyset cursor.
-- Only the owner (or admin) may list invocations.

CREATE OR REPLACE FUNCTION public.fn_list_agent_tools(
  p_ai_lenser_id uuid,
  p_limit        integer  DEFAULT 50,
  p_cursor       uuid     DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ti.*)
  FROM   agents.tool_invocations ti
  WHERE  ti.ai_lenser_id = p_ai_lenser_id
    AND  (p_cursor IS NULL OR ti.id < p_cursor)
    AND  (
      EXISTS (
        SELECT 1 FROM agents.ownerships o
        WHERE  o.ai_lenser_id = p_ai_lenser_id
          AND  o.owner_lenser_id = lensers.get_auth_human_lenser_id()
          AND  o.revoked_at IS NULL
      )
      OR public.is_admin()
    )
  ORDER  BY ti.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_agent_tools(uuid, integer, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_tools(uuid, integer, uuid) TO authenticated, service_role;


-- ─── 3. public.fn_update_agent_profile ────────────────────────────────────────
-- Root cause: original function compared al.profile_id (the AI lenser's
-- lensers.profiles.id) against p_ai_lenser_id, but every caller passes
-- agents.ai_lensers.id (which is a different UUID). Fixed by:
--   a) checking ownership directly via agents.ownerships (same pattern as other
--      functions in migration 20270901000014)
--   b) resolving the profile_id from agents.ai_lensers before the UPDATE

CREATE OR REPLACE FUNCTION public.fn_update_agent_profile(
  p_ai_lenser_id uuid,   -- agents.ai_lensers.id
  p_patch        jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'agents', 'auth'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   agents.ownerships o
    WHERE  o.ai_lenser_id   = p_ai_lenser_id
      AND  o.owner_lenser_id = lensers.get_auth_human_lenser_id()
      AND  o.role            = 'owner'
      AND  o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  SELECT al.profile_id INTO v_profile_id
  FROM   agents.ai_lensers al
  WHERE  al.id = p_ai_lenser_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'AI lenser not found'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE lensers.profiles
  SET
    display_name = CASE WHEN p_patch ? 'display_name' THEN p_patch->>'display_name' ELSE display_name END,
    avatar_url   = CASE WHEN p_patch ? 'avatar_url'   THEN p_patch->>'avatar_url'   ELSE avatar_url   END,
    banner_url   = CASE WHEN p_patch ? 'banner_url'   THEN p_patch->>'banner_url'   ELSE banner_url   END,
    bio          = CASE WHEN p_patch ? 'bio'          THEN p_patch->>'bio'          ELSE bio          END,
    headline     = CASE WHEN p_patch ? 'headline'     THEN p_patch->>'headline'     ELSE headline     END,
    website_url  = CASE WHEN p_patch ? 'website_url'  THEN p_patch->>'website_url'  ELSE website_url  END,
    updated_at   = now()
  WHERE id   = v_profile_id
    AND type = 'ai';
END;
$$;

ALTER FUNCTION public.fn_update_agent_profile(uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_agent_profile(uuid, jsonb) TO authenticated, service_role;


-- ─── 4 & 5. fn_byok_key_register / fn_byok_key_revoke ────────────────────────
-- Root cause: both functions checked `al.profile_id = v_lenser_id` where
-- v_lenser_id was the HUMAN caller's lensers.profiles.id, but al.profile_id is
-- the AI lenser's own profile. These are always different UUIDs, so ownership
-- always evaluated to false for frontend callers.
-- Fixed to use agents.ownerships (consistent with every other agent-owner RPC).

CREATE OR REPLACE FUNCTION public.fn_byok_key_register(
  p_agent_id      uuid,
  p_provider      text,
  p_key_encrypted text,
  p_key_hint      text          DEFAULT NULL,
  p_label         text          DEFAULT NULL,
  p_expires_at    timestamptz   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'execution', 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_key_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships o
    WHERE  o.ai_lenser_id   = p_agent_id
      AND  o.owner_lenser_id = lensers.get_auth_human_lenser_id()
      AND  o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'byok_key_register_forbidden: agent % not owned by caller', p_agent_id;
  END IF;

  INSERT INTO execution.byok_keys (agent_id, provider, key_encrypted, key_hint, label, expires_at)
  VALUES (p_agent_id, p_provider, p_key_encrypted, p_key_hint, p_label, p_expires_at)
  ON CONFLICT (agent_id, provider) DO UPDATE
    SET key_encrypted = EXCLUDED.key_encrypted,
        key_hint      = EXCLUDED.key_hint,
        label         = EXCLUDED.label,
        expires_at    = EXCLUDED.expires_at,
        revoked_at    = NULL,
        created_at    = now()
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

ALTER FUNCTION public.fn_byok_key_register(uuid, text, text, text, text, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_register(uuid, text, text, text, text, timestamptz) TO authenticated;


CREATE OR REPLACE FUNCTION public.fn_byok_key_revoke(p_agent_id uuid, p_provider text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'execution', 'agents', 'lensers', 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships o
    WHERE  o.ai_lenser_id   = p_agent_id
      AND  o.owner_lenser_id = lensers.get_auth_human_lenser_id()
      AND  o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'byok_key_revoke_forbidden';
  END IF;

  UPDATE execution.byok_keys
  SET    revoked_at = now()
  WHERE  agent_id = p_agent_id
    AND  provider  = p_provider;
END;
$$;

ALTER FUNCTION public.fn_byok_key_revoke(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_revoke(uuid, text) TO authenticated;


-- ─── 6. fn_byok_key_hint ──────────────────────────────────────────────────────
-- Root cause: joined lensers.profiles on al.profile_id then checked p.user_id = auth.uid().
-- AI profiles never have a user_id, so the WHERE always filtered every row → [].
-- Fixed to use agents.ownerships consistent with fn_byok_key_register / fn_byok_key_revoke.

CREATE OR REPLACE FUNCTION public.fn_byok_key_hint(p_agent_id uuid)
RETURNS TABLE (
  provider text,
  key_hint text,
  label    text,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = execution, agents, lensers, public
AS $$
  SELECT
    bk.provider,
    bk.key_hint,
    bk.label,
    (bk.revoked_at IS NULL AND (bk.expires_at IS NULL OR bk.expires_at > now())) AS is_valid
  FROM execution.byok_keys bk
  WHERE bk.agent_id = p_agent_id
    AND EXISTS (
      SELECT 1 FROM agents.ownerships o
      WHERE o.ai_lenser_id    = p_agent_id
        AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
        AND o.revoked_at IS NULL
    );
$$;

ALTER FUNCTION public.fn_byok_key_hint(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_byok_key_hint(uuid) TO authenticated;
