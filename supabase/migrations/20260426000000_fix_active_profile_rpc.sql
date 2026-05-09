-- =============================================================================
-- 20260426000000_fix_active_profile_rpc.sql
-- -----------------------------------------------------------------------------
-- Hotfix: ensures public.fn_lensers_get_active_profile() exists.
--
-- Root cause: migration 20260423010000_ai_workspace_panel.sql was not applied
-- to the remote project, leaving only the older fn_lensers_get_fresh_profile.
-- The client calls fn_lensers_get_active_profile which follows
-- preferences.active_lenser_id for workspace switching.
--
-- Also re-declares the helper lensers.get_auth_human_lenser_id() and the
-- lensers.current_active_lenser_id() alias so the full workspace model is
-- coherent. All declarations are idempotent (CREATE OR REPLACE).
-- =============================================================================

-- ─── 1. Human owner helper ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lensers.get_auth_human_lenser_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lensers', 'auth'
AS $$
  SELECT p.id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.type = 'human'
    AND p.status = 'active'
  ORDER BY p.created_at ASC
  LIMIT 1;
$$;

ALTER FUNCTION lensers.get_auth_human_lenser_id() OWNER TO postgres;

COMMENT ON FUNCTION lensers.get_auth_human_lenser_id() IS
  'Returns the authenticated user''s primary active human lenser profile id. '
  'Used by owner-only AI management policies so they keep working after '
  'workspace switching activates an AI lenser.';

GRANT EXECUTE ON FUNCTION lensers.get_auth_human_lenser_id() TO authenticated, service_role;

-- ─── 2. Active workspace profile RPC ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_lensers_get_active_profile()
RETURNS SETOF lensers.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
  SELECT p.*
  FROM lensers.profiles p
  WHERE p.id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_lensers_get_active_profile() OWNER TO postgres;

COMMENT ON FUNCTION public.fn_lensers_get_active_profile() IS
  'Returns the active lenser workspace profile for the authenticated user. '
  'Unlike user_id-based lookups this follows preferences.active_lenser_id '
  'when an owned AI workspace is selected.';

GRANT EXECUTE ON FUNCTION public.fn_lensers_get_active_profile() TO authenticated, service_role;

-- ─── 3. Convenience alias ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lensers.current_active_lenser_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'lensers', 'public', 'auth'
AS $$SELECT lensers.get_auth_lenser_id();$$;

ALTER FUNCTION lensers.current_active_lenser_id() OWNER TO postgres;

COMMENT ON FUNCTION lensers.current_active_lenser_id() IS
  'Returns the currently active lenser workspace id (human or owned AI), '
  'delegating to lensers.get_auth_lenser_id().';

GRANT EXECUTE ON FUNCTION lensers.current_active_lenser_id() TO authenticated, service_role;
