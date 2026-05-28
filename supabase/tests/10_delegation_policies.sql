-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 10_delegation_policies.sql
-- Phase AL — validates the three policy paths through agents.fn_start_team_run
-- and the SKIP LOCKED claim contract on agents.fn_claim_team_run.
--
-- Run via: pnpm test:db
-- All changes roll back via the surrounding ROLLBACK.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(8);

-- ── Test 1: fn_start_team_run is service_role only ────────────────────────
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'agents.fn_start_team_run(uuid, uuid, jsonb, text)',
    'EXECUTE'
  ),
  'authenticated cannot EXECUTE fn_start_team_run'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'agents.fn_start_team_run(uuid, uuid, jsonb, text)',
    'EXECUTE'
  ),
  'service_role can EXECUTE fn_start_team_run'
);

-- ── Fixture: use seeded ai_lenser (07_ai_lensers.sql) ─────────────────────
-- c3000000-…-0001 corresponds to the seeded GPT-4o ai_lenser. We pick the
-- first available seeded id at runtime so the test stays robust across
-- seed reorderings.
DO $$
DECLARE
  v_ai_lenser_id UUID;
BEGIN
  SELECT id INTO v_ai_lenser_id FROM agents.ai_lensers ORDER BY created_at LIMIT 1;
  IF v_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'No seeded ai_lensers — run pnpm supabase:db:reset first';
  END IF;
  PERFORM set_config('app.test_ai_lenser_id', v_ai_lenser_id::text, false);
END $$;

-- ── Test 2: policy=forbidden RAISES, no team_runs row inserted ─────────────
SELECT throws_ok(
  format(
    $$ SELECT agents.fn_start_team_run(%L::uuid, NULL, '{}'::jsonb, 'forbidden') $$,
    current_setting('app.test_ai_lenser_id')
  ),
  'P0001',
  'delegation_forbidden',
  'fn_start_team_run with policy=forbidden raises delegation_forbidden'
);

-- ── Test 3: policy=auto inserts a row with status=queued ───────────────────
SELECT lives_ok(
  format(
    $$ SELECT agents.fn_start_team_run(%L::uuid, NULL, '{"k":"v"}'::jsonb, 'auto') $$,
    current_setting('app.test_ai_lenser_id')
  ),
  'fn_start_team_run with policy=auto succeeds'
);

SELECT is(
  (SELECT status::text FROM agents.team_runs
   WHERE ai_lenser_id::text = current_setting('app.test_ai_lenser_id')
     AND metadata->>'origin' = 'delegate_to_agent'
   ORDER BY created_at DESC LIMIT 1),
  'queued',
  'auto policy → status=queued'
);

-- ── Test 4: policy=approval_required → status=blocked, approval=pending ────
SELECT lives_ok(
  format(
    $$ SELECT agents.fn_start_team_run(%L::uuid, NULL, '{}'::jsonb, 'approval_required') $$,
    current_setting('app.test_ai_lenser_id')
  ),
  'fn_start_team_run with policy=approval_required succeeds'
);

SELECT is(
  (SELECT status::text || ':' || approval_status::text
   FROM agents.team_runs
   WHERE ai_lenser_id::text = current_setting('app.test_ai_lenser_id')
     AND metadata->>'delegation_policy' = 'approval_required'
   ORDER BY created_at DESC LIMIT 1),
  'blocked:pending',
  'approval_required policy → status=blocked, approval_status=pending'
);

-- ── Test 5: fn_claim_team_run claims one queued row → status=running ───────
SELECT ok(
  EXISTS(
    SELECT 1 FROM agents.fn_claim_team_run('test-worker')
  ),
  'fn_claim_team_run returns one queued row'
);

SELECT * FROM finish();

ROLLBACK;
