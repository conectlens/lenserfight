-- Battle Notification Triggers
-- Adds: trg_notify_battle_started, trg_notify_battle_joined, trg_notify_battle_comment.
-- Refactors fn_notify_battle_result: contenders now receive battle_won/battle_lost
-- (differentiated outcome) instead of the generic battle_result. Voters keep battle_result.
--
-- GRASP:
--   Information Expert  → each trigger function lives in the battles schema
--   Creator             → fn_insert_notification is the sole INSERT path
--   Protected Variations → EXCEPTION blocks prevent trigger failures from propagating


-- ─── 1. battles.fn_trg_notify_battle_started ─────────────────────────────────
-- Fires AFTER UPDATE OF status on battles.battles when status → 'open'.
-- Notifies every contender (human and AI) that the battle has begun.
-- Coexists safely with trg_notify_template_battle_status (different purpose:
-- that trigger notifies the creator about template progression, this one
-- notifies all contenders that submissions are open).

CREATE OR REPLACE FUNCTION battles.fn_trg_notify_battle_started()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, lensers, public
AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Collect all contender profile_ids: human (cem.profile_id) and AI (ai_lensers.profile_id)
  FOR v_participant IN
    SELECT COALESCE(cem.profile_id, al.profile_id) AS lenser_id
    FROM   battles.contenders c
    JOIN   battles.contender_entity_map cem ON cem.contender_id = c.id
    LEFT   JOIN agents.ai_lensers al ON al.id = cem.ai_lenser_id
    WHERE  c.battle_id = NEW.id
      AND  COALESCE(cem.profile_id, al.profile_id) IS NOT NULL
  LOOP
    PERFORM public.fn_insert_notification(
      v_participant.lenser_id,
      'battle_started',
      'Battle is now open: ' || NEW.title,
      'Submit your entry — voting begins soon.',
      '/battles/' || NEW.slug,
      jsonb_build_object(
        'battle_id',    NEW.id,
        'battle_slug',  NEW.slug,
        'battle_title', NEW.title
      )
      -- p_actor_id = NULL: system event, skip block/mute gate
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_battle_started failed for battle %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_battle_started ON battles.battles;
CREATE TRIGGER trg_notify_battle_started
  AFTER UPDATE OF status ON battles.battles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'open')
  EXECUTE FUNCTION battles.fn_trg_notify_battle_started();


-- ─── 2. battles.fn_trg_notify_battle_joined ──────────────────────────────────
-- Fires AFTER INSERT on battles.contender_entity_map WHEN profile_id IS NOT NULL
-- (human contender). AI contenders (ai_lenser_id IS NOT NULL) are handled by the
-- existing trg_notify_battle_assigned trigger — mutually exclusive WHEN clauses.
-- Notifies the battle creator that a new human contender has joined.

CREATE OR REPLACE FUNCTION battles.fn_trg_notify_battle_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_battle_id       UUID;
  v_creator_id      UUID;
  v_battle_slug     TEXT;
  v_battle_title    TEXT;
  v_joiner          lensers.profiles%ROWTYPE;
BEGIN
  -- Resolve battle from the contender row
  SELECT c.battle_id, b.creator_lenser_id, b.slug, b.title
  INTO   v_battle_id, v_creator_id, v_battle_slug, v_battle_title
  FROM   battles.contenders c
  JOIN   battles.battles b ON b.id = c.battle_id
  WHERE  c.id = NEW.contender_id;

  IF NOT FOUND OR v_creator_id = NEW.profile_id THEN
    RETURN NEW;  -- battle not found or self-join
  END IF;

  SELECT * INTO v_joiner FROM lensers.profiles WHERE id = NEW.profile_id;

  PERFORM public.fn_insert_notification(
    v_creator_id,
    'battle_joined',
    COALESCE(v_joiner.display_name, v_joiner.handle) || ' joined your battle',
    v_battle_title,
    '/battles/' || v_battle_slug,
    jsonb_build_object(
      'battle_id',           v_battle_id,
      'battle_slug',         v_battle_slug,
      'contender_id',        NEW.contender_id,
      'joiner_id',           NEW.profile_id,
      'joiner_handle',       v_joiner.handle,
      'joiner_display_name', v_joiner.display_name
    ),
    NEW.profile_id  -- p_actor_id for block/mute gate
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_battle_joined failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_battle_joined ON battles.contender_entity_map;
CREATE TRIGGER trg_notify_battle_joined
  AFTER INSERT ON battles.contender_entity_map
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL)
  EXECUTE FUNCTION battles.fn_trg_notify_battle_joined();


-- ─── 3. battles.fn_trg_notify_battle_comment ─────────────────────────────────
-- Fires AFTER INSERT on battles.comments.
-- Notifies the battle creator when someone comments. Aggregated within 5 minutes.

CREATE OR REPLACE FUNCTION battles.fn_trg_notify_battle_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_creator_id  UUID;
  v_battle_slug TEXT;
  v_commenter   lensers.profiles%ROWTYPE;
  v_notif_id    UUID;
