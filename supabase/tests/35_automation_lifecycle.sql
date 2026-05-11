-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 35_automation_lifecycle.sql
-- Battle lifecycle automation:
--
--   * battles.fn_auto_start_battles — transitions open → executing when
--     execution_starts_at <= now() for AI vs AI / workflow battles, creating
--     one execution_job per contender.
--   * battles.fn_battle_lifecycle_tick — three transitions:
--       draft → open       (open_at <= now())
--       scoring → closed   (auto_judge=true AND judge_at <= now())
--       closed → published (auto_publish=true AND publish_at <= now())
--     plus per-battle and system kill-switch enforcement.
--   * battles.fn_complete_battle_execution_job — last job complete
--     transitions battle to voting (out of scope for D9 reasons; covered
--     in the worker spec).
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(9);

-- ── Fixture builder: a battle with a contender (or two) ───────────────────
-- Returns the battle id via app.* GUCs.
DO $$
DECLARE
  v_battle_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO battles.battles (
    id, slug, title, task_prompt, max_contenders, status,
    creator_lenser_id, battle_type, execution_starts_at
  ) VALUES (
    v_battle_id, 'pgtap35-aas-' || substring(v_battle_id::text from 1 for 8),
    'pgTAP 35 auto-start', 'noop', 2,
    'open'::battles.battle_status_enum,
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'workflow_battle'::battles.battle_type_enum,
    now() - interval '1 minute'  -- already due
  );

  -- Two contenders so the function inserts two jobs
  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name
  ) VALUES
    (v_battle_id, 'A', 'human', 'b2000000-0000-0000-0000-000000000001', 'A'),
    (v_battle_id, 'B', 'human', 'b2000000-0000-0000-0000-000000000002', 'B');

  PERFORM set_config('app.pgtap35.battle_id', v_battle_id::text, true);
END $$;

-- ── Test 1: fn_auto_start_battles transitions open → executing ─────────────
SELECT is(
  (SELECT battles.fn_auto_start_battles())::int >= 1,
  true,
  'fn_auto_start_battles returns >=1 (at least our seeded battle)'
);

SELECT is(
  (SELECT status::text FROM battles.battles
   WHERE id = current_setting('app.pgtap35.battle_id')::uuid),
  'executing',
  'battle transitioned open → executing'
);

SELECT is(
  (SELECT count(*)::int FROM battles.battle_execution_jobs
   WHERE battle_id = current_setting('app.pgtap35.battle_id')::uuid),
  2,
  'one execution_job created per contender (=2)'
);

-- ── Test 2: idempotency — second call does NOT re-process the battle ─────
DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT count(*) INTO v_before
  FROM battles.battle_execution_jobs
  WHERE battle_id = current_setting('app.pgtap35.battle_id')::uuid;

  PERFORM battles.fn_auto_start_battles();

  SELECT count(*) INTO v_after
  FROM battles.battle_execution_jobs
  WHERE battle_id = current_setting('app.pgtap35.battle_id')::uuid;

  PERFORM set_config('app.pgtap35.jobs_delta', (v_after - v_before)::text, true);
END $$;

SELECT is(
  current_setting('app.pgtap35.jobs_delta')::int,
  0,
  'second fn_auto_start_battles call does not duplicate jobs (already executing)'
);

-- ── Test 3: fn_battle_lifecycle_tick closed → published (auto_publish=true) ──
DO $$
DECLARE
  v_battle_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO battles.battles (
    id, slug, title, task_prompt, max_contenders, status, creator_lenser_id
  ) VALUES (
    v_battle_id, 'pgtap35-pub-' || substring(v_battle_id::text from 1 for 8),
    'pgTAP 35 publish', 'noop', 2,
    'closed'::battles.battle_status_enum,
    'b2000000-0000-0000-0000-000000000001'::uuid
  );
  INSERT INTO battles.schedules (
    battle_id, open_at, judge_at, publish_at,
    auto_judge, auto_publish
  ) VALUES (
    v_battle_id,
    now() - interval '3 days',
    now() - interval '2 days',
    now() - interval '1 minute',
    true, true
  );
  PERFORM set_config('app.pgtap35.pub_battle', v_battle_id::text, true);
END $$;

SELECT is(
  (SELECT battles.fn_battle_lifecycle_tick())::int >= 1,
  true,
  'fn_battle_lifecycle_tick processed at least one transition'
);

SELECT is(
  (SELECT status::text FROM battles.battles
   WHERE id = current_setting('app.pgtap35.pub_battle')::uuid),
  'published',
  'closed → published transition applied (auto_publish=true)'
);

-- ── Test 4: auto_publish=false blocks the closed → published transition ───
DO $$
DECLARE
  v_battle_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO battles.battles (
    id, slug, title, task_prompt, max_contenders, status, creator_lenser_id
  ) VALUES (
    v_battle_id, 'pgtap35-nopub-' || substring(v_battle_id::text from 1 for 8),
    'pgTAP 35 no-pub', 'noop', 2,
    'closed'::battles.battle_status_enum,
    'b2000000-0000-0000-0000-000000000001'::uuid
  );
  INSERT INTO battles.schedules (
    battle_id, open_at, judge_at, publish_at,
    auto_judge, auto_publish
  ) VALUES (
    v_battle_id,
    now() - interval '3 days',
    now() - interval '2 days',
    now() - interval '1 minute',
    true, false  -- auto_publish OFF
  );
  PERFORM set_config('app.pgtap35.nopub_battle', v_battle_id::text, true);

  -- run the tick again
  PERFORM battles.fn_battle_lifecycle_tick();
END $$;

SELECT is(
  (SELECT status::text FROM battles.battles
   WHERE id = current_setting('app.pgtap35.nopub_battle')::uuid),
  'closed',
  'auto_publish=false stops closed → published transition'
);

-- ── Test 5: per-battle kill switch blocks the transition ──────────────────
DO $$
DECLARE
  v_battle_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO battles.battles (
    id, slug, title, task_prompt, max_contenders, status, creator_lenser_id
  ) VALUES (
    v_battle_id, 'pgtap35-ks-' || substring(v_battle_id::text from 1 for 8),
    'pgTAP 35 kill switch', 'noop', 2,
    'closed'::battles.battle_status_enum,
    'b2000000-0000-0000-0000-000000000001'::uuid
  );
  INSERT INTO battles.schedules (
    battle_id, open_at, judge_at, publish_at,
    auto_judge, auto_publish
  ) VALUES (
    v_battle_id,
    now() - interval '3 days',
    now() - interval '2 days',
    now() - interval '1 minute',
    true, true
  );

  -- Activate a per-battle kill switch
  INSERT INTO admin.kill_switches (
    scope, target_id, operator_id, reason
  ) VALUES (
    'battle', v_battle_id,
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'pgTAP 35 kill switch test'
  );

  PERFORM set_config('app.pgtap35.ks_battle', v_battle_id::text, true);

  PERFORM battles.fn_battle_lifecycle_tick();
END $$;

SELECT is(
  (SELECT status::text FROM battles.battles
   WHERE id = current_setting('app.pgtap35.ks_battle')::uuid),
  'closed',
  'per-battle kill switch stops the transition'
);

-- ── Test 6: function signatures + GRANTs ──────────────────────────────────
SELECT ok(
  has_function_privilege('service_role',
    'battles.fn_auto_start_battles()', 'EXECUTE'),
  'service_role can EXECUTE battles.fn_auto_start_battles'
);

SELECT * FROM finish();
ROLLBACK;
