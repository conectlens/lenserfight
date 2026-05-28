-- =============================================================================
-- pgTAP — Phase CG1: BYOK key resolution bound to a held reservation
-- plan(7): missing reservation rejected; bad agent/provider/model mismatch;
--          legacy resolve gated by byok_require_reservation flag
-- =============================================================================
BEGIN;

SELECT plan(7);

-- Bootstrap a model, pricing, ai_lenser, BYOK key, and one held reservation
DO $boot$
DECLARE
  v_model_id    uuid;
  v_pricing_id  uuid;
  v_lenser_id   uuid;
  v_profile_id  uuid;
  v_user_id     uuid := gen_random_uuid();
  v_snap_id     uuid;
  v_res_id      uuid;
  v_key_id      uuid;
BEGIN
  SELECT id INTO v_model_id FROM ai.models LIMIT 1;
  IF v_model_id IS NULL THEN
    INSERT INTO ai.providers (key, display_name) VALUES ('cg1-test', 'CG1 Test')
      ON CONFLICT (key) DO NOTHING;
    INSERT INTO ai.models (name, key, provider_id)
    SELECT 'cg1-byok-model', 'cg1-byok-model', id FROM ai.providers WHERE key = 'cg1-test'
    RETURNING id INTO v_model_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ai.model_pricing
    WHERE model_id = v_model_id AND effective_from <= now()
      AND (effective_to IS NULL OR effective_to > now())
  ) THEN
    INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens, effective_from)
    VALUES (v_model_id, 0.001, 0.002, now() - interval '1 hour');
  END IF;

  INSERT INTO auth.users (id, email) VALUES (v_user_id, format('cg1-byok-%s@test.local', v_user_id))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
    VALUES (gen_random_uuid(), v_user_id, format('cg1b_%s', substr(v_user_id::text, 1, 8)),
            'CG1 BYOK', 'human')
    RETURNING id INTO v_profile_id;
  INSERT INTO agents.ai_lensers (id, profile_id)
    VALUES (gen_random_uuid(), v_profile_id)
    RETURNING id INTO v_lenser_id;

  INSERT INTO execution.byok_keys (agent_id, provider, key_encrypted, key_hint)
  VALUES (v_lenser_id, 'openai', 'ENC::cg1-test-ciphertext', 'beef')
  RETURNING id INTO v_key_id;

  SELECT pricing_snapshot_id INTO v_snap_id
    FROM public.fn_cost_quote(v_model_id, 100, 50, 0);

  SELECT reservation_id INTO v_res_id
  FROM public.fn_cost_reserve(
    v_lenser_id, v_snap_id, 1, 0.001, 'openai',
    'cg1-byok-' || gen_random_uuid()::text, '{}'::jsonb, NULL, NULL, NULL
  );

  PERFORM set_config('cg1.byok_lenser', v_lenser_id::text, true);
  PERFORM set_config('cg1.byok_res',    v_res_id::text,    true);
  PERFORM set_config('cg1.byok_model',  v_model_id::text,  true);
END
$boot$;

-- 1. fn_byok_key_resolve_v2 with no reservation_id raises E_BYOK_CONTEXT_MISSING
SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve_v2(%L::uuid, 'openai', NULL, NULL)$t$,
         current_setting('cg1.byok_lenser')::uuid),
  'P0001', NULL,
  'fn_byok_key_resolve_v2 rejects calls without reservation_id'
);

-- 2. Random reservation_id is rejected as invalid
SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve_v2(%L::uuid, 'openai', NULL, '%s'::uuid)$t$,
         current_setting('cg1.byok_lenser')::uuid,
         gen_random_uuid()),
  'P0001', NULL,
  'fn_byok_key_resolve_v2 rejects an unknown reservation_id'
);

-- 3. Provider mismatch is rejected
SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve_v2(%L::uuid, 'anthropic', NULL, %L::uuid)$t$,
         current_setting('cg1.byok_lenser')::uuid,
         current_setting('cg1.byok_res')::uuid),
  'P0001', NULL,
  'fn_byok_key_resolve_v2 rejects a provider/reservation mismatch'
);

-- 4. Agent mismatch is rejected
SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve_v2('%s'::uuid, 'openai', NULL, %L::uuid)$t$,
         gen_random_uuid(),
         current_setting('cg1.byok_res')::uuid),
  'P0001', NULL,
  'fn_byok_key_resolve_v2 rejects an agent/reservation mismatch'
);

-- 5. Happy path: held reservation matches agent + provider; returns the ciphertext
SELECT is(
  (SELECT public.fn_byok_key_resolve_v2(
       current_setting('cg1.byok_lenser')::uuid,
       'openai', NULL,
       current_setting('cg1.byok_res')::uuid)),
  'ENC::cg1-test-ciphertext',
  'fn_byok_key_resolve_v2 returns the encrypted key under a valid reservation'
);

-- 6. After commit the reservation is no longer 'held' — resolve_v2 rejects it
SELECT public.fn_cost_commit(current_setting('cg1.byok_res')::uuid, 1, 0.001);

SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve_v2(%L::uuid, 'openai', NULL, %L::uuid)$t$,
         current_setting('cg1.byok_lenser')::uuid,
         current_setting('cg1.byok_res')::uuid),
  'P0001', NULL,
  'fn_byok_key_resolve_v2 refuses a committed reservation (no reuse after commit)'
);

-- 7. Legacy fn_byok_key_resolve raises when byok_require_reservation flag is on
UPDATE billing.runtime_settings SET byok_require_reservation = true WHERE id = 1;

SELECT throws_ok(
  format($t$SELECT public.fn_byok_key_resolve(%L::uuid, 'openai', NULL)$t$,
         current_setting('cg1.byok_lenser')::uuid),
  'P0001', NULL,
  'legacy fn_byok_key_resolve raises E_BYOK_CONTEXT_MISSING when require_reservation=true'
);

-- restore flag
UPDATE billing.runtime_settings SET byok_require_reservation = false WHERE id = 1;

SELECT finish();
ROLLBACK;
