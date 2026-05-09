-- Phase 2.5: Profile and team member role RPC
--
-- fn_update_team_member_role: SECURITY DEFINER RPC that allows a team owner
-- to update the role field of a member. The caller must own the team (via the
-- linked ai_lenser whose profile_id matches the authenticated user).
--
-- fn_lensers_update_profile already exists and handles whitelisted profile
-- field updates. This migration only adds the team role mutation.

CREATE OR REPLACE FUNCTION public.fn_update_team_member_role(
  p_team_id   uuid,
  p_member_id uuid,
  p_role      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'agents', 'lensers', 'public'
AS $$
DECLARE
  v_auth_lenser_id uuid;
  v_owner_lenser_id uuid;
BEGIN
  v_auth_lenser_id := lensers.get_auth_lenser_id();

  -- Resolve the team owner
  SELECT al.id INTO v_owner_lenser_id
  FROM agents.teams t
  JOIN agents.ai_lensers al ON al.id = t.ai_lenser_id
  WHERE t.id = p_team_id;

  IF v_owner_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Team % not found', p_team_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Only the ai_lenser whose profile_id is the auth user may update roles
  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers al
    WHERE al.id = v_owner_lenser_id
      AND al.profile_id = v_auth_lenser_id
  ) THEN
    RAISE EXCEPTION 'Caller is not the owner of team %', p_team_id
      USING ERRCODE = '42501';
  END IF;

  -- Validate the target member belongs to the team
  IF NOT EXISTS (
    SELECT 1 FROM agents.team_members
    WHERE id = p_member_id AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Member % not found in team %', p_member_id, p_team_id
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE agents.team_members
  SET role = p_role, updated_at = now()
  WHERE id = p_member_id AND team_id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_update_team_member_role(uuid, uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.fn_update_team_member_role(uuid, uuid, text) IS
  'Updates a team member role. Caller must own the team. '
  'Only the role field is mutated — other member fields require direct RLS access.';
