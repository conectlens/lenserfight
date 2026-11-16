-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP 106: fn_battles_get_public exposes battle_type
--
-- Verifies (GitHub issue #495, acceptance criterion #3):
--   T1  battle_type is present in the jsonb result
--   T2  battle_type matches the underlying battles.battles row
--   T3  the field survives across a non-default battle_type value too
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(3);

-- Fixtures --------------------------------------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('11111111-b106-1111-1111-111111111111', 'b106-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('11111111-b106-1111-1111-111111111111',
        '11111111-b106-1111-1111-111111111111', 'b106_owner', 'B106 Owner', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, status,
  battle_type, max_contenders, created_at
) VALUES
  ('bbbb1106-b701-aaaa-aaaa-000000000001',
   '11111111-b106-1111-1111-111111111111',
   'B106 open votes battle', 'b106-open-votes',
   'do', 'open',
   'human_vs_human_open_votes', 2, now()),
  ('bbbb1106-b701-aaaa-aaaa-000000000002',
   '11111111-b106-1111-1111-111111111111',
   'B106 ai vs ai battle', 'b106-ai-vs-ai',
   'do', 'open',
   'ai_vs_ai', 2, now())
ON CONFLICT (id) DO NOTHING;

-- Test 1: battle_type key is present --------------------------------------------
SELECT ok(
  public.fn_battles_get_public('bbbb1106-b701-aaaa-aaaa-000000000001') ? 'battle_type',
  'fn_battles_get_public result contains a battle_type key'
);

-- Test 2: value matches the row's declared type (default enum value) -----------
SELECT is(
  (public.fn_battles_get_public('bbbb1106-b701-aaaa-aaaa-000000000001')->>'battle_type'),
  'human_vs_human_open_votes',
  'battle_type reflects human_vs_human_open_votes'
);

-- Test 3: value matches a non-default battle_type too ---------------------------
SELECT is(
  (public.fn_battles_get_public('bbbb1106-b701-aaaa-aaaa-000000000002')->>'battle_type'),
  'ai_vs_ai',
  'battle_type reflects ai_vs_ai'
);

SELECT * FROM finish();
ROLLBACK;
