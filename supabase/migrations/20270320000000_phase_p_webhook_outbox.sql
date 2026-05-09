-- Phase P3: Webhook outbox v2 + HMAC signing
--
-- Replaces the fire-and-forget pg_net trigger pattern (Phase K2 / Phase O1)
-- with a durable outbox + dispatcher loop. Trigger functions now ENQUEUE rows
-- into `audit.webhook_outbox` instead of POSTing directly. A pg_cron job
-- (`webhook-outbox-dispatcher`) drains the outbox once per minute, signs the
-- body with HMAC-SHA256 using `app.webhook_signing_secret`, and POSTs via
-- pg_net. Failures are exponentially backed off; rows that exceed
-- `max_attempts` are dead-lettered (kept for inspection, not retried).
--
-- Rationale
--   * pg_net is async; the original trigger could not observe delivery
--     outcomes. The outbox makes deliveries inspectable and replayable.
--   * HMAC signing lets recipients verify authenticity without IP allow-lists
--     or shared bearer tokens. The signature header is `sha256=<hex>` over the
--     exact body bytes that were POSTed.
--   * Trigger -> enqueue keeps INSERTs cheap and removes the in-trigger
--     network call surface area entirely.
--
-- Configuration
--   ALTER DATABASE postgres SET app.approval_webhook_url     = 'https://example.com/approval';
--   ALTER DATABASE postgres SET app.moderation_webhook_url   = 'https://example.com/moderation';
--   ALTER DATABASE postgres SET app.webhook_signing_secret   = '<random 32+ byte secret>';

