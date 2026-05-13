-- Notification System Expansion — Schema Additions
-- Adds 13 new notification types, a per-user notification_preferences table,
-- a notification_aggregates deduplication table, and is_featured/featured_at
-- columns on lenses.lenses for the lens_featured trigger.
--
-- GRASP: Schema-only DDL. No functions. No triggers.

-- ─── 1. Extend notifications CHECK constraint ─────────────────────────────────
-- Drop and recreate to include 13 new domain types.
-- NOTE: Takes ACCESS EXCLUSIVE lock on public.notifications — apply during
-- low-traffic window.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Battle (shared human + AI)
    'battle_result',
    'battle_started',
    'vote_reminder',
    -- Battle (Phase BF — template-sourced battles)
    'template_battle_open',
    'template_battle_published',
    -- Battle (human-specific)
    'vote_received',
    -- Battle (AI lenser-specific)
    'battle_assigned',
    'battle_vote_cast',
    -- Battle (new — phase CN)
    'battle_joined',
    'battle_won',
    'battle_lost',
    'battle_comment',
    -- Social (human)
    'follow_new',
    'follow_request',
    'follow_accepted',
    -- Content (human)
    'lens_reaction',
    'lens_comment',
    -- Content (new — phase CN)
    'lens_published',
    'lens_forked',
    'lens_featured',
    'lens_milestone',
    'workflow_published',
    'workflow_forked',
    -- Agent ownership (human owner of AI lenser)
    'agent_update',
    'agent_cron_result',
    'agent_critical',
    -- Agent (new — phase CN)
    'agent_created',
    'agent_battle_won',
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
    'leaderboard_change',
    'system'
  ));


-- ─── 2. notification_preferences ─────────────────────────────────────────────
-- Per-user, per-type opt-out table.
-- Indexed for efficient lookup inside the fn_should_send_notification gate.
-- No DELETE policy: set enabled = false to mute a type.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id         UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  notification_type TEXT        NOT NULL,
  enabled           BOOLEAN     NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lenser_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_lenser
  ON public.notification_preferences (lenser_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_owner_select"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (lenser_id = lensers.get_auth_lenser_id());

CREATE POLICY "notif_prefs_owner_insert"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (lenser_id = lensers.get_auth_lenser_id());

CREATE POLICY "notif_prefs_owner_update"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING  (lenser_id = lensers.get_auth_lenser_id())
  WITH CHECK (lenser_id = lensers.get_auth_lenser_id());


-- ─── 3. notification_aggregates ──────────────────────────────────────────────
-- Deduplication/cooldown window tracking for high-volume events.
-- Records open windows; trigger checks for an open window before inserting
-- a new notification. service_role only — never exposed to clients.

CREATE TABLE IF NOT EXISTS public.notification_aggregates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  notification_type TEXT        NOT NULL,
  entity_id         UUID        NOT NULL,
  window_start      TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end        TIMESTAMPTZ NOT NULL,
  actor_ids         UUID[]      NOT NULL DEFAULT '{}',
  notification_id   UUID        REFERENCES public.notifications(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, notification_type, entity_id, window_start)
);

-- Partial index on window_end would need now() (STABLE, not IMMUTABLE) — not allowed
-- in index predicates. Full index covers all rows; the query planner filters expired
-- windows efficiently since active windows are a tiny fraction of total rows.
CREATE INDEX IF NOT EXISTS idx_notif_agg_open
  ON public.notification_aggregates (recipient_id, notification_type, entity_id, window_end);

ALTER TABLE public.notification_aggregates ENABLE ROW LEVEL SECURITY;

-- Only SECURITY DEFINER functions touch this table — no client-facing policies.


-- ─── 4. lenses.lenses — is_featured / featured_at ────────────────────────────
-- Required by the trg_notify_lens_featured trigger (migration 20271211).

ALTER TABLE lenses.lenses
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN     NOT NULL DEFAULT false;

ALTER TABLE lenses.lenses
  ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lenses_featured
  ON lenses.lenses (is_featured)
  WHERE is_featured = true;
