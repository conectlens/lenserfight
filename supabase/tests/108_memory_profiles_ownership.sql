-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 108_memory_profiles_ownership.sql (issue #481)
--
--   1. fn_create_workspace_record + fn_list_memory_profiles round-trip while
--      acting inside the agent's own workspace (active_lenser_id = agent's
--      profile_id) — previously fn_list_memory_profiles returned [] here
--      because it only checked the active session lenser, not the resolved
--      human owner.
--   2. Same round-trip for fn_list_model_profiles (identical bug, same fix).
--   3. fn_create_workspace_record rejects creating a memory_profiles row for
--      an ai_lenser_id the caller does not own (security hardening — this
--      previously succeeded unconditionally).
--   4. The legitimate owner acting as themselves (not via workspace switch)
--      still succeeds — the human-owner fallback doesn't regress the
--      existing direct-ownership path.
--
-- Uses the 08_lenser_family seed fixture: Alice (b2...0001, auth a1...0001)
-- owns AI lenser LENSO (ai_lensers.id = d5...0001, profile_id = d4...0001).
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(4);

-- ─── Fixture setup ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships
    WHERE ai_lenser_id    = 'd5000000-0000-0000-0000-000000000001'::uuid
      AND owner_lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'seed fixture missing: ownership d5.../b2...0001';
  END IF;
END $$;

UPDATE lensers.profiles SET status = 'active' WHERE id = 'b2000000-0000-0000-0000-000000000001'::uuid;

-- Switch Alice's active workspace to her agent (LENSO's profile id).
INSERT INTO lensers.preferences (lenser_id, active_lenser_id)
VALUES ('b2000000-0000-0000-0000-000000000001'::uuid, 'd4000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (lenser_id) DO UPDATE SET active_lenser_id = EXCLUDED.active_lenser_id;

SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

-- ── Test 1: create + list round-trip while acting inside the agent workspace ─
SELECT public.fn_create_workspace_record(
  'memory_profiles',
  jsonb_build_object(
    'ai_lenser_id', 'd5000000-0000-0000-0000-000000000001'::uuid,
    'name', 'pgtap108-memory'
  )
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.fn_list_memory_profiles('d5000000-0000-0000-0000-000000000001'::uuid) mp
    WHERE mp->>'name' = 'pgtap108-memory'
  ),
  'fn_list_memory_profiles sees a row just created while acting as the agent'
);

-- ── Test 2: same round-trip for fn_list_model_profiles ──────────────────────
SELECT public.fn_create_workspace_record(
  'model_profiles',
  jsonb_build_object(
    'ai_lenser_id', 'd5000000-0000-0000-0000-000000000001'::uuid,
    'name', 'pgtap108-model',
    'provider_key', 'openai',
    'model_key', 'gpt-4o'
  )
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.fn_list_model_profiles('d5000000-0000-0000-0000-000000000001'::uuid) mop
    WHERE mop->>'name' = 'pgtap108-model'
  ),
  'fn_list_model_profiles sees a row just created while acting as the agent'
);

-- ── Test 3: caller cannot create a memory_profiles row for an unowned agent ─
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true);

SELECT throws_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'memory_profiles',
    jsonb_build_object(
      'ai_lenser_id', 'd5000000-0000-0000-0000-000000000001'::uuid,
      'name', 'hostile-memory'
    )
  )
  $$,
  '42501',
  NULL,
  'fn_create_workspace_record rejects an ai_lenser_id the caller does not own'
);

-- ── Test 4: the direct human owner (no workspace switch) still succeeds ─────
SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

UPDATE lensers.preferences SET active_lenser_id = NULL WHERE lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid;

SELECT lives_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'memory_profiles',
    jsonb_build_object(
      'ai_lenser_id', 'd5000000-0000-0000-0000-000000000001'::uuid,
      'name', 'pgtap108-memory-direct'
    )
  )
  $$,
  'fn_create_workspace_record: direct human owner (no workspace switch) still succeeds'
);

SELECT * FROM finish();
ROLLBACK;