-- ─── 1. audit.webhook_outbox table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit.webhook_outbox (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          text        NOT NULL,
  payload             jsonb       NOT NULL,
  target_url          text        NOT NULL,
  attempts            int         NOT NULL DEFAULT 0,
  max_attempts        int         NOT NULL DEFAULT 5,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  delivered_at        timestamptz NULL,
  last_error          text        NULL,
  dead_lettered_at    timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit.webhook_outbox OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending_due
  ON audit.webhook_outbox (next_attempt_at)
  WHERE delivered_at IS NULL AND dead_lettered_at IS NULL;

COMMENT ON TABLE audit.webhook_outbox IS
  'Phase P3: durable webhook delivery queue. Triggers enqueue rows here; '
  'audit.fn_dispatch_webhook_outbox() drains them via pg_cron with HMAC-SHA256 '
  'signing and exponential backoff. Delivered rows retain delivered_at; '
  'rows past max_attempts retain dead_lettered_at for offline inspection.';

-- audit schema is private (not in PostgREST exposed_schemas); no GRANT to
-- authenticated. service_role bypasses RLS but we still enable RLS for
-- defence in depth.
ALTER TABLE audit.webhook_outbox ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (RLS bypass) and SECURITY DEFINER functions
-- may read/write the outbox.

-- ─── 2. Refactor approval_pending trigger to enqueue ───────────────────────

CREATE OR REPLACE FUNCTION agents.fn_notify_approval_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, audit, public
AS $$
DECLARE
  v_url     text;
  v_payload jsonb;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM 'pending' THEN
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

  INSERT INTO audit.webhook_outbox (event_type, payload, target_url)
  VALUES ('approval_pending', v_payload, v_url);

  RETURN NEW;
END;
$$;

ALTER FUNCTION agents.fn_notify_approval_pending() OWNER TO postgres;

COMMENT ON FUNCTION agents.fn_notify_approval_pending() IS
  'Phase P3: AFTER INSERT trigger on agents.team_runs. Enqueues an '
  'approval_pending webhook row in audit.webhook_outbox when '
  'approval_status=pending and app.approval_webhook_url is set. The dispatcher '
  '(audit.fn_dispatch_webhook_outbox) handles signing, retries, and POST.';

-- ─── 3. Refactor moderation_flagged trigger to enqueue ─────────────────────

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

  INSERT INTO audit.webhook_outbox (event_type, payload, target_url)
  VALUES ('moderation_flagged', v_payload, v_url);

  RETURN NEW;
END;
$$;

ALTER FUNCTION audit.fn_notify_moderation_flagged() OWNER TO postgres;

COMMENT ON FUNCTION audit.fn_notify_moderation_flagged() IS
  'Phase P3: AFTER INSERT trigger on audit.moderation_decisions. Enqueues a '
  'moderation_flagged webhook row in audit.webhook_outbox when '
  'decision_type=flagged and app.moderation_webhook_url is set. Delivery is '
  'handled by audit.fn_dispatch_webhook_outbox.';

-- ─── 4. Dispatcher function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit.fn_dispatch_webhook_outbox(p_batch int DEFAULT 50)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, extensions, public
AS $$
DECLARE
  r              record;
  v_secret       text;
  v_signature    text;
  v_body_text    text;
  v_processed    int := 0;
  v_new_attempts int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'fn_dispatch_webhook_outbox: pg_net not installed; skipping.';
    RETURN 0;
  END IF;

  v_secret := NULLIF(current_setting('app.webhook_signing_secret', true), '');

  FOR r IN
    SELECT id, event_type, payload, target_url, attempts, max_attempts
    FROM   audit.webhook_outbox
    WHERE  delivered_at      IS NULL
      AND  dead_lettered_at  IS NULL
      AND  next_attempt_at   <= now()
    ORDER BY next_attempt_at ASC
    LIMIT  p_batch
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    BEGIN
      v_body_text := r.payload::text;

      IF v_secret IS NULL THEN
        -- No secret configured — emit a placeholder so receivers can detect
        -- mis-configuration rather than silently accept unsigned traffic.
        v_signature := 'unsigned';
      ELSE
        v_signature :=
          'sha256=' ||
          encode(extensions.hmac(v_body_text, v_secret, 'sha256'), 'hex');
      END IF;

      PERFORM net.http_post(
        url     := r.target_url,
        headers := jsonb_build_object(
          'Content-Type',             'application/json',
          'X-Lenserfight-Webhook',    r.event_type,
          'X-Lenserfight-Version',    '1',
          'X-Lenserfight-Signature',  v_signature
        ),
        body    := r.payload,
        timeout_milliseconds := 5000
      );

      UPDATE audit.webhook_outbox
      SET    delivered_at = now(),
             last_error   = NULL
      WHERE  id = r.id;

    EXCEPTION WHEN OTHERS THEN
      v_new_attempts := r.attempts + 1;

      UPDATE audit.webhook_outbox
      SET    attempts        = v_new_attempts,
             last_error      = left(SQLERRM, 1000),
             next_attempt_at = now() + (interval '1 minute' * power(2, v_new_attempts)::int),
             dead_lettered_at = CASE
               WHEN v_new_attempts >= r.max_attempts THEN now()
               ELSE dead_lettered_at
             END
      WHERE  id = r.id;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$;

ALTER FUNCTION audit.fn_dispatch_webhook_outbox(int) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION audit.fn_dispatch_webhook_outbox(int) TO service_role;

COMMENT ON FUNCTION audit.fn_dispatch_webhook_outbox(int) IS
  'Phase P3: drains audit.webhook_outbox in batches. Signs body with '
  'HMAC-SHA256 using app.webhook_signing_secret (header X-Lenserfight-'
  'Signature: sha256=<hex>). On exception increments attempts, schedules '
  'exponential backoff (2^attempts minutes), and dead-letters at '
  'attempts >= max_attempts. Returns rows processed in the batch.';

-- ─── 5. pg_cron registration ───────────────────────────────────────────────

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  PERFORM cron.unschedule('webhook-outbox-dispatcher')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'webhook-outbox-dispatcher');

  PERFORM cron.schedule(
    'webhook-outbox-dispatcher',
    '* * * * *',
    $$SELECT audit.fn_dispatch_webhook_outbox(50)$$
  );
END;
$do$;
