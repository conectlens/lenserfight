-- Content Notification Triggers
-- Adds triggers for: lens_comment, lens_forked, lens_published (fan-out to followers),
-- lens_featured, workflow_published (fan-out), workflow_forked.
--
-- GRASP:
--   Information Expert  → each trigger function lives in its source schema
--   Protected Variations → all functions have EXCEPTION blocks that RAISE WARNING and RETURN NEW
--   Pure Fabrication    → fn_insert_notification remains the single INSERT path


-- ─── 1. content.fn_trg_notify_lens_comment ───────────────────────────────────
-- Fires AFTER INSERT on content.thread_replies when the parent thread is linked
-- to a lens. Notifies the lens owner (not self-comments, not private lenses).
-- Aggregated within a 5-minute window per lens to prevent rapid-fire spam.

CREATE OR REPLACE FUNCTION content.fn_trg_notify_lens_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = content, lenses, lensers, public
AS $$
DECLARE
  v_linked_lens_id UUID;
  v_lens_owner_id  UUID;
  v_lens_vis       content.visibility_enum;
  v_commenter      lensers.profiles%ROWTYPE;
  v_lens_title     TEXT;
  v_notif_id       UUID;
BEGIN
  -- Resolve parent thread's linked lens
  SELECT t.linked_lens_id
  INTO   v_linked_lens_id
  FROM   content.threads t
  WHERE  t.id = NEW.thread_id;

  IF v_linked_lens_id IS NULL THEN
    RETURN NEW;  -- not a lens-linked thread
  END IF;

  -- Fetch lens owner and visibility; skip private lenses
  SELECT l.lenser_id, l.visibility
  INTO   v_lens_owner_id, v_lens_vis
  FROM   lenses.lenses l
  WHERE  l.id = v_linked_lens_id;

  IF NOT FOUND OR v_lens_vis = 'private'::content.visibility_enum THEN
    RETURN NEW;
  END IF;

  -- Anti-spam: 5-minute window per lens entity
  IF NOT public.fn_check_and_upsert_aggregate(
    v_lens_owner_id, NEW.lenser_id, 'lens_comment', v_linked_lens_id, '5 minutes'
  ) THEN
    RETURN NEW;  -- already notified recently
  END IF;

  SELECT * INTO v_commenter FROM lensers.profiles WHERE id = NEW.lenser_id;

  SELECT et.title
  INTO   v_lens_title
  FROM   content.entity_translations et
  WHERE  et.entity_id   = v_linked_lens_id
    AND  et.entity_type = 'lens'::content.entity_type_enum
    AND  et.is_original = true
  LIMIT  1;

  v_notif_id := public.fn_insert_notification(
    v_lens_owner_id,
    'lens_comment',
    COALESCE(v_commenter.display_name, v_commenter.handle) || ' commented on your lens',
    COALESCE(v_lens_title, 'Your lens'),
    '/lenses/' || v_linked_lens_id,
    jsonb_build_object(
      'commenter_id',           NEW.lenser_id,
      'commenter_handle',       v_commenter.handle,
      'commenter_display_name', v_commenter.display_name,
      'entity_id',              v_linked_lens_id,
      'entity_type',            'lens',
      'preview',                LEFT(NEW.content, 120)
    ),
    NEW.lenser_id  -- p_actor_id for block/mute gate
  );

  -- Back-fill notification_id on the aggregate for title-update support
  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
    SET    notification_id = v_notif_id
    WHERE  recipient_id      = v_lens_owner_id
      AND  notification_type = 'lens_comment'
      AND  entity_id         = v_linked_lens_id
      AND  notification_id   IS NULL
      AND  window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lens_comment ON content.thread_replies;
CREATE TRIGGER trg_notify_lens_comment
  AFTER INSERT ON content.thread_replies
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.status = 'published'::content.thread_reply_status)
  EXECUTE FUNCTION content.fn_trg_notify_lens_comment();


-- ─── 2. lenses.fn_trg_notify_lens_forked ─────────────────────────────────────
-- Fires AFTER INSERT on lenses.lenses when parent_lens_id IS NOT NULL (a fork).
-- Notifies the original lens owner. Aggregated within a 1-hour window per lens.

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_lens_forked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, content, lensers, public
AS $$
DECLARE
  v_parent_owner_id UUID;
  v_parent_vis      content.visibility_enum;
  v_forker          lensers.profiles%ROWTYPE;
  v_parent_title    TEXT;
  v_notif_id        UUID;
