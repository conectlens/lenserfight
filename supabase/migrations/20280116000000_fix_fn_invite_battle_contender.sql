-- Migration: fix fn_invite_battle_contender
-- Changes:
--   1. Fix ambiguous "id" column reference (RETURNS TABLE column vs table column) via CTE
--   2. Add p_handle parameter for username-based invite (resolves handle → lenser_id server-side)
--   3. Add lenser type validation against battle mode:
--        ai_vs_ai               → invitee must be ai lenser
--        human_vs_human_*       → invitee must be human lenser
--        human_vs_ai            → slot A = human, slot B = ai
--        lenser_battle / workflow_battle → any type allowed

-- Drop the old overload (had no defaults; new signature adds defaults and p_handle)
DROP FUNCTION IF EXISTS public.fn_invite_battle_contender(uuid, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.fn_invite_battle_contender(
  p_battle_id        uuid,
  p_slot             text,
  p_contender_type   text,
  p_contender_ref_id uuid   DEFAULT NULL,
  p_display_name     text   DEFAULT NULL,
  p_handle           text   DEFAULT NULL
)
RETURNS TABLE(
  id               uuid,
  battle_id        uuid,
  slot             text,
  contender_type   text,
  display_name     text,
  contender_ref_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_battle    battles.battles;
  v_profile   lensers.profiles;
  v_ref_id    uuid;
  v_display   text;
BEGIN
  -- Verify caller owns the battle
  SELECT b.* INTO v_battle
    FROM battles.battles b
   WHERE b.id = p_battle_id;

  IF NOT FOUND OR v_battle.creator_lenser_id <> v_lenser_id THEN
    RAISE EXCEPTION 'invite_contender_forbidden' USING ERRCODE = '42501';
  END IF;

  -- Resolve contender: handle takes priority; fall back to ref_id
  IF p_handle IS NOT NULL THEN
    SELECT p.* INTO v_profile
      FROM lensers.profiles p
     WHERE lower(p.handle) = lower(ltrim(p_handle, '@'))
       AND p.status = 'active'
       AND p.deletion_requested_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'lenser_not_found' USING ERRCODE = 'P0002';
    END IF;

    v_ref_id  := v_profile.id;
    v_display := COALESCE(p_display_name, v_profile.display_name);

  ELSIF p_contender_ref_id IS NOT NULL THEN
    v_ref_id  := p_contender_ref_id;
    v_display := p_display_name;

    SELECT p.* INTO v_profile
      FROM lensers.profiles p
     WHERE p.id = p_contender_ref_id;

  ELSE
    RAISE EXCEPTION 'must provide p_contender_ref_id or p_handle' USING ERRCODE = '22023';
  END IF;

  -- Validate lenser type against battle mode
  IF v_profile.id IS NOT NULL THEN
    CASE v_battle.battle_type
      WHEN 'ai_vs_ai' THEN
        IF v_profile.type <> 'ai' THEN
          RAISE EXCEPTION 'lenser_type_mismatch: this battle requires an AI lenser'
            USING ERRCODE = '22000';
        END IF;

      WHEN 'human_vs_human_ai_votes', 'human_vs_human_open_votes' THEN
        IF v_profile.type <> 'human' THEN
          RAISE EXCEPTION 'lenser_type_mismatch: this battle requires a human lenser'
            USING ERRCODE = '22000';
        END IF;

      WHEN 'human_vs_ai' THEN
        IF p_slot = 'A' AND v_profile.type <> 'human' THEN
          RAISE EXCEPTION 'lenser_type_mismatch: slot A in a human_vs_ai battle must be a human lenser'
            USING ERRCODE = '22000';
        ELSIF p_slot = 'B' AND v_profile.type <> 'ai' THEN
          RAISE EXCEPTION 'lenser_type_mismatch: slot B in a human_vs_ai battle must be an AI lenser'
            USING ERRCODE = '22000';
        END IF;

      ELSE
        -- lenser_battle, workflow_battle: any lenser type is allowed
        NULL;
    END CASE;
  END IF;

  -- Insert via CTE to avoid the ambiguous "id" reference between the
  -- RETURNS TABLE output column and the actual contenders.id table column.
  RETURN QUERY
  WITH ins AS (
    INSERT INTO battles.contenders (
      battle_id, slot, contender_type, contender_ref_id, display_name,
      entry_mode, contender_status
    ) VALUES (
      p_battle_id,
      p_slot,
      p_contender_type::battles.contender_type_enum,
      v_ref_id,
      v_display,
      'invited',
      'pending'
    )
    RETURNING *
  )
  SELECT
    ins.id,
    ins.battle_id,
    ins.slot::text,
    ins.contender_type::text,
    ins.display_name,
    ins.contender_ref_id
  FROM ins;
END;
$$;


ALTER FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text, text)
  OWNER TO postgres;

GRANT ALL ON FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text, text)
  TO anon;
GRANT ALL ON FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text, text)
  TO authenticated;
GRANT ALL ON FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text, text)
  TO service_role;

COMMENT ON FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text, text) IS
  'Invite a lenser as a contender. Caller must own the battle. '
  'Accepts p_contender_ref_id (UUID) or p_handle (text, @-prefix stripped) for lookup. '
  'Validates lenser.type against battle_type: ai_vs_ai requires ai, human_vs_human_* requires human, '
  'human_vs_ai enforces human on slot A and ai on slot B. '
  'Ambiguous id column fixed via CTE pattern.';
