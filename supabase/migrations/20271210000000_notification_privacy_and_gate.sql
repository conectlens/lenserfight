-- Notification Privacy Gate — Guard Functions & fn_insert_notification Refactor
-- Adds block/mute/self-check gate functions, wires them into fn_insert_notification,
-- and exposes fn_get_notification_preferences / fn_upsert_notification_preference RPCs.
--
-- GRASP:
--   Creator             → fn_insert_notification remains the sole INSERT path
--   Protected Variations → all gate functions fail-open (EXCEPTION → return safe default)
--   Information Expert  → block check lives in public schema alongside lensers.*


-- ─── 1. fn_is_notification_blocked ───────────────────────────────────────────
-- Returns true when p_recipient_id has blocked p_actor_id.
-- Blocking is stored in lensers.relationships WHERE status = 'blocked'.

CREATE OR REPLACE FUNCTION public.fn_is_notification_blocked(
  p_actor_id     UUID,
  p_recipient_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   lensers.relationships
    WHERE  source_profile_id = p_recipient_id
      AND  target_profile_id = p_actor_id
      AND  status = 'blocked'
      AND  removed_at IS NULL
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_is_notification_blocked failed: %', SQLERRM;
  RETURN false;  -- fail-open: never suppress by accident
END;
$$;


-- ─── 2. fn_is_notification_muted ─────────────────────────────────────────────
-- Returns true when the recipient has explicitly disabled a notification type.
-- No row in notification_preferences → default = enabled (fail-open).

CREATE OR REPLACE FUNCTION public.fn_is_notification_muted(
  p_lenser_id UUID,
  p_type      TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT NOT enabled
     FROM   public.notification_preferences
     WHERE  lenser_id         = p_lenser_id
       AND  notification_type = p_type),
    false
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_is_notification_muted failed: %', SQLERRM;
  RETURN false;  -- fail-open
END;
$$;


-- ─── 3. fn_should_send_notification ──────────────────────────────────────────
-- Master gate. Returns false when notification must be suppressed:
--   1. self-notification (actor = recipient)
--   2. recipient has blocked the actor
--   3. recipient has muted the notification type
-- Returns true otherwise. EXCEPTION → true (fail-open).

CREATE OR REPLACE FUNCTION public.fn_should_send_notification(
  p_recipient_id UUID,
  p_actor_id     UUID,
  p_type         TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
BEGIN
  -- Self-notification check
  IF p_recipient_id = p_actor_id THEN
    RETURN false;
  END IF;

  -- Block check
  IF public.fn_is_notification_blocked(p_actor_id, p_recipient_id) THEN
    RETURN false;
  END IF;

  -- Mute check
  IF public.fn_is_notification_muted(p_recipient_id, p_type) THEN
    RETURN false;
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_should_send_notification failed: %', SQLERRM;
  RETURN true;  -- fail-open — never suppress by accident
END;
$$;


-- ─── 4. fn_check_and_upsert_aggregate ────────────────────────────────────────
-- Anti-spam deduplication gate for high-volume events (likes, comments, forks).
-- Returns false when the event falls inside an existing open window (caller
-- should skip fn_insert_notification — already notified recently).
-- Returns true when a new window has been opened (caller may insert).
-- The notification_id on the aggregate is back-filled by the caller after insert.

CREATE OR REPLACE FUNCTION public.fn_check_and_upsert_aggregate(
  p_recipient_id UUID,
  p_actor_id     UUID,
  p_type         TEXT,
  p_entity_id    UUID,
  p_window       INTERVAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_agg public.notification_aggregates;
BEGIN
  -- Look for an open window; lock the row to prevent parallel duplicates.
  SELECT *
  INTO   v_agg
  FROM   public.notification_aggregates
  WHERE  recipient_id      = p_recipient_id
    AND  notification_type = p_type
    AND  entity_id         = p_entity_id
    AND  window_end        > now()
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    -- Within the window: append actor (if new) and suppress new notification.
    IF NOT (p_actor_id = ANY(v_agg.actor_ids)) THEN
      UPDATE public.notification_aggregates
      SET    actor_ids = array_append(actor_ids, p_actor_id)
      WHERE  id        = v_agg.id;
    END IF;
    RETURN false;
  END IF;

  -- No open window: create a new one and allow the notification.
  INSERT INTO public.notification_aggregates
    (recipient_id, notification_type, entity_id, window_start, window_end, actor_ids)
  VALUES
    (p_recipient_id, p_type, p_entity_id, now(), now() + p_window, ARRAY[p_actor_id]);

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_check_and_upsert_aggregate failed: %', SQLERRM;
  RETURN true;  -- fail-open — allow the notification on error
END;
$$;


-- ─── 5. fn_insert_notification — refactor to add p_actor_id gate ─────────────
-- Adding optional 7th parameter p_actor_id UUID DEFAULT NULL.
-- When provided, fn_should_send_notification is called before INSERT.
-- All existing 9 trigger callers pass no p_actor_id → gate is skipped for
-- system-generated notifications (policy_updated, cron runs, etc.).
-- Backward-compatible: existing 6-arg call sites still resolve correctly.

CREATE OR REPLACE FUNCTION public.fn_insert_notification(
  p_lenser_id  UUID,
  p_type       TEXT,
  p_title      TEXT,
  p_body       TEXT       DEFAULT NULL,
  p_action_url TEXT       DEFAULT NULL,
  p_metadata   JSONB      DEFAULT '{}',
  p_actor_id   UUID       DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Recipient must exist
  IF NOT EXISTS (SELECT 1 FROM lensers.profiles WHERE id = p_lenser_id) THEN
    RETURN NULL;
  END IF;

  -- Privacy gate: only runs when an actor is identified
  IF p_actor_id IS NOT NULL THEN
    IF NOT public.fn_should_send_notification(p_lenser_id, p_actor_id, p_type) THEN
      RETURN NULL;
    END IF;
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


-- ─── 6. fn_get_notification_preferences ──────────────────────────────────────
-- Client-facing RPC: returns all preference rows for the current user.

CREATE OR REPLACE FUNCTION public.fn_get_notification_preferences()
RETURNS TABLE (
  notification_type TEXT,
  enabled           BOOLEAN,
  updated_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
BEGIN
  RETURN QUERY
    SELECT np.notification_type, np.enabled, np.updated_at
    FROM   public.notification_preferences np
    WHERE  np.lenser_id = v_lenser_id
    ORDER  BY np.notification_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_notification_preferences() TO authenticated;


-- ─── 7. fn_upsert_notification_preference ────────────────────────────────────
-- Client-facing RPC: toggle a notification type on/off for the current user.

CREATE OR REPLACE FUNCTION public.fn_upsert_notification_preference(
  p_type    TEXT,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
BEGIN
  INSERT INTO public.notification_preferences (lenser_id, notification_type, enabled)
  VALUES (lensers.get_auth_lenser_id(), p_type, p_enabled)
  ON CONFLICT (lenser_id, notification_type)
  DO UPDATE SET enabled = p_enabled, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_notification_preference(TEXT, BOOLEAN) TO authenticated;
