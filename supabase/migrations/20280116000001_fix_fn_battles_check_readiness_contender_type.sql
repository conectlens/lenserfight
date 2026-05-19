-- Migration: fix fn_battles_check_readiness — invalid contender_type enum value
-- Problem: line used 'ai_lenser' which is not a member of contender_type_enum.
--          Valid values are: 'human', 'ai_model', 'ai_agent'.
-- Fix:     use IN ('ai_model', 'ai_agent') to match all AI contenders.

CREATE OR REPLACE FUNCTION public.fn_battles_check_readiness(
  p_battle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_battle         RECORD;
  v_contender_cnt  INT;
  v_blockers       TEXT[] := '{}';
  v_render_ok      BOOLEAN := TRUE;
  v_byok_ok        BOOLEAN := TRUE;
  v_byok_result    JSONB;
  rec              RECORD;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready', false, 'blockers', ARRAY['battle_not_found']);
  END IF;

  -- Check template valid (template_id set)
  IF v_battle.template_id IS NULL AND (v_battle.task_prompt IS NULL OR v_battle.task_prompt = '') THEN
    v_blockers := v_blockers || ARRAY['no_template_or_task_prompt'];
  END IF;

  -- Check render prompt succeeds (only if template_id set)
  IF v_battle.template_id IS NOT NULL THEN
    BEGIN
      PERFORM public.fn_battles_render_prompt(p_battle_id, '{}'::JSONB);
    EXCEPTION WHEN OTHERS THEN
      v_render_ok := FALSE;
      v_blockers  := v_blockers || ARRAY[CONCAT('prompt_render_failed:', SQLERRM)];
    END;
  END IF;

  -- Check ≥2 contenders assigned
  SELECT COUNT(*) INTO v_contender_cnt
    FROM battles.contenders
   WHERE battle_id = p_battle_id;

  IF v_contender_cnt < 2 THEN
    v_blockers := v_blockers || ARRAY[CONCAT('insufficient_contenders:', v_contender_cnt::TEXT)];
  END IF;

  -- Check BYOK valid for AI contenders
  FOR rec IN
    SELECT c.id AS contender_id
      FROM battles.contenders c
     WHERE c.battle_id = p_battle_id
       AND c.contender_type IN ('ai_model', 'ai_agent')
  LOOP
    v_byok_result := public.fn_byok_validate_for_battle(p_battle_id, rec.contender_id);
    IF NOT (v_byok_result ->> 'valid')::BOOLEAN THEN
      v_blockers := v_blockers || ARRAY[
        CONCAT('byok_invalid:contender=', rec.contender_id,
               ':reason=', v_byok_result ->> 'reason')
      ];
      v_byok_ok := FALSE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',    array_length(v_blockers, 1) IS NULL,
    'blockers', v_blockers
  );
END;
$$;

ALTER FUNCTION public.fn_battles_check_readiness(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_check_readiness(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_battles_check_readiness(UUID) IS
  'CB: Returns {ready, blockers[]} for a battle. Used before auto-promote.';
