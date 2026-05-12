-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 47_gateway_device_health.sql — Phase BE coverage.
--
--   1. fn_get_gateway_device_health returns only the caller's devices
--   2. pending_commands count reflects unclaimed gateway_commands rows
--   3. cross-user call returns 0 rows
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-be01-aaaa-aaaa-aaaaaaaaaaaa', 'be-owner@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-be01-bbbb-bbbb-bbbbbbbbbbbb', 'be-other@test.local')
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-be01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT public.fn_gateway_heartbeat(
  'cccccccc-be01-cccc-cccc-cccccccccccc'::uuid,
  repeat('A', 44),
  'host-be',
  'lf-gatewayd/0.1.0'
);

-- Add 3 pending commands to the owner's device (service_role inserts).
RESET ROLE;
INSERT INTO agents.gateway_commands (device_id, command_type, payload)
SELECT 'cccccccc-be01-cccc-cccc-cccccccccccc'::uuid, 'noop', '{}'::jsonb
FROM generate_series(1, 3);

-- ── Test 1: owner sees their device ─────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-be01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.fn_get_gateway_device_health()),
  1,
  'owner sees exactly their one device row'
);

-- ── Test 2: pending_commands matches inserted count ─────────────────────────
SELECT is(
  (SELECT pending_commands::int
     FROM public.fn_get_gateway_device_health()
    WHERE device_id = 'cccccccc-be01-cccc-cccc-cccccccccccc'::uuid),
  3,
  'pending_commands reflects unclaimed gateway_commands inserted'
);

-- ── Test 3: other user sees nothing ─────────────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-be01-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.fn_get_gateway_device_health()),
  0,
  'unrelated user sees zero rows'
);

SELECT * FROM finish();
ROLLBACK;
