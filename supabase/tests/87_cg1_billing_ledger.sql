-- =============================================================================
-- pgTAP — Phase CG1: billing schema + ledger hash chain + immutability
-- plan(15): schema/RLS surface, hash-chain trigger, append-only enforcement
-- =============================================================================
BEGIN;

SELECT plan(15);

-- 1. billing.runtime_settings singleton row exists
SELECT ok(
  (SELECT count(*) = 1 FROM billing.runtime_settings WHERE id = 1),
  'billing.runtime_settings singleton row (id=1) exists'
);

-- 2. New billing tables exist
SELECT ok(
  EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'billing' AND c.relname = 'pricing_snapshots'),
  'billing.pricing_snapshots table exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'billing' AND c.relname = 'cost_reservations'),
  'billing.cost_reservations table exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'billing' AND c.relname = 'ledger_entries'),
  'billing.ledger_entries table exists'
);

-- 3. RLS is enabled on all CG1 tables
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'billing' AND c.relname = 'cost_reservations'),
  'billing.cost_reservations has RLS enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'billing' AND c.relname = 'ledger_entries'),
  'billing.ledger_entries has RLS enabled'
);

-- 4. anon cannot read CG1 tables
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM billing.cost_reservations$$,
  '42501', NULL,
  'anon cannot SELECT from billing.cost_reservations'
);

SELECT throws_ok(
  $$SELECT count(*) FROM billing.ledger_entries$$,
  '42501', NULL,
  'anon cannot SELECT from billing.ledger_entries'
);

SELECT throws_ok(
  $$SELECT count(*) FROM billing.pricing_snapshots$$,
  '42501', NULL,
  'anon cannot SELECT from billing.pricing_snapshots'
);

RESET ROLE;

-- 5. Hash chain + immutability — bootstrap fixtures + insert ledger rows.
-- Stay on the default test role (postgres) so we have USAGE on every schema.

DO $cg1$
DECLARE
  v_model_id     uuid;
  v_pricing_id   uuid;
  v_snap_id      uuid;
  v_lenser_id    uuid;
  v_profile_id   uuid;
  v_user_id      uuid;
  v_res_id       uuid;
BEGIN
  -- Synthesize a model + pricing if none exists (test in isolation)
  SELECT id INTO v_model_id FROM ai.models LIMIT 1;
  IF v_model_id IS NULL THEN
    INSERT INTO ai.providers (key, display_name) VALUES ('cg1-test', 'CG1 Test')
      ON CONFLICT (key) DO NOTHING;
    INSERT INTO ai.models (name, key, provider_id)
    SELECT 'cg1-test-model', 'cg1-test-model', id FROM ai.providers WHERE key = 'cg1-test'
    RETURNING id INTO v_model_id;
  END IF;

  SELECT id INTO v_pricing_id FROM ai.model_pricing WHERE model_id = v_model_id LIMIT 1;
  IF v_pricing_id IS NULL THEN
    INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens, effective_from)
    VALUES (v_model_id, 0.001, 0.002, now() - interval '1 hour')
    RETURNING id INTO v_pricing_id;
  END IF;

  -- A test lenser + ai_lenser
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email) VALUES (v_user_id, format('cg1-%s@test.local', v_user_id))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
    VALUES (gen_random_uuid(), v_user_id, format('cg1_%s', substr(v_user_id::text, 1, 8)),
            'CG1 Test', 'human')
    RETURNING id INTO v_profile_id;
  INSERT INTO agents.ai_lensers (id, profile_id) VALUES (gen_random_uuid(), v_profile_id)
    RETURNING id INTO v_lenser_id;

  INSERT INTO billing.pricing_snapshots (
    model_id, source_pricing_id, unit_type, input_cpm_usd, output_cpm_usd, credit_rate_usd
  )
  VALUES (v_model_id, v_pricing_id, 'tokens', 0.001, 0.002, 0.001)
  RETURNING id INTO v_snap_id;

  INSERT INTO billing.cost_reservations (
    ai_lenser_id, model_id, provider_key, pricing_snapshot_id,
    reserved_credits, reserved_usd, idempotency_key, held_until
  )
  VALUES (
    v_lenser_id, v_model_id, 'openai', v_snap_id,
    10, 0.01, 'cg1-test-' || gen_random_uuid()::text, now() + interval '5 minutes'
  )
  RETURNING id INTO v_res_id;

  INSERT INTO billing.ledger_entries (reservation_id, ai_lenser_id, direction, amount_credits, amount_usd)
  VALUES (v_res_id, v_lenser_id, 'debit_hold', 10, 0.01);

  INSERT INTO billing.ledger_entries (reservation_id, ai_lenser_id, direction, amount_credits, amount_usd)
  VALUES (v_res_id, v_lenser_id, 'debit_commit', 8, 0.008);

  -- Stash for later checks
  PERFORM set_config('cg1.test_res_id', v_res_id::text, true);
