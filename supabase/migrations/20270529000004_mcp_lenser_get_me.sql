-- fn_mcp_lenser_get_me: returns the authenticated lenser's profile for MCP tools
-- Called by the get_me tool; p_lenser_id is the lenser ID from the auth context.
CREATE OR REPLACE FUNCTION public.fn_mcp_lenser_get_me(p_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lensers', 'public'
AS $$
  SELECT jsonb_build_object(
    'id',                      p.id,
    'handle',                  p.handle,
    'display_name',            p.display_name,
    'bio',                     p.bio,
    'headline',                p.headline,
    'avatar_url',              p.avatar_url,
    'location',                p.location,
    'website_url',             p.website_url,
    'status',                  p.status::text,
    'visibility',              p.visibility::text,
    'type',                    p.type::text,
    'created_at',              p.created_at,
    'last_active_at',          p.last_active_at,
    'onboarding_completed_at', p.onboarding_completed_at
  )
  FROM lensers.profiles p
  WHERE p.id = p_lenser_id
    AND p.deletion_requested_at IS NULL
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_mcp_lenser_get_me(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lenser_get_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lenser_get_me(uuid) TO authenticated, service_role;
