-- Phase O1: Moderation flagged webhook
--
-- When a row is INSERTed into `audit.moderation_decisions` with
-- `decision_type='flagged'`, POST a `webhook_version=1` payload to
-- `app.moderation_webhook_url` so external operators can react in
-- near-real-time (page on-call, fan-out to Slack, etc.).
--
-- Delivery semantics
--   * Best-effort, single-attempt, fire-and-forget via pg_net.
--   * No-op when pg_net is missing or the URL GUC is unset.
--   * The trigger NEVER blocks the INSERT — exceptions are warned and swallowed.
--
-- Configuration
--   ALTER DATABASE postgres SET app.moderation_webhook_url = 'https://example.com/moderation';
--
-- Payload
--   {
--     "webhook_version": 1,
--     "event": "moderation_flagged",
--     "decision_id":            "<uuid>",
--     "target_entity_schema":   "battles",
--     "target_entity_table":    "submissions",
--     "target_entity_id":       "<uuid>",
--     "decision_type":          "flagged",
--     "reason":                 "<text|null>",
--     "is_ai_moderated":        true,
--     "ai_confidence":          0.91,
--     "moderator_lenser_id":    "<uuid|null>",
--     "occurred_at":            "<iso8601>",
--     "battle_id":              "<uuid|null>",
--     "submission_id":          "<uuid|null>"
--   }

CREATE OR REPLACE FUNCTION audit.fn_notify_moderation_flagged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_url     text;
  v_payload jsonb;
BEGIN
  IF NEW.decision_type IS DISTINCT FROM 'flagged' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN NEW;
  END IF;

  v_url := NULLIF(current_setting('app.moderation_webhook_url', true), '');
  IF v_url IS NULL THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'webhook_version',       1,
    'event',                 'moderation_flagged',
    'decision_id',           NEW.id,
    'target_entity_schema',  NEW.target_entity_schema,
    'target_entity_table',   NEW.target_entity_table,
    'target_entity_id',      NEW.target_entity_id,
    'decision_type',         NEW.decision_type,
    'reason',                NEW.reason,
    'is_ai_moderated',       NEW.is_ai_moderated,
    'ai_confidence',         NEW.ai_confidence,
    'moderator_lenser_id',   NEW.moderator_lenser_id,
    'occurred_at',           to_char(NEW.occurred_at AT TIME ZONE 'UTC',
                                     'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'battle_id',             CASE
                               WHEN NEW.target_entity_schema = 'battles'
                                AND NEW.target_entity_table  = 'battles'
                               THEN NEW.target_entity_id
                               ELSE NULL
                             END,
    'submission_id',         CASE
                               WHEN NEW.target_entity_schema = 'battles'
                                AND NEW.target_entity_table  IN ('contenders', 'submissions')
                               THEN NEW.target_entity_id
                               ELSE NULL
                             END
  );

  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',           'application/json',
        'X-Lenserfight-Webhook',  'moderation_flagged',
        'X-Lenserfight-Version',  '1'
      ),
      body    := v_payload,
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_moderation_flagged: pg_net failed for decision %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION audit.fn_notify_moderation_flagged() OWNER TO postgres;

COMMENT ON FUNCTION audit.fn_notify_moderation_flagged() IS
  'Phase O1: AFTER INSERT trigger on audit.moderation_decisions. POSTs a '
  'webhook_version=1 payload to app.moderation_webhook_url when '
  'decision_type=flagged. Best-effort via pg_net; never blocks the INSERT.';

DROP TRIGGER IF EXISTS trg_moderation_decisions_flagged_webhook ON audit.moderation_decisions;

CREATE TRIGGER trg_moderation_decisions_flagged_webhook
  AFTER INSERT ON audit.moderation_decisions
  FOR EACH ROW
  WHEN (NEW.decision_type = 'flagged')
  EXECUTE FUNCTION audit.fn_notify_moderation_flagged();
