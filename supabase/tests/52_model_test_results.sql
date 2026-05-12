-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 52_model_test_results.sql — Phase BJ
--
--   1. service-role insert via direct INSERT succeeds
--   2. owner can SELECT their own run
--   3. non-owner SELECT returns 0 rows
--   4. UPDATE / DELETE raises (append-only trigger)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(4);

INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b201-1111-1111-111111111111', 'bj-owner@test.local'),
  ('22222222-b201-2222-2222-222222222222', 'bj-other@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b201-1111-1111-111111111111',
   '11111111-b201-1111-1111-111111111111', 'bj_owner', 'BJ Owner', 'human'),
  ('22222222-b201-2222-2222-222222222222',
   '22222222-b201-2222-2222-222222222222', 'bj_other', 'BJ Other', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('aaaa1111-b201-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-b201-1111-1111-111111111111',
        'BJ Template', 'prompt', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status, max_contenders
) VALUES (
  'bbbb1111-b201-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-b201-1111-1111-111111111111',
  'BJ Battle', 'bj-battle', 'do thing', 'draft', 2
) ON CONFLICT (id) DO NOTHING;

-- ── Test 1: service-role direct INSERT succeeds ─────────────────────────────
INSERT INTO battles.model_test_runs (
  id, battle_id, template_id, model_provider, model_id,
  prompt_hash, passed, duration_ms
)
VALUES (
  '11111111-b201-aaaa-aaaa-111111111111',
  'bbbb1111-b201-bbbb-bbbb-bbbbbbbbbbbb',
  NULL, 'openai', 'gpt-4o-mini',
  'sha256:cafebabe12345678', true, 142
);

SELECT is(
  (SELECT count(*)::int FROM battles.model_test_runs
    WHERE id = '11111111-b201-aaaa-aaaa-111111111111'),
  1,
  'service-role INSERT into model_test_runs succeeds'
);

-- ── Test 2: owner SELECT succeeds ───────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-b201-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM battles.model_test_runs
    WHERE battle_id = 'bbbb1111-b201-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'owner can SELECT their own model_test_runs row'
);

-- ── Test 3: non-owner SELECT returns 0 rows ─────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"sub":"22222222-b201-2222-2222-222222222222","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM battles.model_test_runs
    WHERE battle_id = 'bbbb1111-b201-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'non-owner SELECT returns 0 rows'
);

-- ── Test 4: UPDATE raises (append-only) ─────────────────────────────────────
RESET ROLE;

SELECT throws_ok(
  $$ UPDATE battles.model_test_runs SET passed = false
      WHERE id = '11111111-b201-aaaa-aaaa-111111111111' $$,
  '42501',
  'model_test_runs is append-only',
  'UPDATE on model_test_runs raises 42501 (append-only trigger)'
);

SELECT * FROM finish();
ROLLBACK;
