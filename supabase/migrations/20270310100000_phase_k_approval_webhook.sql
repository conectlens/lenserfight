-- Phase K2: Approval pending webhook
--
-- When a new `agents.team_runs` row is INSERTed with `approval_status='pending'`,
-- POST the request shape to `app.approval_webhook_url` so external operators
-- can react in near-real-time (Slack notifier, paging, custom dashboards).
--
-- Delivery semantics
--   * Best-effort. The authoritative state is the DB; the webhook is a courtesy.
--   * Fired from a row-level AFTER INSERT trigger using pg_net.http_post.
--   * Trigger is a no-op when:
--       - pg_net is not installed
--       - `app.approval_webhook_url` is unset/empty
--       - approval_status is not 'pending'
--   * No retries; pg_net captures the response asynchronously. Operators who
--     need at-least-once delivery should consume `agents.approval_requests_v`
--     directly and reconcile.
--
-- Design rationale
--   pg_net is the same mechanism the `vote-eligible-agents` cron uses
--   (20270203000000_battle_workflow_automation_crons.sql). It avoids the need
--   for a long-lived LISTEN connection in the platform-api worker (which
--   currently polls via RPCs only) and keeps the surface area DB-side.
--
-- Configuration
--   ALTER DATABASE postgres SET app.approval_webhook_url = 'https://example.com/hook';
--
-- Payload (webhook_version: 1)
--   {
--     "webhook_version": 1,
--     "event": "approval_pending",
--     "team_run_id":           "<uuid>",
--     "ai_lenser_id":          "<uuid>",
--     "team_id":               "<uuid|null>",
--     "workflow_id":           "<uuid|null>",
--     "workflow_run_id":       "<uuid|null>",
--     "workflow_assignment_id":"<uuid|null>",
--     "gate_kind":             "<string|null>",
--     "requested_action":      "<string|null>",
--     "pending_since":         "<iso8601>"
--   }

-- ─── 1. Trigger function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.fn_notify_approval_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_url      text;
  v_payload  jsonb;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN NEW;
  END IF;

  v_url := NULLIF(current_setting('app.approval_webhook_url', true), '');
  IF v_url IS NULL THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'webhook_version',         1,
    'event',                   'approval_pending',
    'team_run_id',             NEW.id,
    'ai_lenser_id',            NEW.ai_lenser_id,
    'team_id',                 NEW.team_id,
    'workflow_id',             NEW.workflow_id,
    'workflow_run_id',         NEW.workflow_run_id,
    'workflow_assignment_id',  NEW.workflow_assignment_id,
    'gate_kind',               NEW.metadata->>'gate_kind',
    'requested_action',        NEW.metadata->>'requested_action',
    'pending_since',           to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC',
                                       'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',           'application/json',
        'X-Lenserfight-Webhook',  'approval_pending',
        'X-Lenserfight-Version',  '1'
      ),
      body    := v_payload,
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Webhook delivery is best-effort; never block the INSERT.
    RAISE WARNING 'fn_notify_approval_pending: pg_net failed for team_run %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION agents.fn_notify_approval_pending() OWNER TO postgres;

COMMENT ON FUNCTION agents.fn_notify_approval_pending() IS
  'Phase K2: AFTER INSERT trigger on agents.team_runs. Fires a best-effort '
  'POST to app.approval_webhook_url (when set) with a webhook_version=1 '
  'payload describing the pending approval. Uses pg_net; never blocks.';

-- ─── 2. Trigger registration ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_team_runs_approval_pending_webhook ON agents.team_runs;

CREATE TRIGGER trg_team_runs_approval_pending_webhook
  AFTER INSERT ON agents.team_runs
  FOR EACH ROW
  WHEN (NEW.approval_status = 'pending')
  EXECUTE FUNCTION agents.fn_notify_approval_pending();
