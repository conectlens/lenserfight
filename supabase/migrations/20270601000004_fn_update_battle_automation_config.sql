-- Phase CT fix: expose automation_config update via public RPC
-- (battles schema is not in PostgREST exposed schemas; direct table access is blocked)

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_update_battle_automation_config(
  p_battle_id    uuid,
  p_automation_config jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  UPDATE battles.battles
  SET    automation_config = p_automation_config
  WHERE  id = p_battle_id
    AND  creator_lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found or not owned by current user.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_update_battle_automation_config(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_update_battle_automation_config(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.fn_update_battle_automation_config(uuid, jsonb) IS
  'Update automation_config on a battle owned by the current user. Wizard step 9 persistence. Owner-only via creator_lenser_id check.';

COMMIT;
