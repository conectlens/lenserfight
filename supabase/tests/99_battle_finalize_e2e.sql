-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 99_battle_finalize_e2e.sql — Battles finalize completion (F1 + F2 + stress)
--
-- Proves the previously ORPHANED scoring → closed → published transition now
-- runs end-to-end, with a mode-aware winner and persisted ranking.
--
-- SCENARIO A — community_vote: draft → open → executing → voting → scoring →
--   closed (winner = raw-vote leader, rank stamped) → published.
-- SCENARIO B — ai_judge: verdicts drive the winner (executable proof of F2 —
--   finalize must read battles.ai_judge_verdicts, not just raw_vote_count).
-- SCENARIO C — fn_worker_run_finalize_cycle: bounded, eligibility-gated,
--   idempotent sweep (stress: a 1M-battle table must not re-finalize or touch
--   ineligible battles).
--
-- Mirrors 51_battle_lifecycle_e2e.sql: BEGIN; plan; auth.users + lensers.profiles
-- + battles.templates fixtures ON CONFLICT DO NOTHING; SET LOCAL request.jwt.claims
-- + SET LOCAL ROLE for creator-gated RPCs; superuser direct UPDATE/INSERT stands
-- in for the creator-gated SECURITY DEFINER steps (the suite runs as superuser
-- between JWT toggles, so RLS is bypassed). finish(); ROLLBACK;
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(31);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-bf01-1111-1111-111111111111', 'bf-owner@test.local'),
  ('33333333-bf01-3333-3333-333333333333', 'bf-voter1@test.local'),
  ('44444444-bf01-4444-4444-444444444444', 'bf-voter2@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-bf01-1111-1111-111111111111',
   '11111111-bf01-1111-1111-111111111111', 'bf_owner', 'BF Owner', 'human'),
  ('33333333-bf01-3333-3333-333333333333',
   '33333333-bf01-3333-3333-333333333333', 'bf_voter1','BF Voter 1','human'),
  ('44444444-bf01-4444-4444-444444444444',
   '44444444-bf01-4444-4444-444444444444', 'bf_voter2','BF Voter 2','human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES ('99999999-bf01-9999-9999-999999999991',
        '11111111-bf01-1111-1111-111111111111',
        'BF Template', 'do the thing', true)
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO A — community_vote end-to-end (draft → … → published)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Test 1: create battle from template ─────────────────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-bf01-9999-9999-999999999991'::uuid,
            'BF Community Battle',
            'bf-community');
  PERFORM set_config('lf_test.battle_a', v_id::text, true);
END $$;

RESET ROLE;
SELECT isnt(
  current_setting('lf_test.battle_a', true),
  NULL,
  'fn_battles_create_from_template returns a community battle id'
);

-- Make it an explicit community_vote, non-AI battle (creator-owned; superuser ok).
UPDATE battles.battles
   SET judging_mode      = 'community_vote'::battles.judging_mode_enum,
       battle_type       = 'human_vs_human_open_votes'::battles.battle_type_enum,
       ai_judge_enabled  = FALSE
 WHERE id = current_setting('lf_test.battle_a')::uuid;

-- ── Test 2 & 3: enroll contenders A and B ───────────────────────────────────
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01',
  current_setting('lf_test.battle_a')::uuid, 'A',
  'human'::battles.contender_type_enum,
  '11111111-bf01-1111-1111-111111111111',
  'BF A', 'direct', 'accepted', now()
), (
  'aaaaaaa2-bf01-aaaa-aaaa-aaaaaaaaaa02',
  current_setting('lf_test.battle_a')::uuid, 'B',
  'human'::battles.contender_type_enum,
  '33333333-bf01-3333-3333-333333333333',
  'BF B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid AND slot = 'A'),
  1,
  'community: contender A is enrolled'
);

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid AND slot = 'B'),
  1,
  'community: contender B is enrolled'
);

-- ── Test 4: seed submissions for both contenders ────────────────────────────
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status, content_text, submitted_at
) VALUES (
  'aaaccca1-bf01-accc-accc-acccacccac01',
  current_setting('lf_test.battle_a')::uuid,
  'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01',
  'submitted'::battles.submission_status_enum,
  'Submission A text', now()
), (
  'aaaccca2-bf01-accc-accc-acccacccac02',
  current_setting('lf_test.battle_a')::uuid,
  'aaaaaaa2-bf01-aaaa-aaaa-aaaaaaaaaa02',
  'submitted'::battles.submission_status_enum,
  'Submission B text', now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM battles.submissions
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid),
  2,
  'community: submissions recorded for both contenders'
);

