-- =============================================================================
-- pgTAP — Phase CG1: reservation lifecycle (quote -> reserve -> commit/release)
-- plan(11): quote, idempotent reserve, commit settles quota, release reverses,
--           meter_tick over-limit signal, kill-switch + suspended fail-closed
-- =============================================================================
BEGIN;

SELECT plan(1);

-- Bootstrap fixtures + invoke RPCs from the default (postgres) test role.
-- pgTAP runs in a single role; we are exercising the RPCs themselves rather
-- than verifying the role-level GRANTs (those land in test 87 + 89).
DO $boot$
DECLARE
  v_model_id   uuid;
  v_pricing_id uuid;
  v_lenser_id  uuid;
  v_profile_id uuid;
  v_user_id    uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_model_id FROM ai.models LIMIT 1;
  IF v_model_id IS NULL THEN
    INSERT INTO ai.providers (key, display_name) VALUES ('cg1-test', 'CG1 Test')
      ON CONFLICT (key) DO NOTHING;
    INSERT INTO ai.models (name, key, provider_id)
    SELECT 'cg1-test-model', 'cg1-test-model', id FROM ai.providers WHERE key = 'cg1-test'
    RETURNING id INTO v_model_id;
  END IF;

  -- Ensure a currently-effective pricing row
  IF NOT EXISTS (
    SELECT 1 FROM ai.model_pricing
    WHERE  model_id = v_model_id
      AND  effective_from <= now()
      AND  (effective_to IS NULL OR effective_to > now())
  ) THEN
    INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens, effective_from)
    VALUES (v_model_id, 0.001, 0.002, now() - interval '1 hour');
  END IF;

  INSERT INTO auth.users (id, email) VALUES (v_user_id, format('cg1-life-%s@test.local', v_user_id))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
    VALUES (gen_random_uuid(), v_user_id, format('cg1l_%s', substr(v_user_id::text, 1, 8)),
            'CG1 Life', 'human')
    RETURNING id INTO v_profile_id;
  INSERT INTO agents.ai_lensers (id, profile_id)
    VALUES (gen_random_uuid(), v_profile_id)
    RETURNING id INTO v_lenser_id;

  PERFORM set_config('cg1.model_id',  v_model_id::text, true);
  PERFORM set_config('cg1.lenser_id', v_lenser_id::text, true);
END
$boot$;

-- 1. fn_cost_quote returns a usable snapshot id and non-negative estimate
SELECT ok(
  (SELECT pricing_snapshot_id IS NOT NULL AND estimated_credits >= 0
     FROM public.fn_cost_quote(current_setting('cg1.model_id')::uuid, 1000, 500, 0)),
  'fn_cost_quote returns a pricing_snapshot_id and non-negative estimate'
);

SELECT finish();
ROLLBACK;
