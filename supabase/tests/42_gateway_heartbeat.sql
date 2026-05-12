-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 42_gateway_heartbeat.sql — Phase AU coverage.
--
--   1. fn_gateway_heartbeat upserts a row on first call
--   2. repeated call updates last_seen_at without duplicating the row
--   3. kill_switch flag flows through to the returned JSON
--   4. RLS blocks cross-user SELECT
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(4);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'au-owner@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'au-other@test.local')
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- ── Test 1: first call upserts row ──────────────────────────────────────────
SELECT lives_ok(
  $$ SELECT public.fn_gateway_heartbeat(
       'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
       repeat('A', 44),
       'host-1',
       'lf-gatewayd/0.1.0'
     ) $$,
  'first heartbeat creates a gateway_devices row'
);

-- ── Test 2: repeated call refreshes last_seen_at, no duplicate ──────────────
RESET ROLE;
UPDATE agents.gateway_devices
   SET last_seen_at = now() - interval '1 hour'
 WHERE device_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT public.fn_gateway_heartbeat(
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  repeat('A', 44),
  'host-1',
  'lf-gatewayd/0.1.0'
);

RESET ROLE;
SELECT ok(
  (SELECT count(*) FROM agents.gateway_devices
    WHERE device_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 1
  AND
  (SELECT last_seen_at FROM agents.gateway_devices
    WHERE device_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') > now() - interval '1 minute',
  'repeated heartbeat updates last_seen_at without inserting a duplicate'
);

-- ── Test 3: kill_switch propagates ──────────────────────────────────────────
UPDATE agents.gateway_devices
   SET kill_switch = true
 WHERE device_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (public.fn_gateway_heartbeat(
     'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
     repeat('A', 44),
     'host-1',
     'lf-gatewayd/0.1.0'
   ))->>'kill_switch',
  'true',
  'kill_switch column surfaces in returned JSON'
);

-- ── Test 4: RLS blocks cross-user SELECT ────────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM agents.gateway_devices
    WHERE device_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')::int,
  0,
  'RLS hides the row from a different authenticated user'
);

SELECT * FROM finish();
ROLLBACK;