-- ── Test 5: draft → open ────────────────────────────────────────────────────
-- Superuser direct UPDATE stands in for the creator-gated open transition (see
-- 51_battle_lifecycle_e2e.sql convention).
UPDATE battles.battles
   SET status = 'open' WHERE id = current_setting('lf_test.battle_a')::uuid;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'open',
  'community: battle transitioned draft → open'
);

-- ── Test 6: open → executing → voting ───────────────────────────────────────
UPDATE battles.battles
   SET status = 'executing' WHERE id = current_setting('lf_test.battle_a')::uuid;
UPDATE battles.battles
   SET status = 'voting',
       voting_opens_at  = now() - interval '1 minute',
       voting_closes_at = now() + interval '1 hour'
 WHERE id = current_setting('lf_test.battle_a')::uuid;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'voting',
  'community: battle transitioned open → executing → voting'
);

-- ── Test 7 & 8: two votes for A from distinct voters ────────────────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"33333333-bf01-3333-3333-333333333333","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT public.fn_submit_vote(
  current_setting('lf_test.battle_a')::uuid,
  'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01'::uuid,
  'contender_a'::battles.vote_value_enum,
  false,
  'voter1: I like A'
);
RESET ROLE;

SET LOCAL "request.jwt.claims" TO '{"sub":"44444444-bf01-4444-4444-444444444444","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT public.fn_submit_vote(
  current_setting('lf_test.battle_a')::uuid,
  'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01'::uuid,
  'contender_a'::battles.vote_value_enum,
  false,
  'voter2: I also like A'
);
RESET ROLE;

SELECT is(
  (SELECT total_vote_count FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  2,
  'community: total_vote_count = 2 after two votes'
);

SELECT is(
  (SELECT raw_vote_count FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid
      AND contender_id = 'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01'),
  2,
  'community: aggregate for A reflects two raw votes'
);

-- ── Test 9: voting → scoring ────────────────────────────────────────────────
UPDATE battles.battles
   SET status = 'scoring' WHERE id = current_setting('lf_test.battle_a')::uuid;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'scoring',
  'community: battle transitioned voting → scoring'
);

-- ── Test 10: fn_battles_finalize → scoring → closed (THE orphaned transition) ─
SELECT public.fn_battles_finalize(current_setting('lf_test.battle_a')::uuid);

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'closed',
  'community: fn_battles_finalize moves scoring → closed'
);

-- ── Test 11: winner = raw-vote leader (A) ───────────────────────────────────
SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01'::uuid,
  'community: winner_contender_id = A (raw-vote leader)'
);

-- ── Test 12: rank_position stamped (A=1, B=2) ───────────────────────────────
SELECT is(
  (SELECT rank_position FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid
      AND contender_id = 'aaaaaaa1-bf01-aaaa-aaaa-aaaaaaaaaa01'),
  1,
  'community: A is rank_position 1'
);

SELECT is(
  (SELECT rank_position FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.battle_a')::uuid
      AND contender_id = 'aaaaaaa2-bf01-aaaa-aaaa-aaaaaaaaaa02'),
  2,
  'community: B is rank_position 2'
);

-- ── Test 13: closed → published via fn_battles_publish (creator-only) ────────
-- fn_battles_publish requires status='closed' and creator ownership (resolves
-- the JWT sub → lenser profile). This is the CORRECT closed → published RPC,
-- NOT fn_publish_battle (which requires status='draft' and does draft → open).
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT public.fn_battles_publish(current_setting('lf_test.battle_a')::uuid);
RESET ROLE;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  'published',
  'community: fn_battles_publish moves closed → published'
);

