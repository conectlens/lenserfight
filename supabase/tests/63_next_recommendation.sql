-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 63_next_recommendation.sql — Phase BX
--
-- After a battle closes, fn_battles_next_recommendation emits a contextual
-- next-action CTA. The three branches:
--
--   1. Caller was a contender → action='rematch', battle_id present
--   2. Caller voted only       → action='browse', category present
--   3. Anonymous caller        → action='create', template_id present
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-b701-1111-1111-111111111111', 'bx-creator@test.local'),
  ('22222222-b701-2222-2222-222222222222', 'bx-cont-b@test.local'),
  ('33333333-b701-3333-3333-333333333333', 'bx-voter@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
  ('11111111-b701-1111-1111-111111111111',
   '11111111-b701-1111-1111-111111111111', 'bx_creator', 'BX Creator', 'human'),
  ('22222222-b701-2222-2222-222222222222',
   '22222222-b701-2222-2222-222222222222', 'bx_cont_b', 'BX Contender B', 'human'),
  ('33333333-b701-3333-3333-333333333333',
   '33333333-b701-3333-3333-333333333333', 'bx_voter', 'BX Voter', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public, category)
VALUES ('aaaa01aa-b701-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-b701-1111-1111-111111111111',
        'BX Template', 'prompt', true, 'reasoning')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status,
  max_contenders, template_id, finalized_at
) VALUES (
  'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-b701-1111-1111-111111111111',
  'BX Battle', 'bx-battle', 'task', 'closed',
  2, 'aaaa01aa-b701-aaaa-aaaa-aaaaaaaaaaaa', now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (
  id, battle_id, slot, contender_type, contender_ref_id,
  display_name, contender_status
) VALUES
  ('cccc01cc-b701-cccc-cccc-aaaaaaaaaaaa',
   'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb', 'A',
   'human'::battles.contender_type_enum,
   '11111111-b701-1111-1111-111111111111', 'A', 'accepted'),
  ('cccc01cc-b701-cccc-cccc-bbbbbbbbbbbb',
   'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb', 'B',
   'human'::battles.contender_type_enum,
   '22222222-b701-2222-2222-222222222222', 'B', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- Seed a vote so 'voter' branch can resolve.
INSERT INTO battles.votes (battle_id, voter_lenser_id, vote_value)
SELECT
  'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '33333333-b701-3333-3333-333333333333'::uuid,
  'contender_a'::battles.vote_value_enum
WHERE NOT EXISTS (
  SELECT 1
    FROM battles.votes
   WHERE battle_id = 'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb'::uuid
     AND voter_lenser_id = '33333333-b701-3333-3333-333333333333'::uuid
);

-- ── Test 1: contender gets 'rematch' ────────────────────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub":"22222222-b701-2222-2222-222222222222","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  public.fn_battles_next_recommendation(
    'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  )->>'action',
  'rematch',
  'contender caller gets action=rematch'
);

-- ── Test 2: voter gets 'browse' ─────────────────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"33333333-b701-3333-3333-333333333333","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT is(
  public.fn_battles_next_recommendation(
    'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  )->>'action',
  'browse',
  'voter caller gets action=browse'
);

-- ── Test 3: anonymous caller gets 'create' ─────────────────────────────────
RESET ROLE;
SET LOCAL "request.jwt.claims" TO '{"role":"anon"}';
SET LOCAL ROLE anon;

SELECT is(
  public.fn_battles_next_recommendation(
    'bbbb01bb-b701-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  )->>'action',
  'create',
  'anonymous caller gets action=create'
);

SELECT * FROM finish();
ROLLBACK;
