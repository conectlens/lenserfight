-- Phase 22: Comprehensive Notification System Expansion
-- Expands notification types from 5 to 24, adds fn_insert_notification Pure Fabrication helper,
-- fn_get_unread_notification_count RPC, and 9 domain trigger functions covering all meaningful
-- events for Human Lensers and AI Lensers.
--
-- GRASP principles applied:
--   Information Expert  → trigger functions co-located with their source schema
--   Creator             → fn_insert_notification is the sole INSERT path
--   Pure Fabrication    → fn_insert_notification has no domain meaning, only creation responsibility
--   Protected Variations → exception blocks prevent trigger failures from blocking callers

-- ─── 1. Expand CHECK constraint ──────────────────────────────────────────────

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Battle (shared human + AI)
    'battle_result',
    'battle_started',
    'vote_reminder',
    -- Battle (human-specific)
    'vote_received',
    -- Battle (AI lenser-specific)
    'battle_assigned',
    'battle_vote_cast',
    -- Social (human)
    'follow_new',
    'follow_request',
    'follow_accepted',
    -- Content (human)
    'lens_reaction',
    'lens_comment',
    -- Agent ownership (human owner of AI lenser)
    'agent_update',
    'agent_cron_result',
    'agent_critical',
    -- Agent runs (AI lenser's own notifications)
    'team_run_started',
    'team_run_completed',
    'team_run_failed',
    -- CRON (AI lenser / workflow owner)
    'cron_run_completed',
    'cron_run_failed',
    -- Config changes (AI lenser)
    'policy_updated',
    'model_binding_changed',
    'requirement_update',
    -- System
    'badge_awarded',
    'system'
  ));


-- ─── 2. Pure Fabrication helper: fn_insert_notification ──────────────────────
-- Single INSERT path. All trigger functions call this; nobody does raw INSERTs.
-- Returns the new notification UUID, or NULL if the lenser doesn't exist or
-- an error occurs (errors are logged as warnings, never re-raised to callers).

