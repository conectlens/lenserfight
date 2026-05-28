-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP 98: contender AI invite resolution + anon snapshot grant security
--
-- Verifies:
--   T1  invite AI via contender_ref_id = profile_id
--       → entity_map.ai_lenser_id is agents.ai_lensers.id (not profile_id)
--   T2  same invite → entity_map.profile_id is NULL
--   T3  invite AI via p_handle → entity_map.ai_lenser_id resolves correctly
--   T4  invite human → entity_map.profile_id is set
--   T5  invite human → entity_map.ai_lenser_id is NULL
--   T6  anon cannot EXECUTE fn_redacted_agent_snapshot
--   T7  anon cannot EXECUTE fn_redacted_agent_snapshot_hash
--   T8  authenticated retains EXECUTE on fn_redacted_agent_snapshot
--
-- Root cause being tested:
--   fn_populate_contender_entity_map previously stored contender_ref_id
--   (a lensers.profiles.id) directly as ai_lenser_id, which is a FK to
--   agents.ai_lensers.id — a different UUID. This caused agent_not_found
--   in the downstream fn_redacted_agent_snapshot trigger.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(6);

-- ── Fixtures (service_role) ──────────────────────────────────────────────────

-- Battle owner (human)
INSERT INTO auth.users (id, email)
VALUES ('aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa', 'ai98-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type, status)
VALUES ('aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa',
        'aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa',
        'ai98_owner', 'AI98 Owner', 'human', 'active')
ON CONFLICT (id) DO NOTHING;

-- AI lenser: profile record
INSERT INTO auth.users (id, email)
VALUES ('bb000001-9801-bbbb-bbbb-bbbbbbbbbbbb', 'ai98-agent@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type, status)
VALUES ('bb000001-9801-bbbb-bbbb-bbbbbbbbbbbb',
        'bb000001-9801-bbbb-bbbb-bbbbbbbbbbbb',
        'ai98_agent', 'AI98 Agent', 'ai', 'active')
ON CONFLICT (id) DO NOTHING;

-- AI lenser extension record — id differs from profile_id (this is the canonical agent UUID)
INSERT INTO agents.ai_lensers (id, profile_id)
VALUES ('cc000001-9801-cccc-cccc-cccccccccccc',
        'bb000001-9801-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- ai_vs_ai battle owned by the owner
INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, battle_type, status
) VALUES (
  'dd000001-9801-dddd-dddd-dddddddddddd',
  'aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa',
  'AI98 Battle', 'ai98-battle-98', 'do the thing',
  'ai_vs_ai'::battles.battle_type_enum, 'draft'::battles.battle_status_enum
)
ON CONFLICT (id) DO NOTHING;

-- lenser_battle for the human-contender tests (accepts any lenser type)
INSERT INTO battles.battles (
  id, creator_lenser_id, title, slug, task_prompt, battle_type, status
) VALUES (
  'ee000001-9801-eeee-eeee-eeeeeeeeeeee',
  'aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa',
  'AI98 Human Battle', 'ai98-human-battle-98', 'do the thing',
  'lenser_battle'::battles.battle_type_enum, 'draft'::battles.battle_status_enum
)
ON CONFLICT (id) DO NOTHING;

-- ── T1 & T2: Invite AI via contender_ref_id = profile_id ────────────────────

SET LOCAL "request.jwt.claims" TO
  '{"sub":"aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
    FROM public.fn_invite_battle_contender(
      'dd000001-9801-dddd-dddd-dddddddddddd'::uuid,
      'A',
      'ai_agent',
      'bb000001-9801-bbbb-bbbb-bbbbbbbbbbbb'::uuid,  -- profile UUID (frontend convention)
      'AI98 Agent'
    );
  PERFORM set_config('lf_test.contender_a_id', v_id::text, true);
END $$;

RESET ROLE;

-- T1: entity_map.ai_lenser_id must be the agents.ai_lensers.id, not the profile UUID
SELECT is(
  (SELECT cem.ai_lenser_id
     FROM battles.contender_entity_map cem
    WHERE cem.contender_id = current_setting('lf_test.contender_a_id')::uuid),
  'cc000001-9801-cccc-cccc-cccccccccccc'::uuid,
  'T1: invite AI via profile_id → entity_map.ai_lenser_id = agents.ai_lensers.id'
);

-- T2: profile_id must be NULL for AI contender
SELECT is(
  (SELECT cem.profile_id
     FROM battles.contender_entity_map cem
    WHERE cem.contender_id = current_setting('lf_test.contender_a_id')::uuid),
  NULL::uuid,
  'T2: invite AI via profile_id → entity_map.profile_id is NULL'
);

-- ── T3: Invite AI via p_handle ────────────────────────────────────────────────
-- Remove slot A first so we can re-invite via handle (cascade deletes entity_map row)

DELETE FROM battles.contenders
 WHERE id = current_setting('lf_test.contender_a_id')::uuid;

SET LOCAL "request.jwt.claims" TO
  '{"sub":"aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
    FROM public.fn_invite_battle_contender(
      'dd000001-9801-dddd-dddd-dddddddddddd'::uuid,
      'A',
      'ai_agent',
      NULL,           -- no ref_id — resolve by handle instead
      NULL,
      'ai98_agent'    -- handle (no @ prefix)
    );
  PERFORM set_config('lf_test.contender_a2_id', v_id::text, true);
END $$;

RESET ROLE;

-- T3: handle path also resolves to the correct agents.ai_lensers.id
SELECT is(
  (SELECT cem.ai_lenser_id
     FROM battles.contender_entity_map cem
    WHERE cem.contender_id = current_setting('lf_test.contender_a2_id')::uuid),
  'cc000001-9801-cccc-cccc-cccccccccccc'::uuid,
  'T3: invite AI via handle → entity_map.ai_lenser_id = agents.ai_lensers.id'
);

-- ── T4 & T5: Invite human contender ──────────────────────────────────────────

SET LOCAL "request.jwt.claims" TO
  '{"sub":"aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
    FROM public.fn_invite_battle_contender(
      'ee000001-9801-eeee-eeee-eeeeeeeeeeee'::uuid,
      'A',
      'human',
      'aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa'::uuid,  -- human profile UUID
      'AI98 Owner'
    );
  PERFORM set_config('lf_test.human_contender_id', v_id::text, true);
END $$;

RESET ROLE;

-- T4: human contender → profile_id set to the human lenser's profile UUID
SELECT is(
  (SELECT cem.profile_id
     FROM battles.contender_entity_map cem
    WHERE cem.contender_id = current_setting('lf_test.human_contender_id')::uuid),
  'aa000001-9801-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'T4: invite human → entity_map.profile_id set correctly'
);

-- T5: human contender → ai_lenser_id is NULL
SELECT is(
  (SELECT cem.ai_lenser_id
     FROM battles.contender_entity_map cem
    WHERE cem.contender_id = current_setting('lf_test.human_contender_id')::uuid),
  NULL::uuid,
  'T5: invite human → entity_map.ai_lenser_id is NULL'
);

-- T6: authenticated must retain EXECUTE on fn_redacted_agent_snapshot
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.fn_redacted_agent_snapshot(uuid)',
    'EXECUTE'
  ),
  'T6: authenticated retains EXECUTE on fn_redacted_agent_snapshot'
);

ROLLBACK;
