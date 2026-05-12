-- =============================================================================
-- Seed 60 — CE: Dev quickstart seed
-- Creates a dev user, lenser profile, and two battles so the UI is non-empty.
-- Only applies when running locally (checks for local Supabase project ref).
-- =============================================================================

DO $$
DECLARE
  v_user_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_lenser_id UUID := '00000000-0000-0000-0000-000000000002';
  v_battle_open_id   UUID := gen_random_uuid();
  v_battle_voting_id UUID := gen_random_uuid();
  v_cont_a_id UUID := gen_random_uuid();
  v_cont_b_id UUID := gen_random_uuid();
  v_cont_c_id UUID := gen_random_uuid();
  v_cont_d_id UUID := gen_random_uuid();
BEGIN
  -- 1. Auth user dev@local.test
  INSERT INTO auth.users (
    id, email, email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, is_super_admin
  ) VALUES (
    v_user_id,
    'dev@local.test',
    now(),
    now(),
    now(),
    '{"display_name":"Dev User"}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Lenser profile
  INSERT INTO lensers.profiles (
    id, auth_user_id, handle, display_name, is_active, created_at
  ) VALUES (
    v_lenser_id,
    v_user_id,
    'dev',
    'Dev User',
    true,
    now()
  ) ON CONFLICT DO NOTHING;

  -- 3. Open battle (entry period)
  INSERT INTO battles.battles (
    id, owner_lenser_id, title, slug, task_prompt, status, created_at
  ) VALUES (
    v_battle_open_id,
    v_lenser_id,
    'Quickstart: Hello World',
    'qs-hello-world',
    'Write a one-sentence pitch for LenserFight.',
    'open',
    now()
  ) ON CONFLICT DO NOTHING;

  -- Echo contenders for open battle
  INSERT INTO battles.contenders (id, battle_id, lenser_id, slot, status, contender_type)
  SELECT v_cont_a_id, v_battle_open_id, v_lenser_id, 'A', 'active', 'human'
  ON CONFLICT DO NOTHING;

  -- 4. Voting-phase battle (already has a vote so feed is non-empty)
  INSERT INTO battles.battles (
    id, owner_lenser_id, title, slug, task_prompt, status, created_at
  ) VALUES (
    v_battle_voting_id,
    v_lenser_id,
    'Quickstart: Poetry Slam',
    'qs-poetry-slam',
    'Write a haiku about artificial intelligence.',
    'voting',
    now() - INTERVAL '2 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO battles.contenders (id, battle_id, lenser_id, slot, status, contender_type, submission_text)
  SELECT v_cont_c_id, v_battle_voting_id, v_lenser_id, 'A', 'submitted', 'human',
         'Silicon dreams hum / Code whispers to the cosmos / Data breathes as one'
  ON CONFLICT DO NOTHING;

  INSERT INTO battles.contenders (id, battle_id, lenser_id, slot, status, contender_type, submission_text)
  SELECT v_cont_d_id, v_battle_voting_id, v_lenser_id, 'B', 'submitted', 'human',
         'Neurons made of math / Learning patterns in the dark / Wisdom without soul'
  ON CONFLICT DO NOTHING;

  -- Pre-cast vote so vote feed is non-empty
  INSERT INTO battles.votes (id, battle_id, voter_id, contender_id, vote_value, created_at)
  VALUES (gen_random_uuid(), v_battle_voting_id, v_user_id, v_cont_c_id, 'contender_a', now())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Dev quickstart seed applied: user=%, lenser=%, open_battle=%, voting_battle=%',
    v_user_id, v_lenser_id, v_battle_open_id, v_battle_voting_id;
END;
$$;