BEGIN
  -- Fetch parent lens owner and visibility
  SELECT l.lenser_id, l.visibility
  INTO   v_parent_owner_id, v_parent_vis
  FROM   lenses.lenses l
  WHERE  l.id = NEW.parent_lens_id;

  IF NOT FOUND OR v_parent_vis = 'private'::content.visibility_enum THEN
    RETURN NEW;  -- private parent or not found — do not leak existence
  END IF;

  -- Anti-spam: 1-hour window per parent lens
  IF NOT public.fn_check_and_upsert_aggregate(
    v_parent_owner_id, NEW.lenser_id, 'lens_forked', NEW.parent_lens_id, '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_forker FROM lensers.profiles WHERE id = NEW.lenser_id;

  SELECT et.title
  INTO   v_parent_title
  FROM   content.entity_translations et
  WHERE  et.entity_id   = NEW.parent_lens_id
    AND  et.entity_type = 'lens'::content.entity_type_enum
    AND  et.is_original = true
  LIMIT  1;

  v_notif_id := public.fn_insert_notification(
    v_parent_owner_id,
    'lens_forked',
    COALESCE(v_forker.display_name, v_forker.handle) || ' forked your lens',
    COALESCE(v_parent_title, 'Your lens'),
    '/lenses/' || NEW.id,
    jsonb_build_object(
      'forker_id',           NEW.lenser_id,
      'forker_handle',       v_forker.handle,
      'forker_display_name', v_forker.display_name,
      'parent_lens_id',      NEW.parent_lens_id,
      'fork_lens_id',        NEW.id
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
    SET    notification_id = v_notif_id
    WHERE  recipient_id      = v_parent_owner_id
      AND  notification_type = 'lens_forked'
      AND  entity_id         = NEW.parent_lens_id
      AND  notification_id   IS NULL
      AND  window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_forked failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lens_forked ON lenses.lenses;
CREATE TRIGGER trg_notify_lens_forked
  AFTER INSERT ON lenses.lenses
  FOR EACH ROW
  WHEN (NEW.parent_lens_id IS NOT NULL)
  EXECUTE FUNCTION lenses.fn_trg_notify_lens_forked();


-- ─── 3. lenses.fn_trg_notify_lens_published ──────────────────────────────────
-- Fires AFTER UPDATE OF status on lenses.lenses when status transitions to
-- 'published'. Fan-out to all accepted followers of the lens author.
-- Skips private lenses.
--
-- Known limitation: O(n followers) inside a transaction. Acceptable for the
-- typical follower count; marked for future async fanout migration.

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_lens_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, content, lensers, public
AS $$
DECLARE
  v_author   lensers.profiles%ROWTYPE;
  v_title    TEXT;
  v_follower RECORD;
BEGIN
  -- Skip private lenses
  IF NEW.visibility = 'private'::content.visibility_enum THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_author FROM lensers.profiles WHERE id = NEW.lenser_id;

  SELECT et.title
  INTO   v_title
  FROM   content.entity_translations et
  WHERE  et.entity_id   = NEW.id
    AND  et.entity_type = 'lens'::content.entity_type_enum
    AND  et.is_original = true
  LIMIT  1;

  -- Fan-out to accepted followers
  FOR v_follower IN
    SELECT r.source_profile_id AS follower_id
    FROM   lensers.relationships r
    WHERE  r.target_profile_id = NEW.lenser_id
      AND  r.status            = 'accepted'
      AND  r.removed_at        IS NULL
  LOOP
    PERFORM public.fn_insert_notification(
      v_follower.follower_id,
      'lens_published',
      COALESCE(v_author.display_name, v_author.handle) || ' published a new lens',
      v_title,
      '/lenses/' || NEW.id,
      jsonb_build_object(
        'author_id',      NEW.lenser_id,
        'author_handle',  v_author.handle,
        'lens_id',        NEW.id,
        'lens_title',     v_title,
        'visibility',     NEW.visibility::text
      ),
      NEW.lenser_id  -- p_actor_id for block/mute gate per follower
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_published failed for lens %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lens_published ON lenses.lenses;
CREATE TRIGGER trg_notify_lens_published
  AFTER UPDATE OF status ON lenses.lenses
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status = 'published'::content.content_status)
  EXECUTE FUNCTION lenses.fn_trg_notify_lens_published();


-- ─── 4. lenses.fn_trg_notify_lens_featured ───────────────────────────────────
-- Fires AFTER UPDATE OF is_featured on lenses.lenses when flipped to true.
-- Admin action → p_actor_id = NULL (bypass block/mute gate).

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_lens_featured()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, public
AS $$
BEGIN
  PERFORM public.fn_insert_notification(
    NEW.lenser_id,
    'lens_featured',
    'Your lens was featured!',
    'Congratulations — your lens has been selected as a featured lens.',
    '/lenses/' || NEW.id,
    jsonb_build_object('lens_id', NEW.id)
    -- no p_actor_id: admin action, skip block/mute gate
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_lens_featured failed for lens %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lens_featured ON lenses.lenses;
CREATE TRIGGER trg_notify_lens_featured
  AFTER UPDATE OF is_featured ON lenses.lenses
  FOR EACH ROW
  WHEN (OLD.is_featured = false AND NEW.is_featured = true)
  EXECUTE FUNCTION lenses.fn_trg_notify_lens_featured();


-- ─── 5. lenses.fn_trg_notify_workflow_published ──────────────────────────────
-- Fires AFTER UPDATE OF visibility on lenses.workflows when visibility
-- transitions to 'public'. Fan-out to accepted followers of the workflow author.

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_workflow_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, public
AS $$
DECLARE
  v_author   lensers.profiles%ROWTYPE;
  v_follower RECORD;
BEGIN
  SELECT * INTO v_author FROM lensers.profiles WHERE id = NEW.lenser_id;

  FOR v_follower IN
    SELECT r.source_profile_id AS follower_id
    FROM   lensers.relationships r
    WHERE  r.target_profile_id = NEW.lenser_id
      AND  r.status            = 'accepted'
      AND  r.removed_at        IS NULL
  LOOP
    PERFORM public.fn_insert_notification(
      v_follower.follower_id,
      'workflow_published',
      COALESCE(v_author.display_name, v_author.handle) || ' published a new workflow',
      NEW.title,
      '/workflows/' || NEW.id,
      jsonb_build_object(
        'author_id',       NEW.lenser_id,
        'author_handle',   v_author.handle,
        'workflow_id',     NEW.id,
        'workflow_title',  NEW.title
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

DROP TRIGGER IF EXISTS trg_notify_workflow_published ON lenses.workflows;
CREATE TRIGGER trg_notify_workflow_published
  AFTER UPDATE OF visibility ON lenses.workflows
  FOR EACH ROW
  WHEN (OLD.visibility IS DISTINCT FROM NEW.visibility AND NEW.visibility = 'public')
  EXECUTE FUNCTION lenses.fn_trg_notify_workflow_published();


-- ─── 6. lenses.fn_trg_notify_workflow_forked ─────────────────────────────────
-- Fires AFTER INSERT on lenses.workflows when parent_workflow_id IS NOT NULL.
-- Notifies the original workflow owner. Aggregated within a 1-hour window.

CREATE OR REPLACE FUNCTION lenses.fn_trg_notify_workflow_forked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, public
AS $$
DECLARE
  v_parent_owner_id UUID;
  v_parent_vis      TEXT;
  v_forker          lensers.profiles%ROWTYPE;
  v_notif_id        UUID;
BEGIN
  SELECT w.lenser_id, w.visibility
  INTO   v_parent_owner_id, v_parent_vis
  FROM   lenses.workflows w
  WHERE  w.id = NEW.parent_workflow_id;

  IF NOT FOUND OR v_parent_vis = 'private' THEN
    RETURN NEW;
  END IF;

  IF NOT public.fn_check_and_upsert_aggregate(
    v_parent_owner_id, NEW.lenser_id, 'workflow_forked', NEW.parent_workflow_id, '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_forker FROM lensers.profiles WHERE id = NEW.lenser_id;

  v_notif_id := public.fn_insert_notification(
    v_parent_owner_id,
    'workflow_forked',
    COALESCE(v_forker.display_name, v_forker.handle) || ' forked your workflow',
    NEW.title,
    '/workflows/' || NEW.id,
    jsonb_build_object(
      'forker_id',           NEW.lenser_id,
      'forker_handle',       v_forker.handle,
      'forker_display_name', v_forker.display_name,
      'parent_workflow_id',  NEW.parent_workflow_id,
      'fork_workflow_id',    NEW.id,
      'fork_title',          NEW.title
    ),
    NEW.lenser_id
  );

  IF v_notif_id IS NOT NULL THEN
    UPDATE public.notification_aggregates
    SET    notification_id = v_notif_id
    WHERE  recipient_id      = v_parent_owner_id
      AND  notification_type = 'workflow_forked'
      AND  entity_id         = NEW.parent_workflow_id
      AND  notification_id   IS NULL
      AND  window_end        > now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_trg_notify_workflow_forked failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_workflow_forked ON lenses.workflows;
CREATE TRIGGER trg_notify_workflow_forked
  AFTER INSERT ON lenses.workflows
  FOR EACH ROW
  WHEN (NEW.parent_workflow_id IS NOT NULL)
  EXECUTE FUNCTION lenses.fn_trg_notify_workflow_forked();
