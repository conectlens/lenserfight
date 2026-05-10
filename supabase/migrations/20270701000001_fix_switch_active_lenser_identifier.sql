-- Accept either the AI workspace profile id (lensers.profiles.id) or the
-- runtime AI lenser id (agents.ai_lensers.id) when switching active workspace.
-- The stored preference remains the profile id because active workspace RLS
-- and profile RPCs resolve through lensers.preferences.active_lenser_id.

CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser(p_lenser_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'agents', 'auth'
AS $$
DECLARE
  v_human_id          uuid;
  v_current_active_id uuid;
  v_from_ai_lenser_id uuid;
  v_target_profile_id uuid;
  v_to_ai_lenser_id   uuid;
BEGIN
  SELECT p.id INTO v_human_id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.type    = 'human'
    AND p.status  = 'active'
  LIMIT 1;

  IF v_human_id IS NULL THEN
    RAISE EXCEPTION 'No active human profile found for this user';
  END IF;

  SELECT pref.active_lenser_id INTO v_current_active_id
  FROM lensers.preferences pref
  WHERE pref.lenser_id = v_human_id
  LIMIT 1;

  SELECT al.id INTO v_from_ai_lenser_id
  FROM agents.ai_lensers al
  JOIN lensers.profiles ap ON ap.id = al.profile_id
  WHERE ap.id = v_current_active_id
  LIMIT 1;

  IF p_lenser_id = v_human_id THEN
    UPDATE lensers.preferences
    SET active_lenser_id = NULL,
        updated_at       = now()
    WHERE lenser_id = v_human_id;

    IF v_from_ai_lenser_id IS NOT NULL THEN
      INSERT INTO agents.workspace_switches (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
      VALUES (v_human_id, v_from_ai_lenser_id, NULL);
    END IF;

    RETURN;
  END IF;

  SELECT ai_p.id, al.id
  INTO v_target_profile_id, v_to_ai_lenser_id
  FROM agents.ownerships o
  JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
  JOIN lensers.profiles ai_p ON ai_p.id = al.profile_id
  WHERE o.owner_lenser_id = v_human_id
    AND (ai_p.id = p_lenser_id OR al.id = p_lenser_id)
    AND o.role = 'owner'
    AND o.revoked_at IS NULL
    AND ai_p.status = 'active'
  LIMIT 1;

  IF v_target_profile_id IS NULL THEN
    RAISE EXCEPTION 'Cannot switch: profile not found or not owned'
      USING ERRCODE = '42501';
  END IF;

  UPDATE lensers.preferences
  SET active_lenser_id = v_target_profile_id,
      updated_at       = now()
  WHERE lenser_id = v_human_id;

  INSERT INTO agents.workspace_switches (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
  VALUES (v_human_id, v_from_ai_lenser_id, v_to_ai_lenser_id);
END;
$$;

ALTER FUNCTION public.fn_switch_active_lenser(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_switch_active_lenser(uuid) IS
  'Switches the authenticated user''s active workspace to the given lenser ID. Accepts the human profile id, an owned AI profile id, or that owned AI lenser runtime id. Stores AI selection in lensers.preferences.active_lenser_id as the profile id and appends agents.workspace_switches audit rows.';

GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO anon, authenticated, service_role;
