-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 61_webhook_outbox_drain.sql — Phase BV / O1
--
-- audit.fn_dispatch_webhook_outbox is the cron-driven dispatcher that drains
-- audit.webhook_outbox. Limited Beta sign-off needs three checkpoints:
--
--   1. Enqueue: an INSERT into audit.webhook_outbox lands in the queue with
--      delivered_at IS NULL and dead_lettered_at IS NULL.
--   2. Dispatcher exists with the expected signature.
--   3. Dispatch is idempotent against an empty queue (returns 0).
--
-- We do NOT POST a real webhook here — pg_net side effects make the test
-- order-dependent and break BEGIN..ROLLBACK isolation. The pg_net code path is
-- exercised in the smoke step (`scripts/smoke.sh` step 14).
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- Test 1: enqueue an outbox row ──────────────────────────────────────────────
INSERT INTO audit.webhook_outbox (event_type, payload, target_url)
VALUES ('bv.outbox.test', '{"k":"v"}'::jsonb, 'https://example.test/webhook/bv')
RETURNING id;

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit.webhook_outbox
     WHERE event_type = 'bv.outbox.test'
       AND delivered_at IS NULL
       AND dead_lettered_at IS NULL
  ),
  'outbox row is enqueued (pending state)'
);

-- Test 2: dispatcher exists with the expected signature ─────────────────────
SELECT has_function(
  'audit',
  'fn_dispatch_webhook_outbox',
  ARRAY['integer'],
  'audit.fn_dispatch_webhook_outbox(integer) exists'
);

-- Test 3: dispatch over an empty (no-pending) range returns 0 ───────────────
-- We simulate "no pending" by marking the row delivered first.
UPDATE audit.webhook_outbox
   SET delivered_at = now()
 WHERE event_type = 'bv.outbox.test';

SELECT is(
  audit.fn_dispatch_webhook_outbox(50),
  0,
  'dispatcher returns 0 when no rows are pending'
);

SELECT * FROM finish();
ROLLBACK;
