-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 49_gateway_sync_signed.sql — Phase BG coverage.
--
--   1. fn_gateway_claim_commands_v2 returns the envelope_sig column
--   2. service_role can insert a command without an envelope_sig (legacy path)
--   3. a command inserted with envelope_sig survives the claim round-trip
--
-- Rolled back at end.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-b901-aaaa-aaaa-aaaaaaaaaaaa', 'bg-owner@test.local')
ON CONFLICT (id) DO NOTHING;

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-b901-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT public.fn_gateway_heartbeat(
  'cccccccc-b901-cccc-cccc-cccccccccccc'::uuid,
  repeat('A', 44),
  'host-bg',
  'lf-gatewayd/0.1.0'
);

-- ── Test 1: unsigned command can be inserted, claim returns envelope_sig col
RESET ROLE;
INSERT INTO agents.gateway_commands (device_id, command_type, payload)
VALUES ('cccccccc-b901-cccc-cccc-cccccccccccc'::uuid, 'noop', '{}'::jsonb);

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-b901-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT envelope_sig
     FROM public.fn_gateway_claim_commands_v2(
       'cccccccc-b901-cccc-cccc-cccccccccccc'::uuid, 5
     )
   LIMIT 1)::text,
  NULL,
  'v2 claim returns envelope_sig column (NULL for unsigned legacy command)'
);

-- ── Test 2: service_role can insert a command without sig ───────────────────
RESET ROLE;
SELECT lives_ok(
  $$ INSERT INTO agents.gateway_commands (device_id, command_type, payload)
     VALUES ('cccccccc-b901-cccc-cccc-cccccccccccc'::uuid, 'config_push', '{"k":"v"}'::jsonb) $$,
  'service_role inserts unsigned commands as before (CHECK is permissive)'
);

-- ── Test 3: signed command survives the round-trip ──────────────────────────
INSERT INTO agents.gateway_commands (device_id, command_type, payload, envelope_sig, envelope_nonce)
VALUES (
  'cccccccc-b901-cccc-cccc-cccccccccccc'::uuid,
  'noop',
  '{"why":"signed"}'::jsonb,
  repeat('S', 86),
  repeat('N', 22)
);

SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-b901-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT envelope_sig
     FROM public.fn_gateway_claim_commands_v2(
       'cccccccc-b901-cccc-cccc-cccccccccccc'::uuid, 50
     )
    WHERE command_type = 'noop'
      AND payload @> '{"why":"signed"}'::jsonb
    LIMIT 1),
  repeat('S', 86),
  'signed command surfaces its envelope_sig through the v2 claim'
);

SELECT * FROM finish();
ROLLBACK;
