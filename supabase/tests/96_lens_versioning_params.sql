-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 96_lens_versioning_params.sql — Lens versioning & parameter validation
--
-- Coverage:
--   1-4.  lenses.fn_create_draft_version: creates a version row with correct fields
--   5-6.  lenses.fn_get_version_params_with_tools: returns parameter JSONB correctly
--   7-8.  public.fn_get_lens_version_parameters: public REST wrapper returns params
--   9.    lenses.fn_validate_inputs: accepts a run with all required params present
--   10.   lenses.fn_validate_inputs: rejects a run missing a required param
--   11-12. fn_get_lens_version_snapshot / fn_validate_lens_params: skip — not found
--
-- NOTE: fn_get_lens_version_snapshot and fn_validate_lens_params do not exist in
-- any migration (confirmed: grep returns no results). Tests 11-12 skip with an
-- explanatory message.
--
-- Convention mirrors 99_battle_finalize_e2e.sql:
--   BEGIN; plan(); fixtures ON CONFLICT DO NOTHING; assertions; finish(); ROLLBACK;
-- ─────────────────────────────────────────────────────────────────────────────

SET client_min_messages TO WARNING;

BEGIN;

SELECT plan(12);

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email)
VALUES ('96960001-9696-9696-9696-969600000001', 'lv-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('96960001-9696-9696-9696-969600000001',
        '96960001-9696-9696-9696-969600000001',
        'lv_owner', 'LV Owner', 'human')
ON CONFLICT (id) DO NOTHING;

-- Create a lens directly (bypassing SECURITY DEFINER fn_create_lens so we can
-- run as superuser without a JWT).
INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
VALUES ('96960002-9696-9696-9696-969600000002',
        '96960001-9696-9696-9696-969600000001',
        'public',
        'published')
ON CONFLICT (id) DO NOTHING;

-- Seed a canonical 'text' tool for parameter binding (may already exist from
-- seed 15_lens_tools.sql; ON CONFLICT (key) is the guard).
INSERT INTO lenses.tools (key, label, description, category, type,
                           required, min_length, max_length, sort_order, is_system)
VALUES ('text', 'Short Text',
        'A single-line text input for short values like names, titles, or keywords.',
        'input', 'text',
        true, 1, 500, 0, true)
ON CONFLICT (key) DO NOTHING;

-- ── Test 1: create a draft version with a valid template body ───────────────
-- lenses.fn_create_draft_version requires ownership via lensers.get_auth_lenser_id.
-- We set the JWT locally so SECURITY DEFINER resolves the correct lenser.
SET LOCAL "request.jwt.claims" TO
  '{"sub":"96960001-9696-9696-9696-969600000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ver lenses.versions;
BEGIN
  v_ver := lenses.fn_create_draft_version(
    '96960002-9696-9696-9696-969600000002'::uuid,
    'This is a minimal lens template body that is longer than fifty chars.'
  );
  PERFORM set_config('lf_test.version_id', v_ver.id::text, true);
END $$;

RESET ROLE;

SELECT isnt(
  current_setting('lf_test.version_id', true),
  NULL,
  'fn_create_draft_version returns a non-null version id'
);

-- ── Test 2: version row status is draft ─────────────────────────────────────
SELECT is(
  (SELECT status::text FROM lenses.versions
    WHERE id = current_setting('lf_test.version_id')::uuid),
  'draft',
  'new version status is draft'
);

-- ── Test 3: version row is linked to the correct lens ───────────────────────
SELECT is(
  (SELECT lens_id FROM lenses.versions
    WHERE id = current_setting('lf_test.version_id')::uuid),
  '96960002-9696-9696-9696-969600000002'::uuid,
  'version.lens_id matches the fixture lens'
);

-- ── Test 4: version_number is at least 1 ────────────────────────────────────
SELECT ok(
  (SELECT version_number FROM lenses.versions
    WHERE id = current_setting('lf_test.version_id')::uuid) >= 1,
  'version_number is >= 1 (append-only counter)'
);

-- ── Test 5: attach a parameter to the version ───────────────────────────────
-- Seed a version_parameter row so fn_get_version_params_with_tools has something
-- to return.  Insert directly — version_parameters has no SECURITY DEFINER guard.
INSERT INTO lenses.version_parameters (version_id, label, tool_id)
SELECT current_setting('lf_test.version_id')::uuid,
       'topic',
       t.id
FROM   lenses.tools t
WHERE  t.key = 'text'
LIMIT  1
ON CONFLICT DO NOTHING;

SELECT ok(
  jsonb_array_length(
    lenses.fn_get_version_params_with_tools(
      current_setting('lf_test.version_id')::uuid
    )
  ) >= 1,
  'fn_get_version_params_with_tools returns at least one parameter'
);

-- ── Test 6: returned parameter has the correct label ────────────────────────
SELECT is(
  (lenses.fn_get_version_params_with_tools(
     current_setting('lf_test.version_id')::uuid
   ) -> 0 ->> 'label'),
  'topic',
  'fn_get_version_params_with_tools parameter label = topic'
);

-- ── Test 7: public REST wrapper returns the same parameter array ─────────────
SELECT ok(
  jsonb_array_length(
    public.fn_get_lens_version_parameters(
      current_setting('lf_test.version_id')::uuid
    )
  ) >= 1,
  'public.fn_get_lens_version_parameters returns at least one parameter'
);

-- ── Test 8: public wrapper preserves label ───────────────────────────────────
SELECT is(
  (public.fn_get_lens_version_parameters(
     current_setting('lf_test.version_id')::uuid
   ) -> 0 ->> 'label'),
  'topic',
  'public.fn_get_lens_version_parameters label = topic'
);

-- ── Test 9: fn_validate_inputs accepts inputs with all required params ───────
-- fn_validate_inputs returns void. We verify it does NOT raise by asserting no
-- exception is thrown: wrap in throws_ok with an impossible error code to prove
-- the call succeeds, OR use a live_ok() pattern. The simplest portable approach
-- is: attempt the call inside a SELECT that wraps the void result as NULL, then
-- confirm that result IS NULL (i.e. call returned without error).
SELECT is(
  (SELECT lenses.fn_validate_inputs(
     current_setting('lf_test.version_id')::uuid,
     '{"topic": "AI systems"}'::jsonb
   )),
  NULL,
  'fn_validate_inputs returns void (NULL) when all required params are present'
);

-- ── Test 10: fn_validate_inputs rejects inputs missing a required param ──────
SELECT throws_ok(
  $$ SELECT lenses.fn_validate_inputs(
       current_setting('lf_test.version_id', true)::uuid,
       '{}'::jsonb
     ) $$,
  '23514',
  NULL,
  'fn_validate_inputs raises check_violation when required param is missing'
);

-- ── Tests 11-12: fn_get_lens_version_snapshot / fn_validate_lens_params ──────
-- These functions were NOT found in any migration or schema file (grep returned
-- no results). The functionality they would cover is served by:
--   • lenses.fn_get_version_params_with_tools   (tested above, tests 5-6)
--   • lenses.fn_validate_inputs                 (tested above, tests 9-10)
-- Gap note: if fn_get_lens_version_snapshot or fn_validate_lens_params are added
-- in a future migration, remove these skip() calls and add real assertions.
SELECT skip(
  'fn_get_lens_version_snapshot does not exist in any migration — coverage gap',
  1
);

SELECT skip(
  'fn_validate_lens_params does not exist in any migration — fn_validate_inputs covers this role',
  1
);

SELECT * FROM finish();

ROLLBACK;
