-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 55_template_prompt_variables.sql — Phase BN
--
--   1. owner can INSERT a variable
--   2. fn_battles_render_prompt substitutes a slot
--   3. missing required variable raises 22023
--   4. unknown key in p_variables is silently ignored
--   5. key format CHECK rejects bad names
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(5);

INSERT INTO auth.users (id, email)
VALUES ('11111111-b601-1111-1111-111111111111', 'bn-owner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES ('11111111-b601-1111-1111-111111111111',
        '11111111-b601-1111-1111-111111111111', 'bn_owner', 'BN Owner', 'human')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.templates (id, creator_lenser_id, title, task_prompt, is_public)
VALUES (
  'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-b601-1111-1111-111111111111',
  'BN Template',
  'Write a {{tone}} story about {{topic}}.',
  true
) ON CONFLICT (id) DO NOTHING;

-- Test 1: owner INSERT --------------------------------------------------------
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-b601-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

INSERT INTO battles.template_prompt_variables (
  template_id, variable_key, label, default_value, required, ordinal
) VALUES
  ('aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa', 'topic', 'Topic',  NULL,    true,  1),
  ('aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa', 'tone',  'Tone',   'witty', false, 2);

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM battles.template_prompt_variables
    WHERE template_id = 'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'owner inserted two template_prompt_variables rows'
);

-- Test 2: render substitutes --------------------------------------------------
SELECT is(
  public.fn_battles_render_prompt(
    'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    jsonb_build_object('topic', 'LLM tooling', 'tone', 'serious')
  ),
  'Write a serious story about LLM tooling.',
  'render_prompt substitutes all variables when supplied'
);

-- Test 3: missing required raises --------------------------------------------
SELECT throws_ok(
  $$ SELECT public.fn_battles_render_prompt(
       'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       '{}'::jsonb) $$,
  '22023',
  NULL,
  'missing required variable raises 22023'
);

-- Test 4: unknown key silently ignored ---------------------------------------
SELECT is(
  public.fn_battles_render_prompt(
    'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    jsonb_build_object('topic', 'cats', 'this_does_not_exist', 'nope')
  ),
  'Write a witty story about cats.',
  'unknown variable keys in p_variables are silently ignored, default_value applies for tone'
);

-- Test 5: bad key format rejected --------------------------------------------
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-b601-1111-1111-111111111111","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT throws_like(
  $$ INSERT INTO battles.template_prompt_variables
       (template_id, variable_key, label)
     VALUES (
       'aaaa1111-b601-aaaa-aaaa-aaaaaaaaaaaa', 'BadKey', 'oops'
     ) $$,
  '%template_prompt_variables_key_format%',
  'CHECK constraint rejects keys that violate ^[a-z][a-z0-9_]{0,29}$'
);

SELECT * FROM finish();
ROLLBACK;
