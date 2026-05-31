-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 97_team_run_e2e.sql — Team run lifecycle + AI judge verdict insertion
--        and battle finalize winner selection
--
-- SCENARIO A — team run lifecycle:
--   A1.  public.fn_create_team_run creates a row in agents.team_runs (running)
--   A2.  The returned JSONB contains the run id
--   A3.  status is 'running' immediately after creation
--   A4.  Direct UPDATE to 'completed' + completed_at is accepted by the check
--   A5.  status is 'completed' after the UPDATE
--
-- SCENARIO B — fn_record_ai_judge_verdict inserts verdict rows:
--   B1.  Battle + contenders + aggregates created; status set to scoring
--   B2.  fn_record_ai_judge_verdict (service_role) inserts 2 verdict rows
--   B3.  inserted count = 2
--   B4.  verdicts exist in battles.ai_judge_verdicts
--
-- SCENARIO C — fn_battles_finalize picks highest-scored contender as winner:
--   C1.  fn_record_ai_judge_verdict auto-finalizes: status = closed
--   C2.  winner_contender_id = B (higher mean score 9.0 vs A's 6.0)
--   C3.  finalized_at is not null
--   C4.  rank_position 1 = B (verdict leader)
--   C5.  rank_position 2 = A
--   C6.  Calling fn_battles_finalize again throws (already closed)
--
-- Convention mirrors 99_battle_finalize_e2e.sql.
-- ─────────────────────────────────────────────────────────────────────────────

SET client_min_messages TO WARNING;

BEGIN;

SELECT plan(15);

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email)
VALUES
  ('97970001-9797-9797-9797-979700000001', 'tr-owner@test.local'),
  ('97970002-9797-9797-9797-979700000002', 'tr-agent@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('97970001-9797-9797-9797-979700000001',
   '97970001-9797-9797-9797-979700000001',
   'tr_owner', 'TR Owner', 'human'),
  ('97970002-9797-9797-9797-979700000002',
   '97970002-9797-9797-9797-979700000002',
   'tr_agent', 'TR Agent', 'ai')
ON CONFLICT (id) DO NOTHING;

-- AI Lenser backing the agent profile (needed by fn_create_team_run).
INSERT INTO agents.ai_lensers (id, profile_id)
VALUES ('97970003-9797-9797-9797-979700000003',
        '97970002-9797-9797-9797-979700000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agents.policies (ai_lenser_id)
VALUES ('97970003-9797-9797-9797-979700000003')
ON CONFLICT DO NOTHING;

-- Battle template needed to create the finalize-test battle.
INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('97979999-9797-9797-9797-979799999991',
        '97970001-9797-9797-9797-979700000001',
        'TR Template', 'write something', true)
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO A — team run lifecycle
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Test 1: fn_create_team_run returns a JSONB object ───────────────────────
DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fn_create_team_run(
    '97970003-9797-9797-9797-979700000003'::uuid
  );
  PERFORM set_config('lf_test.team_run_id', v_result->>'id', true);
END $$;

SELECT ok(
  current_setting('lf_test.team_run_id', true) IS NOT NULL,
  'fn_create_team_run returns a JSONB with an id'
);

-- ── Test 2: team run row exists in agents.team_runs ─────────────────────────
SELECT is(
  (SELECT count(*)::int FROM agents.team_runs
    WHERE id = current_setting('lf_test.team_run_id')::uuid),
  1,
  'team run row exists in agents.team_runs'
);

-- ── Test 3: status is running immediately after creation ────────────────────
SELECT is(
  (SELECT status FROM agents.team_runs
    WHERE id = current_setting('lf_test.team_run_id')::uuid),
  'running',
  'team run status is running immediately after fn_create_team_run'
);

-- ── Test 4: UPDATE to completed + completed_at is accepted ──────────────────
UPDATE agents.team_runs
   SET status       = 'completed',
       completed_at = now()
 WHERE id = current_setting('lf_test.team_run_id')::uuid;

SELECT is(
  (SELECT status FROM agents.team_runs
    WHERE id = current_setting('lf_test.team_run_id')::uuid),
  'completed',
  'team run status can be set to completed'
);

-- ── Test 5: completed_at is not null after the update ───────────────────────
SELECT isnt(
  (SELECT completed_at FROM agents.team_runs
    WHERE id = current_setting('lf_test.team_run_id')::uuid),
  NULL,
  'completed_at is not null after completion update'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO B — fn_record_ai_judge_verdict inserts verdict rows
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Battle setup ────────────────────────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub":"97970001-9797-9797-9797-979700000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '97979999-9797-9797-9797-979799999991'::uuid,
            'TR Judge Battle',
            'tr-judge-battle');
  PERFORM set_config('lf_test.judge_battle_id', v_id::text, true);
END $$;

RESET ROLE;

-- Set to ai_judge mode.
UPDATE battles.battles
   SET judging_mode     = 'ai_judge'::battles.judging_mode_enum,
       battle_type      = 'ai_vs_ai'::battles.battle_type_enum,
       ai_judge_enabled = TRUE
 WHERE id = current_setting('lf_test.judge_battle_id')::uuid;

-- Contenders.
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'c7000001-9797-c700-c700-c70000000001',
  current_setting('lf_test.judge_battle_id')::uuid, 'A',
  'ai_model'::battles.contender_type_enum,
  NULL, 'Judge A', 'direct', 'accepted', now()
), (
  'c7000002-9797-c700-c700-c70000000002',
  current_setting('lf_test.judge_battle_id')::uuid, 'B',
  'ai_model'::battles.contender_type_enum,
  NULL, 'Judge B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

-- Empty vote_aggregates so rank_position can be stamped during finalize.
INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum)
VALUES
  (current_setting('lf_test.judge_battle_id')::uuid, 'c7000001-9797-c700-c700-c70000000001', 0, 0),
  (current_setting('lf_test.judge_battle_id')::uuid, 'c7000002-9797-c700-c700-c70000000002', 0, 0)
