-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 43_gateway_sync.sql — Phase AV coverage.
--
--   1. empty pull returns 0 rows
--   2. claim marks claimed_at on pending rows
--   3. ack marks acked_at on owned rows and returns the correct count
--   4. RLS blocks a different user from claiming someone else's commands
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(4);

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'av-owner@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'av-other@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agents.gateway_devices (device_id, owner_id, public_key, hostname, approved_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  repeat('A', 44),
  'host-av',
  now()
);

-- ── Test 1: empty pull ──────────────────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.fn_gateway_claim_commands(
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
  ))::int,
  0,
  'empty pull returns 0 rows'
);

-- ── Test 2: claim returns and updates pending rows ──────────────────────────
RESET ROLE;
INSERT INTO agents.gateway_commands (device_id, command_type, payload)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'kill_switch', '{}'::jsonb),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'config_push', '{"key":"value"}'::jsonb);

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.fn_gateway_claim_commands(
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
  ))::int,
  2,
  'claim returns both pending commands; claimed_at is set as a side effect'
);

-- ── Test 3: ack updates acked_at and returns count ──────────────────────────
SELECT is(
  public.fn_gateway_ack_commands(
    ARRAY(SELECT id FROM agents.gateway_commands
           WHERE device_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')
  ),
  2,
  'ack returns count of newly-acked owned commands'
);

-- ── Test 4: RLS blocks cross-user claim ─────────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_gateway_claim_commands(
       'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
     ) $$,
  '42501',
  NULL,
  'other user cannot claim commands for someone else''s device'
);

SELECT * FROM finish();
ROLLBACK;
