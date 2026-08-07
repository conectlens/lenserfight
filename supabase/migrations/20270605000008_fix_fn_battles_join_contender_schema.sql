-- fn_battles_join was still written against a pre-polymorphic-contender
-- schema: it inserted into battles.contenders(battle_id, lenser_id,
-- contender_status), but that table has never had a lenser_id column — it
-- uses (slot, contender_type, contender_ref_id, display_name) instead (see
-- fn_invite_battle_contender for the correct, already-working pattern).
-- Every call to `battle join` has been failing with
-- "column \"lenser_id\" does not exist" since this function was introduced.
--
-- Fix: resolve the contender identity (an owned AI agent's profile id, or
-- the caller's own human profile id), assign the next free slot letter, and
-- insert using the real column set. Idempotency (return existing contender
-- on re-join) and the max_contenders guard are preserved from the original.

CREATE OR REPLACE FUNCTION "public"."fn_battles_join"(
  "p_battle_id" "uuid",
  "p_agent_id" "uuid" DEFAULT NULL::"uuid",
  "p_runner_mode" "text" DEFAULT 'cloud'::"text",
  "p_device_id" "uuid" DEFAULT NULL::"uuid",
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id      UUID;
  v_ref_id         UUID;
  v_contender_type battles.contender_type_enum;
  v_display_name   TEXT;
  v_slot           CHAR(1);
  v_contender_id   UUID;
  v_battle         battles.battles%ROWTYPE;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'battles_join_unauthenticated';
  END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'battles_join_not_found: %', p_battle_id;
  END IF;

  IF v_battle.status NOT IN ('open', 'executing') THEN
    RAISE EXCEPTION 'battles_join_not_open: status=%', v_battle.status;
  END IF;

  -- Resolve the contender identity: an owned AI agent (by its profile id)
  -- or the caller's own human profile.
  IF p_agent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM agents.ownerships o
      WHERE o.ai_lenser_id = p_agent_id
        AND o.owner_lenser_id = v_lenser_id
        AND o.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'battles_join_agent_not_owned: %', p_agent_id;
    END IF;

    SELECT al.profile_id, p.display_name
      INTO v_ref_id, v_display_name
    FROM agents.ai_lensers al
    JOIN lensers.profiles p ON p.id = al.profile_id
    WHERE al.id = p_agent_id;

    IF v_ref_id IS NULL THEN
      RAISE EXCEPTION 'battles_join_agent_not_found: %', p_agent_id;
    END IF;

    v_contender_type := 'ai_agent';
  ELSE
    SELECT p.id, p.display_name INTO v_ref_id, v_display_name
    FROM lensers.profiles p
    WHERE p.id = v_lenser_id;

    v_contender_type := 'human';
  END IF;

  -- Idempotent: return existing contender if this identity already joined
  SELECT id INTO v_contender_id
  FROM   battles.contenders
  WHERE  battle_id = p_battle_id
  AND    contender_ref_id = v_ref_id
  LIMIT  1;

  IF v_contender_id IS NOT NULL THEN
    RETURN v_contender_id;
  END IF;

  -- Check max contenders, then pick the next free slot letter (A, B, C, ...)
  IF (SELECT count(*) FROM battles.contenders WHERE battle_id = p_battle_id) >= v_battle.max_contenders THEN
    RAISE EXCEPTION 'battles_join_full: max_contenders=%', v_battle.max_contenders;
  END IF;

  SELECT chr(65 + count(*)::int) INTO v_slot
  FROM battles.contenders
  WHERE battle_id = p_battle_id;

  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status
  )
  VALUES (
    p_battle_id,
    v_slot,
    v_contender_type,
    v_ref_id,
    v_display_name,
    'direct',
    'active'
  )
  RETURNING id INTO v_contender_id;

  INSERT INTO audit.events (event_type, actor_type, actor_id, payload)
  VALUES (
    'battle.joined',
    'lenser',
    v_lenser_id,
    jsonb_build_object(
      'battle_id',    p_battle_id,
      'agent_id',     p_agent_id,
      'runner_mode',  p_runner_mode,
      'device_id',    p_device_id,
      'workflow_id',  p_workflow_id
    )
  );

  RETURN v_contender_id;
END;
$$;
