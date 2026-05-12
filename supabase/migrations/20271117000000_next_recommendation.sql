-- Phase BX — Battle-complete retention CTA.
--
-- After a battle finalizes (status='closed'), surface a single contextual
-- next action so the user has somewhere productive to go. The recommendation
-- shape is structured JSON the frontend turns into a button.
--
-- Resolution order:
--   1. Caller was a contender in this battle → suggest "rematch"
--   2. Caller voted in this battle           → suggest "browse similar"
--   3. Anything else (including anon)        → suggest "create from template"
--
-- Returns NULL when the battle is not closed (no recommendation surface).

CREATE OR REPLACE FUNCTION public.fn_battles_next_recommendation(
  p_battle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_battle           RECORD;
  v_lenser_id        UUID;
  v_was_contender    BOOLEAN := false;
  v_was_voter        BOOLEAN := false;
  v_category         TEXT;
BEGIN
  SELECT b.id, b.status::text AS status, b.template_id, b.slug, t.category
    INTO v_battle
    FROM battles.battles b
    LEFT JOIN battles.templates t ON t.id = b.template_id
   WHERE b.id = p_battle_id
     AND b.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_battle.status <> 'closed' THEN
    RETURN NULL;
  END IF;

  -- Best-effort resolve caller identity. Anonymous callers leave v_lenser_id
  -- as NULL and fall through to the "create" branch.
  BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
  EXCEPTION WHEN OTHERS THEN
    v_lenser_id := NULL;
  END;

  IF v_lenser_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM battles.contenders c
       WHERE c.battle_id = p_battle_id
         AND c.contender_ref_id = v_lenser_id
    ) INTO v_was_contender;

    IF NOT v_was_contender THEN
      SELECT EXISTS (
        SELECT 1 FROM battles.votes v
         WHERE v.battle_id = p_battle_id
           AND v.voter_lenser_id = v_lenser_id
      ) INTO v_was_voter;
    END IF;
  END IF;

  v_category := v_battle.category;

  IF v_was_contender THEN
    RETURN jsonb_build_object(
      'action',     'rematch',
      'battle_id',  p_battle_id,
      'slug',       v_battle.slug
    );
  ELSIF v_was_voter THEN
    RETURN jsonb_build_object(
      'action',     'browse',
      'category',   v_category
    );
  ELSE
    RETURN jsonb_build_object(
      'action',      'create',
      'template_id', v_battle.template_id
    );
  END IF;
END $$;

ALTER FUNCTION public.fn_battles_next_recommendation(UUID) OWNER TO postgres;
COMMENT ON FUNCTION public.fn_battles_next_recommendation(UUID) IS
  'Phase BX: contextual next-action recommendation for a closed battle. '
  'Returns NULL when battle is not closed or not found. Resolves the caller '
  'as contender / voter / other and emits a single CTA shape.';

GRANT EXECUTE ON FUNCTION public.fn_battles_next_recommendation(UUID)
  TO anon, authenticated, service_role;
