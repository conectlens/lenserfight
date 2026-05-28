-- Fix: Switch Active Lenser Identifier
-- Accepts either an owned AI profile id or runtime AI lenser id.
-- Stores the canonical AI profile id in preferences and workspace_switches.

CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser(
  p_lenser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_human_id            uuid;
  v_from_ai_lenser_id   uuid;
  v_to_ai_lenser_id     uuid;
  v_target_profile_id   uuid;
BEGIN
  -- Resolve the authenticated human lenser
  v_human_id := lensers.get_auth_lenser_id();
  IF v_human_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Resolve target: accept either an AI profile id or an AI lenser runtime id.
  -- Join profiles with ai_lensers and check ownership.
  SELECT ai_p.id, al.id
    INTO v_target_profile_id, v_to_ai_lenser_id
    FROM lensers.profiles ai_p
    JOIN agents.ai_lensers al ON al.profile_id = ai_p.id
    JOIN agents.ai_lenser_owners o ON o.ai_lenser_id = al.id
   WHERE (ai_p.id = p_lenser_id OR al.id = p_lenser_id)
     AND o.owner_lenser_id = v_human_id
     AND o.role = 'owner'
   LIMIT 1;

  IF v_target_profile_id IS NULL THEN
    RAISE EXCEPTION 'ai_lenser_not_found_or_not_owned';
  END IF;

  -- Get current active AI lenser (the "from")
  SELECT pref.active_lenser_id INTO v_from_ai_lenser_id
    FROM lensers.preferences pref
   WHERE pref.lenser_id = v_human_id;

  -- Update preferences — stores the canonical AI profile id
  UPDATE lensers.preferences
     SET active_lenser_id = v_target_profile_id
   WHERE lenser_id = v_human_id;

  -- Log the switch with canonical AI profile ids
  INSERT INTO agents.workspace_switches
    (human_lenser_id, from_ai_lenser_id, to_ai_lenser_id)
  VALUES (v_human_id, v_from_ai_lenser_id, v_to_ai_lenser_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO authenticated;
