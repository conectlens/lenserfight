-- =============================================================================
-- 20260503040000_agent_delegation_permissions.sql
-- -----------------------------------------------------------------------------
-- Adds scoped delegate authorization helpers and owner-facing RPCs for the
-- AI Lenser control-room permissions surface.
-- =============================================================================

-- ─── 1. Scoped authorization helper ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.has_agent_scope(p_ai_lenser_id uuid, p_scope text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_role text;
  v_scopes text[];
BEGIN
  SELECT o.role, o.permission_scope
  INTO v_role, v_scopes
  FROM agents.ownerships o
  WHERE o.ai_lenser_id = p_ai_lenser_id
    AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
    AND o.revoked_at IS NULL
  ORDER BY CASE o.role
    WHEN 'owner' THEN 1
    WHEN 'co_owner' THEN 2
    ELSE 3
  END
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role IN ('owner', 'co_owner') THEN
    RETURN true;
  END IF;

  RETURN COALESCE(v_scopes @> ARRAY[p_scope], false);
END;
$$;

ALTER FUNCTION agents.has_agent_scope(uuid, text) OWNER TO postgres;

COMMENT ON FUNCTION agents.has_agent_scope(uuid, text) IS
  'Returns whether the authenticated human Lenser may perform the requested scoped action on an AI Lenser. owner/co_owner bypass scopes; operator must hold the explicit scope.';

GRANT EXECUTE ON FUNCTION agents.has_agent_scope(uuid, text) TO authenticated, service_role;

-- ─── 2. Owner-facing delegation RPCs ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_agent_ownerships(p_ai_lenser_id uuid)
RETURNS TABLE (
  id uuid,
  ai_lenser_id uuid,
  owner_lenser_id uuid,
  role text,
  permission_scope text[],
  granted_at timestamptz,
  revoked_at timestamptz,
  owner_handle text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT
    o.id,
    o.ai_lenser_id,
    o.owner_lenser_id,
    o.role,
    o.permission_scope,
    o.granted_at,
    o.revoked_at,
    p.handle,
    p.display_name,
    p.avatar_url
  FROM agents.ownerships o
  JOIN lensers.profiles p
    ON p.id = o.owner_lenser_id
  WHERE o.ai_lenser_id = p_ai_lenser_id
    AND o.revoked_at IS NULL
    AND agents.can_manage_ai_lenser(p_ai_lenser_id)
  ORDER BY CASE o.role
    WHEN 'owner' THEN 1
    WHEN 'co_owner' THEN 2
    ELSE 3
  END,
  o.granted_at ASC;
$$;

ALTER FUNCTION public.fn_list_agent_ownerships(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_list_agent_ownerships(uuid) IS
  'Lists active human delegates for an AI Lenser, including the primary owner, co-owners, and scoped operators.';

GRANT EXECUTE ON FUNCTION public.fn_list_agent_ownerships(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_upsert_agent_ownership(
  p_ai_lenser_id uuid,
  p_owner_lenser_id uuid,
  p_role text,
  p_permission_scope text[] DEFAULT '{}'::text[]
)
RETURNS TABLE (
  id uuid,
  ai_lenser_id uuid,
  owner_lenser_id uuid,
  role text,
  permission_scope text[],
  granted_at timestamptz,
  revoked_at timestamptz,
  owner_handle text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_caller_human_id uuid := lensers.get_auth_human_lenser_id();
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this AI Lenser.'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('co_owner', 'operator') THEN
    RAISE EXCEPTION 'Only co_owner and operator may be granted through this RPC.'
      USING ERRCODE = '22023';
  END IF;

  IF p_owner_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Delegate owner_lenser_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_owner_lenser_id = v_caller_human_id THEN
    RAISE EXCEPTION 'The primary owner already has access and cannot be delegated through this RPC.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM agents.ai_lensers al
    WHERE al.id = p_ai_lenser_id
  ) THEN
    RAISE EXCEPTION 'AI Lenser not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lensers.profiles p
    WHERE p.id = p_owner_lenser_id
      AND p.type = 'human'
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Delegate must be an active human Lenser.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.ownerships (
    ai_lenser_id,
    owner_lenser_id,
    role,
    permission_scope,
    granted_at,
    revoked_at
  )
  VALUES (
    p_ai_lenser_id,
    p_owner_lenser_id,
    p_role,
    COALESCE(p_permission_scope, '{}'::text[]),
    now(),
    NULL
  )
  ON CONFLICT (ai_lenser_id, owner_lenser_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    permission_scope = EXCLUDED.permission_scope,
    granted_at = now(),
    revoked_at = NULL;

  RETURN QUERY
  SELECT
    o.id,
    o.ai_lenser_id,
    o.owner_lenser_id,
    o.role,
    o.permission_scope,
    o.granted_at,
    o.revoked_at,
    p.handle,
    p.display_name,
    p.avatar_url
  FROM agents.ownerships o
  JOIN lensers.profiles p
    ON p.id = o.owner_lenser_id
  WHERE o.ai_lenser_id = p_ai_lenser_id
    AND o.owner_lenser_id = p_owner_lenser_id
  LIMIT 1;
END;
$$;

ALTER FUNCTION public.fn_upsert_agent_ownership(uuid, uuid, text, text[]) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_upsert_agent_ownership(uuid, uuid, text, text[]) IS
  'Creates or updates a co_owner/operator delegate for an AI Lenser. owner transfers stay out of scope for this RPC.';

GRANT EXECUTE ON FUNCTION public.fn_upsert_agent_ownership(uuid, uuid, text, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_revoke_agent_ownership(p_ownership_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_ownership agents.ownerships%ROWTYPE;
BEGIN
  SELECT *
  INTO v_ownership
  FROM agents.ownerships o
  WHERE o.id = p_ownership_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ownership grant not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ownership.ai_lenser_id) THEN
    RAISE EXCEPTION 'Not authorized to revoke this delegate.'
      USING ERRCODE = '42501';
  END IF;

  IF v_ownership.role = 'owner' THEN
    RAISE EXCEPTION 'The primary owner cannot be revoked through this RPC.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE agents.ownerships
  SET revoked_at = now()
  WHERE id = p_ownership_id;
END;
$$;

ALTER FUNCTION public.fn_revoke_agent_ownership(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_revoke_agent_ownership(uuid) IS
  'Revokes a co_owner or operator delegation for an AI Lenser. The primary owner must be handled through a dedicated ownership-transfer flow.';

GRANT EXECUTE ON FUNCTION public.fn_revoke_agent_ownership(uuid) TO authenticated, service_role;