CREATE OR REPLACE FUNCTION public.fn_insert_notification(
  p_lenser_id  UUID,
  p_type       TEXT,
  p_title      TEXT,
  p_body       TEXT       DEFAULT NULL,
  p_action_url TEXT       DEFAULT NULL,
  p_metadata   JSONB      DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lensers.profiles WHERE id = p_lenser_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (lenser_id, type, title, body, action_url, metadata)
  VALUES (p_lenser_id, p_type, p_title, p_body, p_action_url, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_insert_notification failed for lenser=% type=%: %',
    p_lenser_id, p_type, SQLERRM;
  RETURN NULL;
END;
$$;


-- ─── 3. Lightweight unread count RPC ─────────────────────────────────────────
-- Used by the Sidebar bell badge. Avoids fetching the full notification list.

CREATE OR REPLACE FUNCTION public.fn_get_unread_notification_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lensers
AS $$
  SELECT COUNT(*)::BIGINT
  FROM   public.notifications
  WHERE  lenser_id = lensers.get_auth_lenser_id()
  AND    read_at IS NULL;
$$;


-- ─── 4. Trigger: lensers.relationships → follow_new / follow_request / follow_accepted ──

CREATE OR REPLACE FUNCTION lensers.trg_notify_relationship_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
DECLARE
  v_actor    lensers.profiles%ROWTYPE;
  v_acceptor lensers.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM lensers.profiles WHERE id = NEW.source_profile_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      -- Direct follow (public/community profile) → notify the target
      PERFORM public.fn_insert_notification(
        NEW.target_profile_id,
        'follow_new',
        COALESCE(v_actor.display_name, v_actor.handle) || ' started following you',
        NULL,
        '/lenser/' || v_actor.handle,
        jsonb_build_object(
          'follower_id',           NEW.source_profile_id,
          'follower_handle',       v_actor.handle,
          'follower_display_name', v_actor.display_name,
          'follower_avatar_url',   v_actor.avatar_url
        )
      );
    ELSIF NEW.status = 'pending' THEN
      -- Follow request (private profile)
      PERFORM public.fn_insert_notification(
        NEW.target_profile_id,
        'follow_request',
        COALESCE(v_actor.display_name, v_actor.handle) || ' requested to follow you',
        NULL,
        '/notifications',
        jsonb_build_object(
          'requester_id',           NEW.source_profile_id,
          'requester_handle',       v_actor.handle,
          'requester_display_name', v_actor.display_name,
          'requester_avatar_url',   v_actor.avatar_url
        )
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT * INTO v_acceptor FROM lensers.profiles WHERE id = NEW.target_profile_id;
    PERFORM public.fn_insert_notification(
      NEW.source_profile_id,
      'follow_accepted',
      COALESCE(v_acceptor.display_name, v_acceptor.handle) || ' accepted your follow request',
      NULL,
      '/lenser/' || v_acceptor.handle,
      jsonb_build_object(
        'acceptor_id',           NEW.target_profile_id,
        'acceptor_handle',       v_acceptor.handle,
        'acceptor_display_name', v_acceptor.display_name,
        'acceptor_avatar_url',   v_acceptor.avatar_url
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_relationship_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_relationship_change ON lensers.relationships;
CREATE TRIGGER trg_notify_relationship_change
  AFTER INSERT OR UPDATE ON lensers.relationships
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'accepted') AND NEW.removed_at IS NULL)
  EXECUTE FUNCTION lensers.trg_notify_relationship_change();


-- ─── 5. Trigger: content.reactions → lens_reaction ───────────────────────────

CREATE OR REPLACE FUNCTION content.trg_notify_lens_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = content, lenses, lensers, public
AS $$
DECLARE
  v_owner_id UUID;
  v_reactor  lensers.profiles%ROWTYPE;
  v_slug     TEXT;
BEGIN
  -- Resolve entity owner (only lens and workflow supported)
  IF NEW.entity_type = 'lens' THEN
    SELECT lenser_id INTO v_owner_id FROM lenses.lenses WHERE id = NEW.entity_id;
    v_slug := '/lenses/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'workflow' THEN
    SELECT lenser_id INTO v_owner_id FROM lenses.workflows WHERE id = NEW.entity_id;
    v_slug := '/workflows/' || NEW.entity_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Skip if owner not found or this is a self-reaction
  IF v_owner_id IS NULL OR v_owner_id = NEW.lenser_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_reactor FROM lensers.profiles WHERE id = NEW.lenser_id;

  PERFORM public.fn_insert_notification(
    v_owner_id,
    'lens_reaction',
    COALESCE(v_reactor.display_name, v_reactor.handle) || ' reacted to your ' || NEW.entity_type::text,
    NULL,
    v_slug,
    jsonb_build_object(
      'reactor_id',           NEW.lenser_id,
      'reactor_handle',       v_reactor.handle,
      'reactor_display_name', v_reactor.display_name,
      'reactor_avatar_url',   v_reactor.avatar_url,
      'reaction',             NEW.reaction::text,
      'entity_type',          NEW.entity_type::text,
      'entity_id',            NEW.entity_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_lens_reaction failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lens_reaction ON content.reactions;
CREATE TRIGGER trg_notify_lens_reaction
  AFTER INSERT ON content.reactions
  FOR EACH ROW
  WHEN (NEW.entity_type IN ('lens', 'workflow'))
  EXECUTE FUNCTION content.trg_notify_lens_reaction();


-- ─── 6. Trigger: battles.votes → vote_received (human) / battle_vote_cast (AI) ──

CREATE OR REPLACE FUNCTION battles.trg_notify_vote_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_contender_owner_id UUID;
  v_voter              lensers.profiles%ROWTYPE;
  v_battle             battles.battles%ROWTYPE;
BEGIN
  -- Find the profile_id of the voted contender
  SELECT cem.profile_id INTO v_contender_owner_id
  FROM   battles.contender_entity_map cem
  WHERE  cem.contender_id = NEW.voted_contender_id
  AND    cem.profile_id IS NOT NULL;

  IF v_contender_owner_id IS NULL THEN
    RETURN NEW;  -- AI contender, handled by trg_notify_ai_vote_cast
  END IF;

  -- Skip self-votes
  IF v_contender_owner_id = NEW.voter_lenser_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_voter  FROM lensers.profiles WHERE id = NEW.voter_lenser_id;
  SELECT * INTO v_battle FROM battles.battles   WHERE id = NEW.battle_id;

  PERFORM public.fn_insert_notification(
    v_contender_owner_id,
    'vote_received',
    COALESCE(v_voter.display_name, v_voter.handle) || ' voted on your entry',
    v_battle.title,
    '/battles/' || v_battle.slug,
    jsonb_build_object(
      'battle_id',          NEW.battle_id,
      'battle_slug',        v_battle.slug,
      'voter_id',           NEW.voter_lenser_id,
      'voter_handle',       v_voter.handle,
      'vote_value',         NEW.vote_value::text,
      'voted_contender_id', NEW.voted_contender_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_vote_received failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_vote_received ON battles.votes;
CREATE TRIGGER trg_notify_vote_received
  AFTER INSERT ON battles.votes
  FOR EACH ROW
  WHEN (NEW.is_ai_vote = false)
  EXECUTE FUNCTION battles.trg_notify_vote_received();


CREATE OR REPLACE FUNCTION battles.trg_notify_ai_vote_cast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_battle battles.battles%ROWTYPE;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = NEW.battle_id;

  PERFORM public.fn_insert_notification(
    NEW.voter_lenser_id,
    'battle_vote_cast',
    'Vote recorded: ' || COALESCE(v_battle.title, 'battle'),
    'Voted for contender ' || NEW.voted_contender_id::text,
    '/battles/' || v_battle.slug,
    jsonb_build_object(
      'battle_id',          NEW.battle_id,
      'battle_slug',        v_battle.slug,
      'voted_contender_id', NEW.voted_contender_id,
      'vote_value',         NEW.vote_value::text
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_ai_vote_cast failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ai_vote_cast ON battles.votes;
CREATE TRIGGER trg_notify_ai_vote_cast
  AFTER INSERT ON battles.votes
  FOR EACH ROW
  WHEN (NEW.is_ai_vote = true)
  EXECUTE FUNCTION battles.trg_notify_ai_vote_cast();


-- ─── 7. Trigger: battles.contender_entity_map → battle_assigned ─────────────
-- Fires after fn_populate_contender_entity_map (which inserts the row).
-- Notifies the AI lenser and their human owner.

CREATE OR REPLACE FUNCTION battles.trg_notify_battle_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, lensers, public
AS $$
DECLARE
  v_ai_profile_id UUID;
  v_owner_id      UUID;
  v_battle        battles.battles%ROWTYPE;
  v_contender     battles.contenders%ROWTYPE;
BEGIN
  SELECT profile_id INTO v_ai_profile_id
  FROM   agents.ai_lensers
  WHERE  id = NEW.ai_lenser_id;

  SELECT owner_lenser_id INTO v_owner_id
  FROM   agents.ownerships
  WHERE  ai_lenser_id = NEW.ai_lenser_id
  AND    role = 'owner'
  AND    revoked_at IS NULL
  LIMIT  1;

  SELECT * INTO v_contender FROM battles.contenders  WHERE id = NEW.contender_id;
  SELECT * INTO v_battle    FROM battles.battles      WHERE id = v_contender.battle_id;

  -- Notify AI lenser profile
  IF v_ai_profile_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_ai_profile_id,
      'battle_assigned',
      'You have been assigned to a battle',
      v_battle.title,
      '/battles/' || v_battle.slug,
      jsonb_build_object(
        'battle_id',    v_battle.id,
        'battle_slug',  v_battle.slug,
        'battle_title', v_battle.title,
        'slot',         v_contender.slot,
        'contender_id', v_contender.id
      )
    );
  END IF;

  -- Notify human owner
  IF v_owner_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_owner_id,
      'agent_update',
      'Your AI lenser was assigned to a battle',
      v_battle.title,
      '/battles/' || v_battle.slug,
      jsonb_build_object(
        'ai_lenser_id',   NEW.ai_lenser_id,
        'ai_profile_id',  v_ai_profile_id,
        'battle_id',      v_battle.id,
        'battle_slug',    v_battle.slug,
        'event',          'battle_assigned'
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_battle_assigned failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_battle_assigned ON battles.contender_entity_map;
CREATE TRIGGER trg_notify_battle_assigned
  AFTER INSERT ON battles.contender_entity_map
  FOR EACH ROW
  WHEN (NEW.ai_lenser_id IS NOT NULL)
  EXECUTE FUNCTION battles.trg_notify_battle_assigned();


-- ─── 8. Trigger: agents.team_runs → team_run_started / completed / failed ────

CREATE OR REPLACE FUNCTION agents.trg_notify_team_run_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lenses, lensers, public
AS $$
DECLARE
  v_ai_profile_id UUID;
  v_owner_id      UUID;
  v_wf_name       TEXT;
  v_notif_type    TEXT;
  v_title         TEXT;
  v_run_url       TEXT;
BEGIN
  -- Determine which transition fired
  IF TG_OP = 'INSERT' AND NEW.status = 'running' THEN
    v_notif_type := 'team_run_started';
    v_title      := 'Run started';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF   NEW.status = 'completed' THEN
      v_notif_type := 'team_run_completed'; v_title := 'Run completed';
    ELSIF NEW.status = 'failed' THEN
      v_notif_type := 'team_run_failed';    v_title := 'Run failed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT profile_id INTO v_ai_profile_id
  FROM   agents.ai_lensers WHERE id = NEW.ai_lenser_id;

  SELECT owner_lenser_id INTO v_owner_id
  FROM   agents.ownerships
  WHERE  ai_lenser_id = NEW.ai_lenser_id
  AND    role = 'owner'
  AND    revoked_at IS NULL
  LIMIT  1;

  IF NEW.workflow_id IS NOT NULL THEN
    SELECT title INTO v_wf_name FROM lenses.workflows WHERE id = NEW.workflow_id;
  END IF;

  v_run_url := '/lenser/' ||
    COALESCE((SELECT handle FROM lensers.profiles WHERE id = v_ai_profile_id), 'unknown') ||
    '/ag/runs';

  -- Notify AI lenser
  IF v_ai_profile_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_ai_profile_id,
      v_notif_type,
      v_title || COALESCE(': ' || v_wf_name, ''),
      NULL,
      v_run_url,
      jsonb_build_object(
        'team_run_id',   NEW.id,
        'workflow_id',   NEW.workflow_id,
        'workflow_name', v_wf_name,
        'status',        NEW.status
      )
    );
  END IF;

  -- Notify human owner on completion or failure only
  IF v_owner_id IS NOT NULL AND v_notif_type IN ('team_run_completed', 'team_run_failed') THEN
    PERFORM public.fn_insert_notification(
      v_owner_id,
      CASE v_notif_type
        WHEN 'team_run_failed'    THEN 'agent_critical'
        WHEN 'team_run_completed' THEN 'agent_update'
      END,
      'Agent ' || v_title || COALESCE(': ' || v_wf_name, ''),
      NULL,
      v_run_url,
      jsonb_build_object(
        'ai_lenser_id',  NEW.ai_lenser_id,
        'ai_profile_id', v_ai_profile_id,
        'team_run_id',   NEW.id,
        'workflow_name', v_wf_name,
        'status',        NEW.status
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_team_run_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_team_run_change ON agents.team_runs;
CREATE TRIGGER trg_notify_team_run_change
  AFTER INSERT OR UPDATE OF status ON agents.team_runs
  FOR EACH ROW
  EXECUTE FUNCTION agents.trg_notify_team_run_change();


-- ─── 9. Trigger: lenses.workflow_runs → cron_run_completed / cron_run_failed ─
-- Only fires when the workflow has at least one active schedule (i.e. it's a scheduled run).

CREATE OR REPLACE FUNCTION lenses.trg_notify_cron_run_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, agents, lensers, public
AS $$
DECLARE
  v_owner_id       UUID;
  v_wf_name        TEXT;
  v_notif_type     TEXT;
  v_is_scheduled   BOOL;
  v_ai_owner_id    UUID;
  v_ai_profile_id  UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('completed', 'failed') THEN RETURN NEW; END IF;

  -- Only fire for scheduled workflows
  SELECT EXISTS (
    SELECT 1 FROM lenses.workflow_schedules
    WHERE  workflow_id = NEW.workflow_id AND is_active = true
  ) INTO v_is_scheduled;

  IF NOT v_is_scheduled THEN RETURN NEW; END IF;

  SELECT lenser_id, title INTO v_owner_id, v_wf_name
  FROM   lenses.workflows WHERE id = NEW.workflow_id;

  v_notif_type := CASE NEW.status WHEN 'completed' THEN 'cron_run_completed' ELSE 'cron_run_failed' END;

  -- Notify workflow owner (could be human or AI lenser profile)
  IF v_owner_id IS NOT NULL THEN
    PERFORM public.fn_insert_notification(
      v_owner_id,
      v_notif_type,
      'Scheduled run ' || NEW.status || COALESCE(': ' || v_wf_name, ''),
      NULL,
      '/workflows/' || NEW.workflow_id,
      jsonb_build_object(
        'workflow_run_id', NEW.id,
        'workflow_id',     NEW.workflow_id,
        'workflow_name',   v_wf_name,
        'status',          NEW.status
      )
    );

    -- If the workflow owner is an AI lenser, also notify the human owner
    SELECT al.id, al.profile_id INTO v_ai_profile_id, v_ai_profile_id
    FROM   agents.ai_lensers al WHERE al.profile_id = v_owner_id;

    IF FOUND THEN
      -- v_owner_id is an AI lenser's profile — find their human owner
      SELECT o.owner_lenser_id INTO v_ai_owner_id
      FROM   agents.ownerships o
      JOIN   agents.ai_lensers al ON al.id = o.ai_lenser_id
      WHERE  al.profile_id = v_owner_id
      AND    o.role = 'owner'
      AND    o.revoked_at IS NULL
      LIMIT  1;

      IF v_ai_owner_id IS NOT NULL THEN
        PERFORM public.fn_insert_notification(
          v_ai_owner_id,
          CASE NEW.status WHEN 'completed' THEN 'agent_cron_result' ELSE 'agent_critical' END,
          'Agent CRON run ' || NEW.status || COALESCE(': ' || v_wf_name, ''),
          NULL,
          '/workflows/' || NEW.workflow_id,
          jsonb_build_object(
            'ai_profile_id',   v_owner_id,
            'workflow_run_id', NEW.id,
            'workflow_name',   v_wf_name,
            'status',          NEW.status
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_cron_run_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cron_run_change ON lenses.workflow_runs;
CREATE TRIGGER trg_notify_cron_run_change
  AFTER UPDATE OF status ON lenses.workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION lenses.trg_notify_cron_run_change();


-- ─── 10. Trigger: agents.policies → policy_updated ───────────────────────────

CREATE OR REPLACE FUNCTION agents.trg_notify_policy_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
DECLARE
  v_ai_profile_id UUID;
  v_changes       JSONB := '{}';
BEGIN
  SELECT profile_id INTO v_ai_profile_id
  FROM   agents.ai_lensers WHERE id = NEW.ai_lenser_id;

  IF v_ai_profile_id IS NULL THEN RETURN NEW; END IF;

  -- Collect meaningfully changed policy fields
  IF OLD.can_join_battles     IS DISTINCT FROM NEW.can_join_battles     THEN
    v_changes := v_changes || jsonb_build_object('can_join_battles', NEW.can_join_battles);
  END IF;
  IF OLD.can_vote             IS DISTINCT FROM NEW.can_vote             THEN
    v_changes := v_changes || jsonb_build_object('can_vote', NEW.can_vote);
  END IF;
  IF OLD.can_create_battles   IS DISTINCT FROM NEW.can_create_battles   THEN
    v_changes := v_changes || jsonb_build_object('can_create_battles', NEW.can_create_battles);
  END IF;
  IF OLD.max_daily_battles    IS DISTINCT FROM NEW.max_daily_battles    THEN
    v_changes := v_changes || jsonb_build_object('max_daily_battles', NEW.max_daily_battles);
  END IF;
  IF OLD.max_daily_votes      IS DISTINCT FROM NEW.max_daily_votes      THEN
    v_changes := v_changes || jsonb_build_object('max_daily_votes', NEW.max_daily_votes);
  END IF;
  IF OLD.spending_limit_credits IS DISTINCT FROM NEW.spending_limit_credits THEN
    v_changes := v_changes || jsonb_build_object('spending_limit_credits', NEW.spending_limit_credits);
  END IF;

  IF v_changes = '{}' THEN RETURN NEW; END IF;  -- No meaningful change

  PERFORM public.fn_insert_notification(
    v_ai_profile_id,
    'policy_updated',
    'Your agent policy has been updated',
    NULL,
    '/lenser/' || (SELECT handle FROM lensers.profiles WHERE id = v_ai_profile_id) || '/ag/settings',
    jsonb_build_object(
      'ai_lenser_id', NEW.ai_lenser_id,
      'changes',      v_changes
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_policy_updated failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_policy_updated ON agents.policies;
CREATE TRIGGER trg_notify_policy_updated
  AFTER UPDATE ON agents.policies
  FOR EACH ROW
  EXECUTE FUNCTION agents.trg_notify_policy_updated();


-- ─── 11. Trigger: agents.model_bindings → model_binding_changed ──────────────

CREATE OR REPLACE FUNCTION agents.trg_notify_model_binding_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
DECLARE
  v_ai_lenser_id  UUID := COALESCE(NEW.ai_lenser_id, OLD.ai_lenser_id);
  v_ai_profile_id UUID;
  v_model_id      TEXT;
BEGIN
  SELECT profile_id INTO v_ai_profile_id
  FROM   agents.ai_lensers WHERE id = v_ai_lenser_id;

  IF v_ai_profile_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  v_model_id := COALESCE(NEW.model_id, OLD.model_id)::text;

  PERFORM public.fn_insert_notification(
    v_ai_profile_id,
    'model_binding_changed',
    'Model binding ' || lower(TG_OP),
    NULL,
    '/lenser/' || (SELECT handle FROM lensers.profiles WHERE id = v_ai_profile_id) || '/ag/settings',
    jsonb_build_object(
      'ai_lenser_id', v_ai_lenser_id,
      'model_id',     v_model_id,
      'is_default',   COALESCE(NEW.is_default, false),
      'operation',    lower(TG_OP)
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_model_binding_changed failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_model_binding_changed ON agents.model_bindings;
CREATE TRIGGER trg_notify_model_binding_changed
  AFTER INSERT OR UPDATE OF is_default OR DELETE ON agents.model_bindings
  FOR EACH ROW
  EXECUTE FUNCTION agents.trg_notify_model_binding_changed();