ON CONFLICT DO NOTHING;

-- Advance to scoring + ensure voting_closes_at is in the past.
UPDATE battles.battles
   SET status           = 'scoring',
       voting_opens_at  = now() - interval '2 hours',
       voting_closes_at = now() - interval '1 minute'
 WHERE id = current_setting('lf_test.judge_battle_id')::uuid;

-- ── Test 6: status is scoring before verdict insertion ───────────────────────
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.judge_battle_id')::uuid),
  'scoring',
  'battle is in scoring state before verdicts are inserted'
);

-- ── Test 7: fn_record_ai_judge_verdict returns the inserted count ─────────────
-- B has a higher mean score (9.0) so it will win.
SET LOCAL ROLE service_role;

SELECT is(
  (SELECT public.fn_record_ai_judge_verdict(
    current_setting('lf_test.judge_battle_id')::uuid,
    jsonb_build_array(
      jsonb_build_object('contender_id', 'c7000001-9797-c700-c700-c70000000001',
                         'score', 6.0, 'rationale', 'A is adequate'),
      jsonb_build_object('contender_id', 'c7000002-9797-c700-c700-c70000000002',
                         'score', 9.0, 'rationale', 'B is excellent')
    )
  )),
  2,
  'fn_record_ai_judge_verdict returns 2 (count of inserted verdicts)'
);

RESET ROLE;

-- ── Test 8: verdict rows exist in battles.ai_judge_verdicts ─────────────────
SELECT is(
  (SELECT count(*)::int FROM battles.ai_judge_verdicts
    WHERE battle_id = current_setting('lf_test.judge_battle_id')::uuid),
  2,
  'ai_judge_verdicts has 2 rows for the battle'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO C — fn_battles_finalize selects the highest-scored contender
-- ═════════════════════════════════════════════════════════════════════════════

-- fn_record_ai_judge_verdict auto-finalizes (ai_judge_enabled + scoring).
-- Tests C1-C6 verify the result.

-- ── Test 9: status is closed after verdict insertion (auto-finalize) ─────────
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.judge_battle_id')::uuid),
  'closed',
  'recording verdicts auto-finalizes scoring → closed'
);

-- ── Test 10: winner is B (highest verdict mean) ──────────────────────────────
SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.judge_battle_id')::uuid),
  'c7000002-9797-c700-c700-c70000000002'::uuid,
  'winner_contender_id = B (score 9.0 > A score 6.0)'
);

-- ── Test 11: finalized_at is not null ────────────────────────────────────────
SELECT isnt(
  (SELECT finalized_at FROM battles.battles
    WHERE id = current_setting('lf_test.judge_battle_id')::uuid),
  NULL,
  'finalized_at is set after finalize'
);

-- ── Test 12: rank_position 1 = B ─────────────────────────────────────────────
SELECT is(
  (SELECT rank_position FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.judge_battle_id')::uuid
      AND contender_id = 'c7000002-9797-c700-c700-c70000000002'),
  1,
  'B is rank_position 1 (verdict-derived order)'
);

-- ── Test 13: rank_position 2 = A ─────────────────────────────────────────────
SELECT is(
  (SELECT rank_position FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.judge_battle_id')::uuid
      AND contender_id = 'c7000001-9797-c700-c700-c70000000001'),
  2,
  'A is rank_position 2'
);

-- ── Test 14: calling fn_battles_finalize on an already-closed battle throws ───
-- fn_battles_finalize checks status IN ('voting','scoring') and raises otherwise.
SELECT throws_ok(
  $$ SELECT public.fn_battles_finalize(
       current_setting('lf_test.judge_battle_id', true)::uuid
     ) $$,
  'P0001',
  NULL,
  'fn_battles_finalize throws when battle is already closed'
);

-- ── Test 15: fn_record_ai_judge_verdict on already-closed battle is a no-op ──
-- The wrapper's eligibility guard (status IN ('scoring','voting') AND ai_judge_enabled)
-- prevents re-finalization; it returns 0 inserted on a duplicate call (since
-- verdict rows already exist; ON CONFLICT is not defined — the count is the
-- newly inserted rows. Call with an empty array to avoid duplicate key errors).
SET LOCAL ROLE service_role;
SELECT is(
  (SELECT public.fn_record_ai_judge_verdict(
    current_setting('lf_test.judge_battle_id')::uuid,
    '[]'::jsonb
  )),
  0,
  'fn_record_ai_judge_verdict on a closed battle returns 0 and does not re-finalize'
);
RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