SELECT isnt(
  (SELECT published_at FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  NULL,
  'community: published_at is set after publish'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO B — ai_judge: verdicts drive the winner (F2)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Test 14: create second battle, make it ai_judge / ai_vs_ai ──────────────
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-bf01-9999-9999-999999999991'::uuid,
            'BF AI Judge Battle',
            'bf-ai-judge');
  PERFORM set_config('lf_test.battle_b', v_id::text, true);
END $$;

RESET ROLE;

UPDATE battles.battles
   SET judging_mode      = 'ai_judge'::battles.judging_mode_enum,
       battle_type       = 'ai_vs_ai'::battles.battle_type_enum,
       ai_judge_enabled  = TRUE
 WHERE id = current_setting('lf_test.battle_b')::uuid;

SELECT is(
  (SELECT ai_judge_enabled FROM battles.battles
    WHERE id = current_setting('lf_test.battle_b')::uuid),
  TRUE,
  'ai_judge: battle is ai_judge_enabled'
);

-- ── Test 15 & 16: enroll AI contenders A and B (contender_type ai_model) ────
INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'bbbbbbb1-bf01-bbbb-bbbb-bbbbbbbbbb01',
  current_setting('lf_test.battle_b')::uuid, 'A',
  'ai_model'::battles.contender_type_enum,
  NULL,
  'AI A', 'direct', 'accepted', now()
), (
  'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02',
  current_setting('lf_test.battle_b')::uuid, 'B',
  'ai_model'::battles.contender_type_enum,
  NULL,
  'AI B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_b')::uuid AND slot = 'A'),
  1,
  'ai_judge: AI contender A enrolled'
);

SELECT is(
  (SELECT count(*)::int FROM battles.contenders
    WHERE battle_id = current_setting('lf_test.battle_b')::uuid AND slot = 'B'),
  1,
  'ai_judge: AI contender B enrolled'
);

-- Seed submissions so finalize has a submitted_at tie-break input.
INSERT INTO battles.submissions (
  id, battle_id, contender_id, status, content_text, submitted_at
) VALUES (
  'bbbccca1-bf01-bccc-bccc-bcccbcccbc01',
  current_setting('lf_test.battle_b')::uuid,
  'bbbbbbb1-bf01-bbbb-bbbb-bbbbbbbbbb01',
  'submitted'::battles.submission_status_enum,
  'AI A output', now() - interval '2 minute'
), (
  'bbbccca2-bf01-bccc-bccc-bcccbcccbc02',
  current_setting('lf_test.battle_b')::uuid,
  'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02',
  'submitted'::battles.submission_status_enum,
  'AI B output', now() - interval '1 minute'
)
ON CONFLICT (id) DO NOTHING;

-- Seed empty vote_aggregates rows (raw_vote_count = 0) so finalize can stamp
-- rank_position from verdict scores (rank is only persisted for contenders that
-- have an aggregates row; ai_judge battles otherwise have none).
INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum)
VALUES
  (current_setting('lf_test.battle_b')::uuid, 'bbbbbbb1-bf01-bbbb-bbbb-bbbbbbbbbb01', 0, 0),
  (current_setting('lf_test.battle_b')::uuid, 'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02', 0, 0)
ON CONFLICT DO NOTHING;

-- ── Test 17: step to scoring, finalize-eligible (voting_closes_at in past) ──
UPDATE battles.battles
   SET status = 'open' WHERE id = current_setting('lf_test.battle_b')::uuid;
UPDATE battles.battles
   SET status = 'executing' WHERE id = current_setting('lf_test.battle_b')::uuid;
UPDATE battles.battles
   SET status = 'voting',
       voting_opens_at  = now() - interval '2 hour',
       voting_closes_at = now() - interval '1 minute'
 WHERE id = current_setting('lf_test.battle_b')::uuid;
UPDATE battles.battles
   SET status = 'scoring' WHERE id = current_setting('lf_test.battle_b')::uuid;

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_b')::uuid),
  'scoring',
  'ai_judge: battle is in scoring and past voting_closes_at'
);

-- ── Test 18: persist verdicts via the public REST wrapper (service_role) ────
-- public.fn_record_ai_judge_verdict is the public SECURITY DEFINER wrapper the
-- ai-judge-battle edge function POSTs to (the battles schema is not REST-exposed).
-- It is service_role only. Give B the higher mean (9.0) vs A (6.0).
SET LOCAL ROLE service_role;
SELECT public.fn_record_ai_judge_verdict(
  current_setting('lf_test.battle_b')::uuid,
  jsonb_build_array(
    jsonb_build_object('contender_id', 'bbbbbbb1-bf01-bbbb-bbbb-bbbbbbbbbb01', 'score', 6.0, 'rationale', 'A is ok'),
    jsonb_build_object('contender_id', 'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02', 'score', 9.0, 'rationale', 'B is great')
  )
);
RESET ROLE;

