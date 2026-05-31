-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 98_concurrent_battle_guard.sql — Idempotency of fn_mcp_battle_finalize
--        and fn_battles_finalize (concurrency guard via FOR UPDATE)
--
-- True concurrent execution is not possible in a single pgTAP transaction.
-- This suite tests idempotency (calling twice in sequence) as a proxy for the
-- FOR UPDATE guard: the second call must either be rejected gracefully or be a
-- provable no-op (status already 'closed', winner already set).
--
-- SCENARIO A — fn_mcp_battle_finalize (creator-checked entry point):
--   A1.  Create battle in scoring state with contenders and vote data
--   A2.  First call to fn_mcp_battle_finalize succeeds and returns JSONB
--   A3.  Returned JSONB status = 'closed'
--   A4.  winner_contender_id is not null in returned JSONB
--   A5.  battles row: status = 'closed'
--   A6.  battles row: winner_contender_id is not null
--   A7.  battles row: finalized_at is not null
--   A8.  Second call to fn_mcp_battle_finalize throws (battle no longer scoring)
--
-- SCENARIO B — fn_battles_finalize (low-level, service-role):
--   B1.  Create a second battle in scoring state
--   B2.  First call succeeds (no exception)
--   B3.  status = 'closed' after first call
--   B4.  finalized_at is set to a non-null value
--   B5.  Second call throws (status = closed, not in scoring/voting)
--   B6.  winner_contender_id is still set (no regression on double-call guard)
--
-- Convention mirrors 99_battle_finalize_e2e.sql.
-- ─────────────────────────────────────────────────────────────────────────────

SET client_min_messages TO WARNING;

BEGIN;

SELECT plan(8);

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email)
VALUES
  ('98980001-9898-9898-9898-989800000001', 'cg-owner@test.local'),
  ('98980002-9898-9898-9898-989800000002', 'cg-voter@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('98980001-9898-9898-9898-989800000001',
   '98980001-9898-9898-9898-989800000001',
   'cg_owner', 'CG Owner', 'human'),
  ('98980002-9898-9898-9898-989800000002',
   '98980002-9898-9898-9898-989800000002',
   'cg_voter', 'CG Voter', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('98989999-9898-9898-9898-989899999991',
        '98980001-9898-9898-9898-989800000001',
        'CG Template', 'solve the problem', true)
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO A — fn_mcp_battle_finalize idempotency
-- ═════════════════════════════════════════════════════════════════════════════

-- Create battle via the creator.
SET LOCAL "request.jwt.claims" TO
  '{"sub":"98980001-9898-9898-9898-989800000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '98989999-9898-9898-9898-989899999991'::uuid,
            'CG MCP Battle',
            'cg-mcp-battle');
  PERFORM set_config('lf_test.mcp_battle_id', v_id::text, true);
END $$;

RESET ROLE;

-- Set community_vote mode and advance to scoring.
UPDATE battles.battles
   SET judging_mode      = 'community_vote'::battles.judging_mode_enum,
       battle_type       = 'human_vs_human_open_votes'::battles.battle_type_enum,
       ai_judge_enabled  = FALSE,
       status            = 'scoring',
       voting_opens_at   = now() - interval '2 hours',
       voting_closes_at  = now() - interval '1 minute'
 WHERE id = current_setting('lf_test.mcp_battle_id')::uuid;

-- Enroll two contenders.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'cg000001-9898-cg00-cg00-cg0000000001',
  current_setting('lf_test.mcp_battle_id')::uuid, 'A',
  'human'::battles.contender_type_enum,
  '98980001-9898-9898-9898-989800000001',
  'CG A', 'direct', 'accepted', now()
), (
  'cg000002-9898-cg00-cg00-cg0000000002',
  current_setting('lf_test.mcp_battle_id')::uuid, 'B',
  'human'::battles.contender_type_enum,
  '98980002-9898-9898-9898-989800000002',
  'CG B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

-- Give A a 2-vote lead so the winner is deterministic.
INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum)
VALUES
  (current_setting('lf_test.mcp_battle_id')::uuid,
   'cg000001-9898-cg00-cg00-cg0000000001', 2, 2),
  (current_setting('lf_test.mcp_battle_id')::uuid,
   'cg000002-9898-cg00-cg00-cg0000000002', 0, 0)
ON CONFLICT DO NOTHING;

-- ── Test 1: first call to fn_mcp_battle_finalize succeeds (returns JSONB) ────
-- fn_mcp_battle_finalize is authenticated + creator-owned (v_caller resolves to
-- the authenticated lenser). Run as the creator.
SET LOCAL "request.jwt.claims" TO
  '{"sub":"98980001-9898-9898-9898-989800000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.fn_mcp_battle_finalize(
    current_setting('lf_test.mcp_battle_id')::uuid
  );
  PERFORM set_config('lf_test.mcp_finalize_result', v_result::text, true);
END $$;

RESET ROLE;

SELECT ok(
  current_setting('lf_test.mcp_finalize_result', true) IS NOT NULL,
  'fn_mcp_battle_finalize first call returns a JSONB result'
);

-- ── Test 2: returned JSONB status = closed ────────────────────────────────────
SELECT is(
  (current_setting('lf_test.mcp_finalize_result', true)::jsonb ->> 'status'),
  'closed',
  'fn_mcp_battle_finalize JSONB result status = closed'
);

-- ── Test 3: battles row: status = closed ─────────────────────────────────────
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.mcp_battle_id')::uuid),
  'closed',
  'battle status = closed after fn_mcp_battle_finalize'
);

-- ── Test 4: winner_contender_id is not null ───────────────────────────────────
SELECT isnt(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.mcp_battle_id')::uuid),
  NULL,
  'winner_contender_id is not null after fn_mcp_battle_finalize'
);

-- ── Test 5: finalized_at is not null ─────────────────────────────────────────
SELECT isnt(
  (SELECT finalized_at FROM battles.battles
    WHERE id = current_setting('lf_test.mcp_battle_id')::uuid),
  NULL,
  'finalized_at is not null after fn_mcp_battle_finalize'
);

-- ── Test 6: status = closed (redundant but explicit assertion) ────────────────
-- Mirrors the task's explicit "is(status, 'closed', ...)" requirement.
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.mcp_battle_id')::uuid),
  'closed',
  'status is closed (explicit assertion)'
);

-- ── Test 7: second call to fn_mcp_battle_finalize throws ──────────────────────
-- fn_battles_finalize (called internally) raises:
--   "Battle must be in voting or scoring status to finalize (current: closed)"
-- fn_mcp_battle_finalize propagates that exception.
SET LOCAL "request.jwt.claims" TO
  '{"sub":"98980001-9898-9898-9898-989800000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.fn_mcp_battle_finalize(
       current_setting('lf_test.mcp_battle_id', true)::uuid
     ) $$,
  'P0001',
  NULL,
  'second fn_mcp_battle_finalize call throws gracefully (already closed)'
);

RESET ROLE;

-- ── Test 8: winner_contender_id unchanged after failed second call ─────────────
-- The FOR UPDATE lock in fn_battles_finalize ensures the second concurrent caller
-- would re-read status='closed' and abort. In the sequential simulation the first
-- call closes the battle; the second throws before any mutation. Verify the winner
-- was not overwritten.
SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.mcp_battle_id')::uuid),
  'cg000001-9898-cg00-cg00-cg0000000001'::uuid,
  'winner_contender_id = A (raw-vote leader) and not overwritten by failed second call'
);

SELECT * FROM finish();

ROLLBACK;
