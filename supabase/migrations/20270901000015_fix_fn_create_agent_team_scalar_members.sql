-- Fix "cannot extract elements from a scalar" in fn_create_agent_team.
-- jsonb_array_elements blows up when p_initial_members is NULL or a scalar.
-- COALESCE to '[]' before iterating makes the function safe regardless of caller input.
CREATE OR REPLACE FUNCTION public.fn_create_agent_team(
  p_ai_lenser_id   uuid,
  p_name           text,
  p_description    text DEFAULT NULL,
  p_initial_members jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_human_lenser_id();
  v_team_id   uuid;
  v_team      jsonb;
  v_member    jsonb;
  v_members   jsonb := COALESCE(p_initial_members, '[]'::jsonb);
BEGIN
  IF jsonb_typeof(v_members) <> 'array' THEN
    RAISE EXCEPTION 'p_initial_members must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships o
    WHERE o.ai_lenser_id = p_ai_lenser_id
      AND o.owner_lenser_id = v_lenser_id
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'create_team_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.teams (ai_lenser_id, name, description, status, is_active)
  VALUES (p_ai_lenser_id, p_name, p_description, 'active', true)
  RETURNING id, to_jsonb(agents.teams.*) INTO v_team_id, v_team;

  FOR v_member IN SELECT * FROM jsonb_array_elements(v_members) LOOP
    INSERT INTO agents.team_members (
      team_id, agent_id, role, responsibility, lane, sort_order, is_active
    ) VALUES (
      v_team_id,
      (v_member->>'agent_id')::uuid,
      v_member->>'role',
      v_member->>'responsibility',
      v_member->>'lane',
      COALESCE((v_member->>'sort_order')::integer, 0),
      COALESCE((v_member->>'is_active')::boolean, true)
    );
  END LOOP;

  RETURN v_team;
END;
$$;

ALTER FUNCTION public.fn_create_agent_team(uuid, text, text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_agent_team(uuid, text, text, jsonb) TO authenticated, service_role;