BEGIN
  SELECT b.creator_lenser_id, b.slug
  INTO   v_creator_id, v_battle_slug
  FROM   battles.battles b
  WHERE  b.id = NEW.battle_id;

  IF NOT FOUND OR v_creator_id = NEW.lenser_id THEN
    RETURN NEW;
  END IF;

  -- Anti-spam: 5-minute window per battle
  IF NOT public.fn_check_and_upsert_aggregate(
    v_creator_id, NEW.lenser_id, 'battle_comment', NEW.battle_id, '5 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_commenter FROM lensers.profiles WHERE id = NEW.lenser_id;

  v_notif_id := public.fn_insert_notification(
    v_creator_id,
    'battle_comment',
    COALESCE(v_commenter.display_name, v_commenter.handle) || ' commented on your battle',
    NULL,
    '/battles/' || v_battle_slug,
    jsonb_build_object(
      'commenter_id',           NEW.lenser_id,
      'commenter_handle',       v_commenter.handle,
      'commenter_display_name', v_commenter.display_name,
      'battle_id',              NEW.battle_id,
      'battle_slug',            v_battle_slug,
      'preview',                LEFT(NEW.body, 120)
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
    SET    notification_id = v_notif_id
    WHERE  recipient_id      = v_creator_id
      AND  notification_type = 'battle_comment'
      AND  entity_id         = NEW.battle_id
      AND  notification_id   IS NULL
      AND  window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_battle_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_battle_comment ON battles.comments;
CREATE TRIGGER trg_notify_battle_comment
  AFTER INSERT ON battles.comments
  FOR EACH ROW
  EXECUTE FUNCTION battles.fn_trg_notify_battle_comment();


-- ─── 4. REFACTOR fn_notify_battle_result ─────────────────────────────────────
-- Differentiates contenders: winner receives 'battle_won', others 'battle_lost'.
-- Voters continue to receive the generic 'battle_result'.
-- The email pg_net call is preserved unchanged.

CREATE OR REPLACE FUNCTION public.fn_notify_battle_result(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_battle        battles.battles;
  v_winner        battles.contenders;
  v_action_url    TEXT;
  v_email_payload JSONB;
  v_voter_ids     UUID[];
  v_contender     RECORD;
  v_outcome_type  TEXT;
  v_body_text     TEXT;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_battle.winner_contender_id IS NOT NULL THEN
    SELECT * INTO v_winner FROM battles.contenders WHERE id = v_battle.winner_contender_id;
    v_body_text := 'Winner: ' || COALESCE(v_winner.display_name, 'Unknown');
  ELSE
    v_body_text := 'The battle ended in a draw.';
  END IF;

  v_action_url := '/battles/' || v_battle.slug || '/result';

  -- ── Contenders: differentiated battle_won / battle_lost ──────────────────
  FOR v_contender IN
    SELECT
      cem.profile_id                                                AS lenser_id,
      c.id                                                          AS contender_id,
      (c.id = v_battle.winner_contender_id)                        AS is_winner
    FROM   battles.contenders c
    JOIN   battles.contender_entity_map cem ON cem.contender_id = c.id
    WHERE  c.battle_id     = p_battle_id
      AND  cem.profile_id  IS NOT NULL
  LOOP
    v_outcome_type := CASE WHEN v_contender.is_winner THEN 'battle_won' ELSE 'battle_lost' END;

    PERFORM public.fn_insert_notification(
      v_contender.lenser_id,
      v_outcome_type,
      'Battle result: ' || v_battle.title,
      v_body_text,
      v_action_url,
      jsonb_build_object(
        'battle_id',     p_battle_id,
        'battle_slug',   v_battle.slug,
        'contender_id',  v_contender.contender_id,
        'winner_id',     v_battle.winner_contender_id,
        'winner_name',   COALESCE(v_winner.display_name, NULL),
        'is_winner',     v_contender.is_winner
      )
      -- p_actor_id = NULL: system outcome, skip block/mute gate
    );
  END LOOP;

  -- ── Voters: keep generic battle_result ───────────────────────────────────
  SELECT array_agg(DISTINCT voter_lenser_id) INTO v_voter_ids
  FROM   battles.votes
  WHERE  battle_id         = p_battle_id
    AND  voter_lenser_id   IS NOT NULL;

  IF v_voter_ids IS NOT NULL AND array_length(v_voter_ids, 1) > 0 THEN
    INSERT INTO public.notifications (lenser_id, type, title, body, action_url, metadata)
    SELECT
      unnest(v_voter_ids),
      'battle_result',
      'Battle result: ' || v_battle.title,
      v_body_text,
      v_action_url,
      jsonb_build_object(
        'battle_id',   p_battle_id,
        'battle_slug', v_battle.slug,
        'winner_id',   v_battle.winner_contender_id,
        'winner_name', COALESCE(v_winner.display_name, NULL)
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Email edge function (unchanged) ───────────────────────────────────────
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    SELECT jsonb_build_object(
      'battle_id',        p_battle_id,
      'battle_title',     v_battle.title,
      'battle_slug',      v_battle.slug,
      'winner_name',      COALESCE(v_winner.display_name, NULL),
      'recipient_emails', (
        SELECT jsonb_agg(email)
        FROM   lensers.profiles
        WHERE  id = ANY(v_voter_ids)
          AND  email IS NOT NULL
      )
    ) INTO v_email_payload;

    PERFORM net.http_post(
      url     := current_setting('app.supabase_url', true) || '/functions/v1/send-battle-result-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := v_email_payload
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_notify_battle_result failed for battle %: %', p_battle_id, SQLERRM;
END;
$$;
