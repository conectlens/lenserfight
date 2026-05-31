-- Resolve visible AI lenser runtime ids for profile ids (cloud-safe; no agents schema REST).
CREATE OR REPLACE FUNCTION public.fn_resolve_ai_lenser_ids_for_profiles(p_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, ai_lenser_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, agents, lensers
AS $$
  SELECT p.id AS profile_id, al.id AS ai_lenser_id
  FROM lensers.profiles p
  JOIN agents.ai_lensers al ON al.profile_id = p.id
  -- Cap input cardinality: this function is anon-callable, so bound the scan
  -- against abusive oversized arrays. Callers (CLI/MCP) pass <= 50 ids.
  WHERE p.id = ANY(p_profile_ids[1:1000])
    AND p.type = 'ai'
    AND p.status = 'active'
    AND p.deletion_requested_at IS NULL
    AND (
      p.visibility::text = 'public'
      OR (p.visibility::text = 'community' AND lensers.get_auth_lenser_id() IS NOT NULL)
      OR p.id = lensers.get_auth_lenser_id()
      OR EXISTS (
        SELECT 1
        FROM agents.ownerships o
        WHERE o.ai_lenser_id = al.id
          AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
          AND o.revoked_at IS NULL
      )
    );
$$;

REVOKE ALL ON FUNCTION public.fn_resolve_ai_lenser_ids_for_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_resolve_ai_lenser_ids_for_profiles(uuid[]) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_resolve_ai_lenser_ids_for_profiles(uuid[]) IS
  'Batch map lensers.profiles.id → agents.ai_lensers.id for profiles visible to the caller (public, community+auth, self, or owned AI). Used by CLI/MCP without PostgREST agents schema exposure.';