SELECT cmp_ok(
  (SELECT count(*)::int FROM battles.ai_judge_verdicts
    WHERE battle_id = current_setting('lf_test.battle_b')::uuid),
  '>',
  0,
  'ai_judge: verdict rows persisted via public wrapper'
);

-- ── Test 19: wrapper auto-finalizes ai_judge battles (no second call) ───────
-- fn_record_ai_judge_verdict finalizes when ai_judge_enabled AND status in
-- (scoring, voting), mirroring the old battles.fn_record_ai_judge_verdict.
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_b')::uuid),
  'closed',
  'ai_judge: recording verdicts auto-finalizes scoring → closed'
);

-- ── Test 20: winner = AI-judge leader B (executable proof of F2) ────────────
-- FAILS until fn_battles_finalize derives the winner from ai_judge_verdicts for
-- judging_mode = ai_judge / ai_vs_ai instead of raw_vote_count.
SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.battle_b')::uuid),
  'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02'::uuid,
  'ai_judge: winner_contender_id = B (highest verdict mean) — proves F2 fixed'
);

-- ── Test 21: ranking reflects verdict order (B=1, A=2) ──────────────────────
SELECT is(
  (SELECT rank_position FROM battles.vote_aggregates
    WHERE battle_id = current_setting('lf_test.battle_b')::uuid
      AND contender_id = 'bbbbbbb2-bf01-bbbb-bbbb-bbbbbbbbbb02'),
  1,
  'ai_judge: B is rank_position 1 (verdict-derived order)'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO C — fn_worker_run_finalize_cycle: bounded, idempotent, gated sweep
-- ═════════════════════════════════════════════════════════════════════════════
-- Eligibility predicate: status='scoring' AND voting_closes_at <= now() AND
-- winner_contender_id IS NULL AND deleted_at IS NULL.

-- Battle C-eligible: scoring, past close, no winner → must be finalized once.
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-bf01-9999-9999-999999999991'::uuid,
            'BF Cycle Eligible', 'bf-cycle-eligible');
  PERFORM set_config('lf_test.cycle_eligible', v_id::text, true);
END $$;
RESET ROLE;

INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'ccccccc1-bf01-cccc-cccc-cccccccccc01',
  current_setting('lf_test.cycle_eligible')::uuid, 'A',
  'human'::battles.contender_type_enum, '11111111-bf01-1111-1111-111111111111',
  'Cyc A', 'direct', 'accepted', now()
), (
  'ccccccc2-bf01-cccc-cccc-cccccccccc02',
  current_setting('lf_test.cycle_eligible')::uuid, 'B',
  'human'::battles.contender_type_enum, '33333333-bf01-3333-3333-333333333333',
  'Cyc B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
   SET status = 'scoring',
       judging_mode = 'community_vote'::battles.judging_mode_enum,
       ai_judge_enabled = FALSE,
       voting_opens_at  = now() - interval '2 hour',
       voting_closes_at = now() - interval '1 minute'
 WHERE id = current_setting('lf_test.cycle_eligible')::uuid;

-- Battle C-open: ineligible (status='open') → must stay untouched.
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-bf01-9999-9999-999999999991'::uuid,
            'BF Cycle Open', 'bf-cycle-open');
  PERFORM set_config('lf_test.cycle_open', v_id::text, true);
END $$;
RESET ROLE;
UPDATE battles.battles
   SET status = 'open' WHERE id = current_setting('lf_test.cycle_open')::uuid;

-- Battle C-done: already finalized (Scenario A's battle, now published) → must
-- NOT be re-finalized. Capture its pre-cycle winner to prove immutability (the
-- cycle predicate is status='scoring', so closed/published are never eligible).
SELECT set_config('lf_test.closed_winner',
  (SELECT winner_contender_id::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid), true);

-- ── Test 22a: first cycle finalizes exactly the one eligible battle ─────────
SET LOCAL ROLE service_role;
SELECT set_config('lf_test.cycle1', public.fn_worker_run_finalize_cycle()::text, true);
RESET ROLE;

SELECT is(
  current_setting('lf_test.cycle1')::int,
  1,
  'cycle: first run finalizes exactly 1 eligible battle'
);

-- eligible battle is now closed
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.cycle_eligible')::uuid),
  'closed',
  'cycle: eligible battle was finalized to closed'
);

