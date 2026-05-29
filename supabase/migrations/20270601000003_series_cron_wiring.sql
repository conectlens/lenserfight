-- Phase CU · Series status notifications
-- AFTER UPDATE trigger on battles.series fires:
--   - 'agent_update' notification when current_round advances (no SERIES_ROUND_START
--     type exists in the constraint; reuse generic 'agent_update' with metadata
--     until a dedicated series-event type lands post-launch)
--   - 'agent_update' notification when status flips to 'complete'
-- Verified schema facts (from 20260519131536_remote_schema.sql):
--   battles.series: id, title, template_id, creator_lenser_id, round_count,
--                   current_round, status ('active'|'complete'), created_at, updated_at
--   notifications: id, lenser_id, type (CHECK ALLOWLIST), title, body, action_url,
--                  metadata jsonb, read_at, created_at
--   notifications.type CHECK includes 'agent_update', 'system' — both safe for series events.

BEGIN;

-- Expand notification type allowlist to include dedicated series events.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'battle_result','battle_started','vote_reminder','template_battle_open',
    'template_battle_published','vote_received','battle_assigned','battle_vote_cast',
    'battle_joined','battle_won','battle_lost','battle_comment',
    'follow_new','follow_request','follow_accepted',
    'lens_reaction','lens_comment','lens_published','lens_forked','lens_featured','lens_milestone',
    'workflow_published','workflow_forked',
    'agent_update','agent_cron_result','agent_critical','agent_created','agent_battle_won',
    'team_run_started','team_run_completed','team_run_failed',
    'cron_run_completed','cron_run_failed',
    'policy_updated','model_binding_changed','requirement_update',
    'badge_awarded','leaderboard_change','system',
    'series_round_start','series_complete'
  ]));

-- Trigger function: notify on status flip or round advance.
CREATE OR REPLACE FUNCTION battles.fn_notify_series_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles
AS $$
DECLARE
  v_metadata jsonb;
BEGIN
  -- Round advance: only when current_round increased.
  IF NEW.current_round > COALESCE(OLD.current_round, 0)
     AND NEW.status = 'active' THEN
    v_metadata := jsonb_build_object(
      'series_id',     NEW.id,
      'series_title',  NEW.title,
      'current_round', NEW.current_round,
      'round_count',   NEW.round_count
    );
    INSERT INTO public.notifications (lenser_id, type, title, body, metadata)
    VALUES (
      NEW.creator_lenser_id,
      'series_round_start',
      'Series round ' || NEW.current_round || ' started',
      NEW.title,
      v_metadata
    );
    PERFORM pg_notify('series_status_change', v_metadata::text);
  END IF;

  -- Series complete: status flipped from non-complete to complete.
  IF NEW.status = 'complete'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM 'complete' THEN
    v_metadata := jsonb_build_object(
      'series_id',    NEW.id,
      'series_title', NEW.title,
      'round_count',  NEW.round_count
    );
    INSERT INTO public.notifications (lenser_id, type, title, body, metadata)
    VALUES (
      NEW.creator_lenser_id,
      'series_complete',
      'Series complete: ' || NEW.title,
      'Final round (' || NEW.round_count || ') resolved.',
      v_metadata
    );
    PERFORM pg_notify('series_status_change', v_metadata::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_series_status_notify ON battles.series;
CREATE TRIGGER trg_series_status_notify
AFTER UPDATE ON battles.series
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  OR OLD.current_round IS DISTINCT FROM NEW.current_round
)
EXECUTE FUNCTION battles.fn_notify_series_status_change();

COMMENT ON FUNCTION battles.fn_notify_series_status_change() IS
  'Emits series_round_start / series_complete notifications. Fires from trg_series_status_notify on AFTER UPDATE.';

COMMIT;