END
$cg1$;

-- 6. First ledger entry has NULL prev_hash; second pins it
SELECT is(
  (SELECT prev_hash IS NULL FROM billing.ledger_entries
   WHERE reservation_id = current_setting('cg1.test_res_id')::uuid
   ORDER BY id ASC LIMIT 1),
  true,
  'first ledger entry in a chain has NULL prev_hash'
);

SELECT is(
  (SELECT prev_hash IS NOT NULL FROM billing.ledger_entries
   WHERE reservation_id = current_setting('cg1.test_res_id')::uuid
   ORDER BY id DESC LIMIT 1),
  true,
  'second ledger entry pins prev_hash to first entry'
);

-- 7. entry_hash never NULL, length 32 bytes (sha256)
SELECT is(
  (SELECT bool_and(entry_hash IS NOT NULL AND octet_length(entry_hash) = 32)
     FROM billing.ledger_entries
    WHERE reservation_id = current_setting('cg1.test_res_id')::uuid),
  true,
  'every ledger entry has a 32-byte sha256 entry_hash'
);

-- 8. UPDATE on ledger_entries is blocked
SELECT throws_ok(
  $$UPDATE billing.ledger_entries SET amount_credits = 999
    WHERE reservation_id = current_setting('cg1.test_res_id')::uuid$$,
  'P0001', NULL,
  'UPDATE on billing.ledger_entries is rejected'
);

-- 9. DELETE on ledger_entries is blocked
SELECT throws_ok(
  $$DELETE FROM billing.ledger_entries
    WHERE reservation_id = current_setting('cg1.test_res_id')::uuid$$,
  'P0001', NULL,
  'DELETE on billing.ledger_entries is rejected'
);

-- 10. Hash-chain integrity: recomputing the chain reproduces stored hashes
DO $verify$
DECLARE
  v_prev    bytea;
  v_canon   text;
  v_calc    bytea;
  v_stored  bytea;
  v_row     record;
  v_ok      boolean := true;
BEGIN
  v_prev := NULL;
  FOR v_row IN
    SELECT id, reservation_id, direction, amount_credits, amount_usd, recorded_at, prev_hash, entry_hash
    FROM   billing.ledger_entries
    WHERE  reservation_id = current_setting('cg1.test_res_id')::uuid
    ORDER  BY id ASC
  LOOP
    v_canon := jsonb_build_object(
      'reservation_id', v_row.reservation_id,
      'direction',      v_row.direction,
      'amount_credits', v_row.amount_credits::text,
      'amount_usd',     v_row.amount_usd::text,
      'recorded_at',    extract(epoch from v_row.recorded_at)::text
    )::text;
    v_calc := extensions.digest(COALESCE(v_prev, ''::bytea) || convert_to(v_canon, 'UTF8'), 'sha256');
    IF v_calc <> v_row.entry_hash OR COALESCE(v_row.prev_hash, ''::bytea) <> COALESCE(v_prev, ''::bytea) THEN
      v_ok := false;
      EXIT;
    END IF;
    v_prev := v_row.entry_hash;
  END LOOP;
  PERFORM set_config('cg1.hash_ok', v_ok::text, true);
END
$verify$;

SELECT is(current_setting('cg1.hash_ok'), 'true', 'ledger hash chain reconciles end-to-end');

SELECT finish();
ROLLBACK;
