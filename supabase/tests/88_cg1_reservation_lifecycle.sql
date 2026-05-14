-- =============================================================================
-- pgTAP — Phase CG1: reservation lifecycle (quote -> reserve -> commit/release)
-- plan(11): quote, idempotent reserve, commit settles quota, release reverses,
--           meter_tick over-limit signal, kill-switch + suspended fail-closed
-- =============================================================================
BEGIN;

SELECT plan(11);

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

-- 2. fn_cost_reserve creates a held reservation and a debit_hold ledger entry
DO $res$
DECLARE
  v_snap_id  uuid;
  v_res_id   uuid;
  v_status   text;
BEGIN
  SELECT pricing_snapshot_id INTO v_snap_id
    FROM public.fn_cost_quote(current_setting('cg1.model_id')::uuid, 1000, 500, 0);

  SELECT reservation_id, status INTO v_res_id, v_status
  FROM public.fn_cost_reserve(
    current_setting('cg1.lenser_id')::uuid,
    v_snap_id, 50, 0.05, 'openai',
    'cg1-life-' || gen_random_uuid()::text,
    jsonb_build_object('test', true), NULL, NULL, interval '5 minutes'
  );

  PERFORM set_config('cg1.res_id', v_res_id::text, true);
  PERFORM set_config('cg1.snap_id', v_snap_id::text, true);
END
$res$;

SELECT is(
  (SELECT status FROM billing.cost_reservations WHERE id = current_setting('cg1.res_id')::uuid),
  'held',
  'fn_cost_reserve sets status=held'
);

SELECT is(
  (SELECT count(*)::integer FROM billing.ledger_entries
   WHERE reservation_id = current_setting('cg1.res_id')::uuid
     AND direction = 'debit_hold'),
  1,
  'fn_cost_reserve posts exactly one debit_hold ledger entry'
);

-- 3. Idempotency: replaying the same key returns the same reservation
DO $idem$
DECLARE
  v_snap_id   uuid := current_setting('cg1.snap_id')::uuid;
  v_idem_key  text := 'cg1-idem-' || gen_random_uuid()::text;
  v_first     uuid;
  v_second    uuid;
BEGIN
  SELECT reservation_id INTO v_first
  FROM public.fn_cost_reserve(
    current_setting('cg1.lenser_id')::uuid,
    v_snap_id, 10, 0.01, 'openai', v_idem_key, '{}'::jsonb, NULL, NULL, NULL
  );
  SELECT reservation_id INTO v_second
  FROM public.fn_cost_reserve(
    current_setting('cg1.lenser_id')::uuid,
    v_snap_id, 999, 9.99, 'openai', v_idem_key, '{}'::jsonb, NULL, NULL, NULL
  );
  PERFORM set_config('cg1.idem_first',  v_first::text,  true);
  PERFORM set_config('cg1.idem_second', v_second::text, true);
END
$idem$;

SELECT is(
  current_setting('cg1.idem_first'),
  current_setting('cg1.idem_second'),
  'fn_cost_reserve is idempotent on (ai_lenser_id, idempotency_key)'
);

-- 4. fn_cost_meter_tick returns over_limit=true past headroom
DO $tick$
DECLARE
  v_over boolean;
BEGIN
  SELECT over_limit INTO v_over
  FROM public.fn_cost_meter_tick(current_setting('cg1.res_id')::uuid, 9999);
  PERFORM set_config('cg1.over_limit', v_over::text, true);
END
$tick$;

SELECT is(current_setting('cg1.over_limit'), 'true',
  'fn_cost_meter_tick flags over_limit when running_credits exceeds headroom');

-- 5. fn_cost_commit transitions held -> committed and settles quota_snapshots
DO $commit$
DECLARE
  v_before bigint := 0;
  v_after  bigint := 0;
