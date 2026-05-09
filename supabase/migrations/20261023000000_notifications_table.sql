-- Phase 18: Battle Result Broadcasting & Notification System
-- Creates the notifications table, RLS, realtime publication, and the
-- fn_notify_battle_result function called by fn_battles_publish_internal.

-- ─── 1. Notifications table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id   UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN (
                            'battle_result', 'battle_started', 'vote_reminder',
                            'badge_awarded', 'system'
                          )),
  title       TEXT        NOT NULL,
  body        TEXT,
  action_url  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_lenser_unread
  ON public.notifications (lenser_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_lenser_all
  ON public.notifications (lenser_id, created_at DESC);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Owners can read their own notifications
CREATE POLICY "notifications_owner_select"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (lenser_id = lensers.get_auth_lenser_id());

-- Owners can mark their own notifications as read (UPDATE read_at only)
CREATE POLICY "notifications_owner_update"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (lenser_id = lensers.get_auth_lenser_id())
  WITH CHECK (lenser_id = lensers.get_auth_lenser_id());

-- Only service_role can insert (fn_notify_battle_result is SECURITY DEFINER)
CREATE POLICY "notifications_service_insert"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Delete blocked for all roles (append-only)
-- (no DELETE policy = nobody can delete)

-- ─── 3. Realtime publication ─────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;

-- ─── 4. fn_notify_battle_result ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_notify_battle_result(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_battle       battles.battles;
  v_winner       battles.contenders;
  v_title_text   TEXT;
  v_body_text    TEXT;
  v_action_url   TEXT;
  v_lenser_ids   UUID[];
  v_email_payload JSONB;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Determine winner display name
  IF v_battle.winner_contender_id IS NOT NULL THEN
    SELECT * INTO v_winner
    FROM   battles.contenders
    WHERE  id = v_battle.winner_contender_id;
    v_body_text := 'Winner: ' || COALESCE(v_winner.display_name, 'Unknown');
  ELSE
    v_body_text := 'The battle ended in a draw.';
  END IF;

  v_title_text := 'Battle result: ' || v_battle.title;
  v_action_url := '/battles/' || v_battle.slug || '/result';

  -- Collect distinct lenser IDs: contenders (if they have a profile ref) + all voters
  SELECT array_agg(DISTINCT lenser_id) INTO v_lenser_ids
  FROM (
    -- Contenders with a profile reference
    SELECT cem.profile_id AS lenser_id
    FROM   battles.contenders c
    JOIN   battles.contender_entity_map cem ON cem.contender_id = c.id
    WHERE  c.battle_id = p_battle_id
    AND    cem.profile_id IS NOT NULL

    UNION

    -- Everyone who voted
    SELECT voter_lenser_id AS lenser_id
    FROM   battles.votes
    WHERE  battle_id = p_battle_id
    AND    voter_lenser_id IS NOT NULL
  ) all_lensers;

  IF v_lenser_ids IS NULL OR array_length(v_lenser_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Bulk-insert notifications
  INSERT INTO public.notifications (lenser_id, type, title, body, action_url, metadata)
  SELECT
    unnest(v_lenser_ids),
    'battle_result',
    v_title_text,
    v_body_text,
    v_action_url,
    jsonb_build_object(
      'battle_id',    p_battle_id,
      'battle_slug',  v_battle.slug,
      'winner_id',    v_battle.winner_contender_id,
      'winner_name',  COALESCE(v_winner.display_name, null)
    )
  ON CONFLICT DO NOTHING;

  -- Fire email edge function asynchronously via pg_net (if extension available)
  -- Collect recipient emails from lensers.profiles
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    SELECT jsonb_build_object(
      'battle_id',        p_battle_id,
      'battle_title',     v_battle.title,
      'battle_slug',      v_battle.slug,
      'winner_name',      COALESCE(v_winner.display_name, null),
      'recipient_emails', (
        SELECT jsonb_agg(email)
        FROM   lensers.profiles
        WHERE  id = ANY(v_lenser_ids)
        AND    email IS NOT NULL
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
  -- Notifications must never block the publish path
  RAISE WARNING 'fn_notify_battle_result failed for battle %: %', p_battle_id, SQLERRM;
END;
$$;

-- ─── 5. fn_mark_notifications_read ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mark_notifications_read(p_notification_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.notifications
  SET    read_at = now()
  WHERE  id = ANY(p_notification_ids)
  AND    lenser_id = lensers.get_auth_lenser_id()
  AND    read_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- ─── 6. fn_get_notifications ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_notifications(
  p_limit  INT       DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  type        TEXT,
  title       TEXT,
  body        TEXT,
  action_url  TEXT,
  metadata    JSONB,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_unread    BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_unread
  FROM   public.notifications AS _n
  WHERE  _n.lenser_id = v_lenser_id
  AND    _n.read_at IS NULL;

  RETURN QUERY
    SELECT
      n.id, n.type, n.title, n.body, n.action_url, n.metadata, n.read_at, n.created_at,
      v_unread
    FROM   public.notifications n
    WHERE  n.lenser_id = v_lenser_id
    AND    (p_cursor IS NULL OR n.created_at < p_cursor)
    ORDER  BY n.created_at DESC
    LIMIT  p_limit;
END;
$$;
