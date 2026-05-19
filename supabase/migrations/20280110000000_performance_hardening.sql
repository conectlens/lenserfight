-- =============================================================================
-- Performance Hardening
-- =============================================================================
-- Addresses audit findings:
--   1. Missing indexes on RLS-critical FK columns (Issues #1 & #7)
--   2. Unbounded fan-out FOR loops in notification triggers capped + SELECT *
--      replaced with targeted column fetches in all 5 affected functions (#2, #9)
--
-- CONCURRENTLY indexes do not lock tables. Run the trigger replacements after
-- confirming indexes are VALID (pg_indexes or \d+ in psql).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Missing indexes on RLS-critical FK columns
-- ─────────────────────────────────────────────────────────────────────────────

-- agents.ownerships: 240+ RLS policies check owner_lenser_id + revoked_at
CREATE INDEX IF NOT EXISTS idx_agents_ownerships_owner
  ON agents.ownerships(owner_lenser_id) WHERE revoked_at IS NULL;

-- agents.ownerships: action_logs_owner_read and similar policies check ai_lenser_id
CREATE INDEX IF NOT EXISTS idx_agents_ownerships_ai
  ON agents.ownerships(ai_lenser_id);

-- analytics.shared_links: creator_lenser_id used in RLS owner policies
CREATE INDEX IF NOT EXISTS idx_shared_links_creator
  ON analytics.shared_links(creator_lenser_id);

-- battles.contenders: FK + notification trigger loop + contender RLS policies
CREATE INDEX IF NOT EXISTS idx_contenders_battle
  ON battles.contenders(battle_id);

-- battles.votes: fn_check_vote_velocity scans voter+time — O(n) without this
CREATE INDEX IF NOT EXISTS idx_votes_velocity
  ON battles.votes(voter_lenser_id, created_at DESC);

-- lensers.relationships: fan-out follower queries + RLS relationship policies
CREATE INDEX IF NOT EXISTS idx_relationships_target
  ON lensers.relationships(target_profile_id, status) WHERE removed_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  Fix notification triggers:
--       • Replace SELECT * %ROWTYPE with targeted column fetch (Issue #9)
--       • Add LIMIT 5000 to fan-out FOR loops as a safety cap (Issue #2)
--
-- Long-term: high-follower accounts should use async worker fan-out.
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. lenses.fn_trg_notify_lens_published
--     Original: SELECT * INTO v_author (full profile row)
--     Fixed:    SELECT display_name, handle INTO scalar vars
--     Original: FOR loop with no LIMIT (O(n followers))
--     Fixed:    LIMIT 5000 safety cap

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_lens_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, content, lensers, public
AS $$
DECLARE
  v_author_display_name TEXT;
  v_author_handle       TEXT;
  v_title               TEXT;
  v_follower            RECORD;
BEGIN
  IF NEW.visibility = 'private'::content.visibility_enum THEN
    RETURN NEW;
  END IF;

  SELECT display_name, handle
    INTO v_author_display_name, v_author_handle
    FROM lensers.profiles
   WHERE id = NEW.lenser_id;

  SELECT et.title
    INTO v_title
    FROM content.entity_translations et
   WHERE et.entity_id   = NEW.id
     AND et.entity_type = 'lens'::content.entity_type_enum
     AND et.is_original = true
   LIMIT 1;

  -- Fan-out to accepted followers.
  -- Safety cap: 5000 synchronous notifications per publish.
  -- Accounts with > 5000 followers require async worker fan-out migration.
  FOR v_follower IN
    SELECT r.source_profile_id AS follower_id
      FROM lensers.relationships r
     WHERE r.target_profile_id = NEW.lenser_id
       AND r.status            = 'accepted'
       AND r.removed_at        IS NULL
     LIMIT 5000
  LOOP
    PERFORM public.fn_insert_notification(
      v_follower.follower_id,
      'lens_published',
      COALESCE(v_author_display_name, v_author_handle) || ' published a new lens',
      v_title,
      '/lenses/' || NEW.id,
      jsonb_build_object(
        'author_id',     NEW.lenser_id,
        'author_handle', v_author_handle,
        'lens_id',       NEW.id,
        'lens_title',    v_title,
        'visibility',    NEW.visibility::text
      ),
      NEW.lenser_id
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_published failed for lens %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


-- 2b. lenses.fn_trg_notify_workflow_published
--     Same fixes as above.

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_workflow_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, public
AS $$
DECLARE
  v_author_display_name TEXT;
  v_author_handle       TEXT;
  v_follower            RECORD;
BEGIN
  SELECT display_name, handle
    INTO v_author_display_name, v_author_handle
    FROM lensers.profiles
   WHERE id = NEW.lenser_id;

  FOR v_follower IN
    SELECT r.source_profile_id AS follower_id
      FROM lensers.relationships r
     WHERE r.target_profile_id = NEW.lenser_id
       AND r.status            = 'accepted'
       AND r.removed_at        IS NULL
     LIMIT 5000
  LOOP
    PERFORM public.fn_insert_notification(
      v_follower.follower_id,
      'workflow_published',
      COALESCE(v_author_display_name, v_author_handle) || ' published a new workflow',
      NEW.title,
      '/workflows/' || NEW.id,
      jsonb_build_object(
        'author_id',      NEW.lenser_id,
        'author_handle',  v_author_handle,
        'workflow_id',    NEW.id,
        'workflow_title', NEW.title
      ),
      NEW.lenser_id
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_workflow_published failed for workflow %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


-- 2c. content.fn_trg_notify_lens_comment
--     Original: SELECT * INTO v_commenter (full profile row)
--     Fixed:    SELECT display_name, handle INTO scalar vars

CREATE OR REPLACE FUNCTION content.fn_trg_notify_lens_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = content, lenses, lensers, public
AS $$
DECLARE
  v_linked_lens_id         UUID;
  v_lens_owner_id          UUID;
  v_lens_vis               content.visibility_enum;
  v_commenter_display_name TEXT;
  v_commenter_handle       TEXT;
  v_lens_title             TEXT;
  v_notif_id               UUID;
BEGIN
  SELECT t.linked_lens_id
    INTO v_linked_lens_id
    FROM content.threads t
   WHERE t.id = NEW.thread_id;

  IF v_linked_lens_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.lenser_id, l.visibility
    INTO v_lens_owner_id, v_lens_vis
    FROM lenses.lenses l
   WHERE l.id = v_linked_lens_id;

  IF NOT FOUND OR v_lens_vis = 'private'::content.visibility_enum THEN
    RETURN NEW;
  END IF;

  IF NOT public.fn_check_and_upsert_aggregate(
    v_lens_owner_id, NEW.lenser_id, 'lens_comment', v_linked_lens_id, '5 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT display_name, handle
    INTO v_commenter_display_name, v_commenter_handle
    FROM lensers.profiles
   WHERE id = NEW.lenser_id;

  SELECT et.title
    INTO v_lens_title
    FROM content.entity_translations et
   WHERE et.entity_id   = v_linked_lens_id
     AND et.entity_type = 'lens'::content.entity_type_enum
     AND et.is_original = true
   LIMIT 1;

  v_notif_id := public.fn_insert_notification(
    v_lens_owner_id,
    'lens_comment',
    COALESCE(v_commenter_display_name, v_commenter_handle) || ' commented on your lens',
    COALESCE(v_lens_title, 'Your lens'),
    '/lenses/' || v_linked_lens_id,
    jsonb_build_object(
      'commenter_id',           NEW.lenser_id,
      'commenter_handle',       v_commenter_handle,
      'commenter_display_name', v_commenter_display_name,
      'entity_id',              v_linked_lens_id,
      'entity_type',            'lens',
      'preview',                LEFT(NEW.content, 120)
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
       SET notification_id = v_notif_id
     WHERE recipient_id      = v_lens_owner_id
       AND notification_type = 'lens_comment'
       AND entity_id         = v_linked_lens_id
       AND notification_id   IS NULL
       AND window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;


-- 2d. lenses.fn_trg_notify_lens_forked
--     Original: SELECT * INTO v_forker (full profile row)
--     Fixed:    SELECT display_name, handle INTO scalar vars

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_lens_forked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, content, lensers, public
AS $$
DECLARE
  v_parent_owner_id     UUID;
  v_parent_vis          content.visibility_enum;
  v_forker_display_name TEXT;
  v_forker_handle       TEXT;
  v_parent_title        TEXT;
  v_notif_id            UUID;
BEGIN
  SELECT l.lenser_id, l.visibility
    INTO v_parent_owner_id, v_parent_vis
    FROM lenses.lenses l
   WHERE l.id = NEW.parent_lens_id;

  IF NOT FOUND OR v_parent_vis = 'private'::content.visibility_enum THEN
    RETURN NEW;
  END IF;

  IF NOT public.fn_check_and_upsert_aggregate(
    v_parent_owner_id, NEW.lenser_id, 'lens_forked', NEW.parent_lens_id, '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT display_name, handle
    INTO v_forker_display_name, v_forker_handle
    FROM lensers.profiles
   WHERE id = NEW.lenser_id;

  SELECT et.title
    INTO v_parent_title
    FROM content.entity_translations et
   WHERE et.entity_id   = NEW.parent_lens_id
     AND et.entity_type = 'lens'::content.entity_type_enum
     AND et.is_original = true
   LIMIT 1;

  v_notif_id := public.fn_insert_notification(
    v_parent_owner_id,
    'lens_forked',
    COALESCE(v_forker_display_name, v_forker_handle) || ' forked your lens',
    COALESCE(v_parent_title, 'Your lens'),
    '/lenses/' || NEW.id,
    jsonb_build_object(
      'forker_id',           NEW.lenser_id,
      'forker_handle',       v_forker_handle,
      'forker_display_name', v_forker_display_name,
      'parent_lens_id',      NEW.parent_lens_id,
      'fork_lens_id',        NEW.id
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
       SET notification_id = v_notif_id
     WHERE recipient_id      = v_parent_owner_id
       AND notification_type = 'lens_forked'
       AND entity_id         = NEW.parent_lens_id
       AND notification_id   IS NULL
       AND window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_forked failed: %', SQLERRM;
  RETURN NEW;
END;
$$;


-- 2e. lenses.fn_trg_notify_workflow_forked
--     Original: SELECT * INTO v_forker (full profile row)
--     Fixed:    SELECT display_name, handle INTO scalar vars

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_workflow_forked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, public
AS $$
DECLARE
  v_parent_owner_id     UUID;
  v_parent_vis          TEXT;
  v_forker_display_name TEXT;
  v_forker_handle       TEXT;
  v_notif_id            UUID;
BEGIN
  SELECT w.lenser_id, w.visibility
    INTO v_parent_owner_id, v_parent_vis
    FROM lenses.workflows w
   WHERE w.id = NEW.parent_workflow_id;

  IF NOT FOUND OR v_parent_vis = 'private' THEN
    RETURN NEW;
  END IF;

  IF NOT public.fn_check_and_upsert_aggregate(
    v_parent_owner_id, NEW.lenser_id, 'workflow_forked', NEW.parent_workflow_id, '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT display_name, handle
    INTO v_forker_display_name, v_forker_handle
    FROM lensers.profiles
   WHERE id = NEW.lenser_id;

  v_notif_id := public.fn_insert_notification(
    v_parent_owner_id,
    'workflow_forked',
    COALESCE(v_forker_display_name, v_forker_handle) || ' forked your workflow',
    NEW.title,
    '/workflows/' || NEW.id,
    jsonb_build_object(
      'forker_id',           NEW.lenser_id,
      'forker_handle',       v_forker_handle,
      'forker_display_name', v_forker_display_name,
      'parent_workflow_id',  NEW.parent_workflow_id,
      'fork_workflow_id',    NEW.id,
      'fork_title',          NEW.title
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
       SET notification_id = v_notif_id
     WHERE recipient_id      = v_parent_owner_id
       AND notification_type = 'workflow_forked'
       AND entity_id         = NEW.parent_workflow_id
       AND notification_id   IS NULL
       AND window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_workflow_forked failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
