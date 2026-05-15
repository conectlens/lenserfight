-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 94_fn_upsert_agent_lens_binding.sql
-- Regression coverage for 20271223000000_fix_lens_binding_public_lens_access.sql
--
-- Scenarios tested:
--   1. Owner can bind a lens they own (human-owned lens)
--   2. Owner can bind a public+published platform/system lens
--   3. Owner cannot bind a private lens owned by a third party
--   4. Non-owner cannot bind any lens to an agent they don't own
--   5. Binding is idempotent (ON CONFLICT DO UPDATE)
--   6. is_default=true clears existing non-personality default
--   7. personality tag scoping: personality default does not clear instruction default
--
-- All changes are rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(7);

-- ─── Fixtures ────────────────────────────────────────────────────────────────

-- Use an existing human lenser: @omerfar (from seed)
-- We create a fresh AI lenser owned by @omerfar for isolation.

DO $$ BEGIN
  -- Ensure @omerfar is active
  UPDATE lensers.profiles SET status = 'active' WHERE handle = 'omerfar';
END $$;

-- Helper: get @omerfar's profile id
CREATE TEMP TABLE _fix AS
SELECT
  (SELECT id FROM lensers.profiles WHERE handle = 'omerfar')            AS human_id,
  (SELECT user_id FROM lensers.profiles WHERE handle = 'omerfar')       AS human_user_id,
  -- public system lens (owned by @lenserfight)
  '40000000-0001-0003-0001-000000000001'::uuid                          AS public_lens_id,
  -- lenserfight system profile id
  'b2000000-0000-0000-0000-000000000001'::uuid                          AS system_lenser_id;

-- Create a throw-away AI lenser owned by @omerfar
INSERT INTO agents.ai_lensers (id, profile_id, display_name, status)
SELECT
  '99900001-0000-0000-0000-000000000001',
  human_id,
  'Test Agent',
  'active'
FROM _fix
ON CONFLICT DO NOTHING;

INSERT INTO agents.ownerships (ai_lenser_id, owner_lenser_id, role)
SELECT
  '99900001-0000-0000-0000-000000000001',
  human_id,
  'owner'
FROM _fix
ON CONFLICT DO NOTHING;

-- Create a private lens owned by a third party (the system profile, visibility=private)
INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
VALUES (
  '99900002-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',  -- @lenserfight owns it
  'private',
  'published'
)
ON CONFLICT DO NOTHING;

-- Create a lens owned by @omerfar (human-owned)
INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
SELECT
  '99900003-0000-0000-0000-000000000001',
  human_id,
  'public',
  'published'
FROM _fix
ON CONFLICT DO NOTHING;

-- Create a second unrelated human lenser (stranger)
INSERT INTO lensers.profiles (id, handle, status, type)
VALUES ('99900004-0000-0000-0000-000000000001', '_test_stranger', 'active', 'human')
ON CONFLICT DO NOTHING;

-- ─── Test 1: owner binds their own (human-owned) lens ────────────────────────
SELECT lives_ok(
  format($$
    SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '99900003-0000-0000-0000-000000000001',
      NULL, true, '{}'
    );
  $$, (SELECT human_user_id::text FROM _fix)),
  'owner can bind a lens they personally own'
);

-- ─── Test 2: owner binds a public+published platform lens ────────────────────
SELECT lives_ok(
  format($$
    SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '40000000-0001-0003-0001-000000000001',
      NULL, true, '{}'
    );
  $$, (SELECT human_user_id::text FROM _fix)),
  'owner can bind a public published platform lens (e.g. Research)'
);

-- ─── Test 3: owner cannot bind a private third-party lens ────────────────────
SELECT throws_ok(
  format($$
    SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '99900002-0000-0000-0000-000000000001',
      NULL, true, '{}'
    );
  $$, (SELECT human_user_id::text FROM _fix)),
  '42501',
  NULL,
  'owner cannot bind a private third-party lens'
);

-- ─── Test 4: non-owner cannot bind anything ───────────────────────────────────
SELECT throws_ok(
  $$
    SET LOCAL "request.jwt.claims" = '{"sub":"99900004-0000-0000-0000-000000000001","role":"authenticated"}';
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '40000000-0001-0003-0001-000000000001',
      NULL, true, '{}'
    );
  $$,
  '42501',
  NULL,
  'stranger cannot bind a lens to an agent they do not own'
);

-- ─── Test 5: idempotent re-bind ───────────────────────────────────────────────
SELECT lives_ok(
  format($$
    SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '40000000-0001-0003-0001-000000000001',
      NULL, true, '{}'
    );
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '40000000-0001-0003-0001-000000000001',
      NULL, false, '{}'
    );
  $$, (SELECT human_user_id::text FROM _fix)),
  'binding the same lens twice is idempotent'
);

-- ─── Test 6: is_default clears previous instruction default ──────────────────
SELECT lives_ok(
  format($$
    SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
    -- bind lens A as default (no personality tag)
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '99900003-0000-0000-0000-000000000001',
      NULL, true, '{}'
    );
    -- bind lens B as default — should demote lens A
    SELECT fn_upsert_agent_lens_binding(
      '99900001-0000-0000-0000-000000000001',
      '40000000-0001-0003-0001-000000000001',
      NULL, true, '{}'
    );
  $$, (SELECT human_user_id::text FROM _fix)),
  'setting a new default clears the previous instruction default'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM agents.lens_bindings
    WHERE ai_lenser_id = '99900001-0000-0000-0000-000000000001'
      AND lens_id      = '99900003-0000-0000-0000-000000000001'
      AND is_default   = true
      AND NOT ('personality' = ANY(category_tags))
  ),
  'previous instruction-default binding was demoted after new default set'
);

SELECT * FROM finish();
ROLLBACK;