BEGIN
  SELECT COALESCE(credits_spent, 0) INTO v_before
  FROM agents.quota_snapshots
  WHERE ai_lenser_id = current_setting('cg1.lenser_id')::uuid
    AND period_date = CURRENT_DATE;
  v_before := COALESCE(v_before, 0);

  PERFORM public.fn_cost_commit(current_setting('cg1.res_id')::uuid, 40, 0.04);

  SELECT COALESCE(credits_spent, 0) INTO v_after
  FROM agents.quota_snapshots
  WHERE ai_lenser_id = current_setting('cg1.lenser_id')::uuid
    AND period_date = CURRENT_DATE;
  v_after := COALESCE(v_after, 0);

  PERFORM set_config('cg1.q_before', v_before::text, true);
  PERFORM set_config('cg1.q_after',  v_after::text,  true);
END
$commit$;

SELECT is(
  (SELECT status FROM billing.cost_reservations WHERE id = current_setting('cg1.res_id')::uuid),
  'committed',
  'fn_cost_commit transitions held -> committed'
);

SELECT ok(
  (current_setting('cg1.q_after')::bigint - current_setting('cg1.q_before')::bigint) >= 40,
  'fn_cost_commit settles into agents.quota_snapshots.credits_spent'
);

-- 6. After commit, two extra ledger entries exist: 'release' (reversal) + 'debit_commit'
SELECT ok(
  (SELECT count(*) FROM billing.ledger_entries
   WHERE reservation_id = current_setting('cg1.res_id')::uuid
     AND direction IN ('release','debit_commit')) = 2,
  'fn_cost_commit posts one release reversal + one debit_commit'
);

-- 7. fn_cost_release on a fresh reservation transitions held -> released
DO $rel$
DECLARE
  v_snap_id uuid := current_setting('cg1.snap_id')::uuid;
  v_res_id  uuid;
BEGIN
  SELECT reservation_id INTO v_res_id
  FROM public.fn_cost_reserve(
    current_setting('cg1.lenser_id')::uuid,
    v_snap_id, 5, 0.005, 'openai',
    'cg1-rel-' || gen_random_uuid()::text, '{}'::jsonb, NULL, NULL, NULL
  );
  PERFORM public.fn_cost_release(v_res_id, 'test_abort');
  PERFORM set_config('cg1.rel_id', v_res_id::text, true);
END
$rel$;

SELECT is(
  (SELECT status FROM billing.cost_reservations WHERE id = current_setting('cg1.rel_id')::uuid),
  'released',
  'fn_cost_release transitions held -> released'
);

-- 8. fn_cost_reserve fails closed when agent is suspended
DO $suspend$
DECLARE
  v_snap_id uuid := current_setting('cg1.snap_id')::uuid;
BEGIN
  UPDATE agents.ai_lensers SET suspended_at = now()
  WHERE id = current_setting('cg1.lenser_id')::uuid;
END
$suspend$;

SELECT throws_ok(
  format($t$SELECT public.fn_cost_reserve(%L::uuid, %L::uuid, 1, 0.01, 'openai', 'cg1-susp-' || gen_random_uuid()::text, '{}'::jsonb, NULL, NULL, NULL)$t$,
         current_setting('cg1.lenser_id')::uuid,
         current_setting('cg1.snap_id')::uuid),
  'P0001', NULL,
  'fn_cost_reserve raises when the ai_lenser is suspended'
);

-- 9. Restore + test kill_switch path
UPDATE agents.ai_lensers SET suspended_at = NULL
WHERE id = current_setting('cg1.lenser_id')::uuid;

INSERT INTO agents.workspace_settings (ai_lenser_id, global_kill_switch)
VALUES (current_setting('cg1.lenser_id')::uuid, true)
ON CONFLICT (ai_lenser_id) DO UPDATE SET global_kill_switch = true;

SELECT throws_ok(
  format($t$SELECT public.fn_cost_reserve(%L::uuid, %L::uuid, 1, 0.01, 'openai', 'cg1-kill-' || gen_random_uuid()::text, '{}'::jsonb, NULL, NULL, NULL)$t$,
         current_setting('cg1.lenser_id')::uuid,
         current_setting('cg1.snap_id')::uuid),
  'P0001', NULL,
  'fn_cost_reserve raises E_KILL_SWITCH when workspace kill switch is on'
);

SELECT finish();
ROLLBACK;
