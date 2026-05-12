-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 44_gateway_device_management.sql — Phase BB coverage.
--
--   1. fn_gateway_approve_device sets approved_at non-null
--   2. fn_gateway_revoke_device sets kill_switch = true
--   3. fn_list_gateway_devices returns only the caller's rows
--   4. cross-user approve throws 42501 (device_not_owned)
--   5. cross-user revoke throws 42501 (device_not_owned)
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-bb01-aaaa-aaaa-aaaaaaaaaaaa', 'bb-owner@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bb01-bbbb-bbbb-bbbbbbbbbbbb', 'bb-other@test.local')
ON CONFLICT (id) DO NOTHING;

-- Owner registers their device via heartbeat.
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bb01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT public.fn_gateway_heartbeat(
  'cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid,
  repeat('A', 44),
  'host-bb-owner',
  'lf-gatewayd/0.1.0'
);

-- A second device belonging to the other user (so the list test is meaningful).
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bb01-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT public.fn_gateway_heartbeat(
  'cccccccc-bb02-cccc-cccc-cccccccccccc'::uuid,
  repeat('B', 44),
  'host-bb-other',
  'lf-gatewayd/0.1.0'
);

-- Back to the owner for the actual assertions.
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-bb01-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- ── Test 1: approve sets approved_at non-null ───────────────────────────────
SELECT public.fn_gateway_approve_device('cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid);

SELECT isnt(
  (SELECT approved_at
     FROM agents.gateway_devices
    WHERE device_id = 'cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid)::text,
  NULL,
  'approve sets approved_at to a non-null timestamp'
);

-- ── Test 2: revoke sets kill_switch = true ──────────────────────────────────
SELECT public.fn_gateway_revoke_device('cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid);

SELECT is(
  (SELECT kill_switch
     FROM agents.gateway_devices
    WHERE device_id = 'cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid),
  true,
  'revoke flips kill_switch to true'
);

-- ── Test 3: list returns only own rows ──────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.fn_list_gateway_devices(50)),
  1,
  'list returns exactly the caller''s one device, not the other owner''s row'
);

-- ── Test 4: cross-user approve throws 42501 ─────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bb01-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_gateway_approve_device('cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid) $$,
  '42501',
  'device_not_owned',
  'approve raises 42501 for non-owner caller'
);

-- ── Test 5: cross-user revoke throws 42501 ──────────────────────────────────
SELECT throws_ok(
  $$ SELECT public.fn_gateway_revoke_device('cccccccc-bb01-cccc-cccc-cccccccccccc'::uuid) $$,
  '42501',
  'device_not_owned',
  'revoke raises 42501 for non-owner caller'
);

SELECT * FROM finish();
ROLLBACK;
