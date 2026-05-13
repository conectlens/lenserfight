-- Agent & XP Notification Triggers
-- Adds: trg_notify_agent_created, trg_notify_agent_battle_won, trg_notify_badge_awarded.
--
-- GRASP:
--   Information Expert  → agent triggers live in agents schema; badge trigger in lensers schema
--   Protected Variations → all EXCEPTION blocks RAISE WARNING and RETURN NEW


-- ─── 1. agents.fn_trg_notify_agent_created ───────────────────────────────────
-- Fires AFTER INSERT on agents.ownerships WHEN role = 'owner'.
-- Guards against co-owner additions firing by checking this is the FIRST
-- ownership row for the AI lenser.
-- p_actor_id = NULL: system event, skip block/mute gate.

CREATE OR REPLACE FUNCTION agents.fn_trg_notify_agent_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
DECLARE
  v_ai_profile_id UUID;
  v_ai_handle     TEXT;
BEGIN
  -- Only notify for the first ownership row (first 'owner') to avoid firing
  -- again when a co_owner is added later.
  IF EXISTS (
    SELECT 1 FROM agents.ownerships
    WHERE  ai_lenser_id = NEW.ai_lenser_id
      AND  id           != NEW.id
      AND  role         = 'owner'
  ) THEN
    RETURN NEW;
  END IF;

  -- Resolve the AI agent's profile handle for the action URL
  SELECT al.profile_id, p.handle
  INTO   v_ai_profile_id, v_ai_handle
  FROM   agents.ai_lensers al
  JOIN   lensers.profiles p ON p.id = al.profile_id
  WHERE  al.id = NEW.ai_lenser_id;

  PERFORM public.fn_insert_notification(
    NEW.owner_lenser_id,
    'agent_created',
    'Your AI agent has been created',
    'Your agent @' || COALESCE(v_ai_handle, 'unknown') || ' is ready.',
    '/lenser/' || COALESCE(v_ai_handle, '') || '/ag',
    jsonb_build_object(
      'ai_lenser_id',  NEW.ai_lenser_id,
      'ai_profile_id', v_ai_profile_id,
      'ai_handle',     v_ai_handle
    )
    -- p_actor_id = NULL
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_agent_created failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agent_created ON agents.ownerships;
CREATE TRIGGER trg_notify_agent_created
  AFTER INSERT ON agents.ownerships
  FOR EACH ROW
  WHEN (NEW.role = 'owner')
  EXECUTE FUNCTION agents.fn_trg_notify_agent_created();


-- ─── 2. battles.fn_trg_notify_agent_battle_won ───────────────────────────────
-- Fires AFTER UPDATE OF winner_contender_id on battles.battles when a winner
-- is set. If the winner is an AI contender, notifies:
--   (a) the AI lenser's own profile — so the AI "sees" its win
--   (b) the human owner — so they know their agent won
-- Coexists with the refactored fn_notify_battle_result (different audiences:
-- fn_notify_battle_result handles contender profiles + voters; this trigger
-- handles the AI self-notification and human owner specifically).

CREATE OR REPLACE FUNCTION battles.fn_trg_notify_agent_battle_won()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, lensers, public
AS $$
DECLARE
  v_ai_lenser_id    UUID;
  v_ai_profile_id   UUID;
  v_owner_lenser_id UUID;
BEGIN
  -- Check if the winning contender is an AI lenser
  SELECT cem.ai_lenser_id
  INTO   v_ai_lenser_id
  FROM   battles.contender_entity_map cem
  WHERE  cem.contender_id   = NEW.winner_contender_id
    AND  cem.ai_lenser_id   IS NOT NULL;

  IF NOT FOUND OR v_ai_lenser_id IS NULL THEN
    RETURN NEW;  -- winner is a human contender, handled by fn_notify_battle_result
  END IF;

  -- Resolve the AI's own profile_id
  SELECT al.profile_id INTO v_ai_profile_id
  FROM   agents.ai_lensers al
  WHERE  al.id = v_ai_lenser_id;

  -- Find the human owner
  SELECT o.owner_lenser_id INTO v_owner_lenser_id
  FROM   agents.ownerships o
  WHERE  o.ai_lenser_id = v_ai_lenser_id
    AND  o.role         = 'owner'
    AND  o.revoked_at   IS NULL
  LIMIT  1;

  -- Notify the AI's profile (self-notification)
  IF v_ai_profile_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_ai_profile_id,
      'agent_battle_won',
      'You won the battle: ' || NEW.title,
      NULL,
      '/battles/' || NEW.slug || '/result',
      jsonb_build_object(
        'ai_lenser_id',  v_ai_lenser_id,
        'battle_id',     NEW.id,
        'battle_slug',   NEW.slug,
        'battle_title',  NEW.title
      )
    );
  END IF;

  -- Notify the human owner
  IF v_owner_lenser_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_owner_lenser_id,
      'agent_battle_won',
      'Your AI agent won the battle: ' || NEW.title,
      NULL,
      '/battles/' || NEW.slug || '/result',
      jsonb_build_object(
        'ai_lenser_id',  v_ai_lenser_id,
        'battle_id',     NEW.id,
        'battle_slug',   NEW.slug,
        'battle_title',  NEW.title
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_agent_battle_won failed for battle %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agent_battle_won ON battles.battles;
CREATE TRIGGER trg_notify_agent_battle_won
  AFTER UPDATE OF winner_contender_id ON battles.battles
  FOR EACH ROW
  WHEN (OLD.winner_contender_id IS DISTINCT FROM NEW.winner_contender_id
        AND NEW.winner_contender_id IS NOT NULL)
  EXECUTE FUNCTION battles.fn_trg_notify_agent_battle_won();


-- ─── 3. lensers.fn_trg_notify_badge_awarded ──────────────────────────────────
-- Fires AFTER INSERT on lensers.badges.
-- p_actor_id = NULL: system award, skip block/mute gate.

CREATE OR REPLACE FUNCTION lensers.fn_trg_notify_badge_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
DECLARE
  v_handle TEXT;
BEGIN
  SELECT handle INTO v_handle FROM lensers.profiles WHERE id = NEW.lenser_id;

  PERFORM public.fn_insert_notification(
    NEW.lenser_id,
    'badge_awarded',
    'You earned a badge: ' || NEW.label,
    NEW.description,
    '/lenser/' || COALESCE(v_handle, '') || '/badges',
    jsonb_build_object(
      'badge_id',       NEW.id,
      'badge_name',     NEW.label,
      'badge_type',     NEW.type::text,
      'badge_category', NEW.category::text,
      'icon',           NEW.icon
    )
    -- p_actor_id = NULL
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_badge_awarded failed for lenser %: %', NEW.lenser_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge_awarded ON lensers.badges;
CREATE TRIGGER trg_notify_badge_awarded
  AFTER INSERT ON lensers.badges
  FOR EACH ROW
  EXECUTE FUNCTION lensers.fn_trg_notify_badge_awarded();