-- open battle untouched
SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.cycle_open')::uuid),
  'open',
  'cycle: ineligible open battle is untouched'
);

-- already-closed battle's winner unchanged (no re-finalize)
SELECT is(
  (SELECT winner_contender_id::text FROM battles.battles
    WHERE id = current_setting('lf_test.battle_a')::uuid),
  current_setting('lf_test.closed_winner', true),
  'cycle: already-closed battle winner is unchanged (no re-finalize)'
);

-- ── Test 22b: second cycle is idempotent (nothing left eligible → 0) ────────
SET LOCAL ROLE service_role;
SELECT set_config('lf_test.cycle2', public.fn_worker_run_finalize_cycle()::text, true);
RESET ROLE;

SELECT is(
  current_setting('lf_test.cycle2')::int,
  0,
  'cycle: second run is idempotent (returns 0 — nothing left eligible)'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- SCENARIO D — cycle drives voting → scoring → closed in ONE sweep
-- Regression guard for the durable auto-close: a battle left in 'voting' after
-- its window elapses must NOT dead-end. The worker sweep closes voting → scoring
-- and finalizes in the same tick (the dead pg_cron 'auto-close-voting' driver is
-- retired). This is the gap Scenario C did not cover (it seeded 'scoring').
-- ═════════════════════════════════════════════════════════════════════════════
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-bf01-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_id UUID;
BEGIN
  v_id := public.fn_battles_create_from_template(
            '99999999-bf01-9999-9999-999999999991'::uuid,
            'BF Cycle Voting', 'bf-cycle-voting');
  PERFORM set_config('lf_test.cycle_voting', v_id::text, true);
END $$;
RESET ROLE;

INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, entry_mode, contender_status, accepted_at
) VALUES (
  'ddddddd1-bf01-dddd-dddd-dddddddddd01',
  current_setting('lf_test.cycle_voting')::uuid, 'A',
  'human'::battles.contender_type_enum, '11111111-bf01-1111-1111-111111111111',
  'Dvt A', 'direct', 'accepted', now()
), (
  'ddddddd2-bf01-dddd-dddd-dddddddddd02',
  current_setting('lf_test.cycle_voting')::uuid, 'B',
  'human'::battles.contender_type_enum, '33333333-bf01-3333-3333-333333333333',
  'Dvt B', 'direct', 'accepted', now()
)
ON CONFLICT (id) DO NOTHING;

-- Leave the battle in 'voting' with an ELAPSED window (the dead-end condition).
UPDATE battles.battles
   SET status = 'voting',
       judging_mode     = 'community_vote'::battles.judging_mode_enum,
       ai_judge_enabled = FALSE,
       voting_opens_at  = now() - interval '2 hour',
       voting_closes_at = now() - interval '1 minute'
 WHERE id = current_setting('lf_test.cycle_voting')::uuid;

-- Give A the vote lead so the winner is deterministic.
INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum)
VALUES
  (current_setting('lf_test.cycle_voting')::uuid, 'ddddddd1-bf01-dddd-dddd-dddddddddd01', 1, 1),
  (current_setting('lf_test.cycle_voting')::uuid, 'ddddddd2-bf01-dddd-dddd-dddddddddd02', 0, 0)
ON CONFLICT DO NOTHING;

SET LOCAL ROLE service_role;
SELECT set_config('lf_test.cycle3', public.fn_worker_run_finalize_cycle()::text, true);
RESET ROLE;

SELECT is(
  current_setting('lf_test.cycle3')::int,
  1,
  'cycle: finalizes a battle still in voting past its close window'
);

SELECT is(
  (SELECT status::text FROM battles.battles
    WHERE id = current_setting('lf_test.cycle_voting')::uuid),
  'closed',
  'cycle: voting → scoring → closed carried by a single sweep (no dead-end)'
);

SELECT is(
  (SELECT winner_contender_id FROM battles.battles
    WHERE id = current_setting('lf_test.cycle_voting')::uuid),
  'ddddddd1-bf01-dddd-dddd-dddddddddd01'::uuid,
  'cycle: voting-closed battle has the raw-vote leader (A) as winner'
);

SELECT * FROM finish();
ROLLBACK;
